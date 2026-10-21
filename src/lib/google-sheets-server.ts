import { google } from "googleapis";

type SheetRow = Record<string, string> & { __rowNumber?: string };

const spreadsheetIdEnv = "GOOGLE_SPREADSHEET_ID";
const serviceAccountEmailEnv = "GOOGLE_SERVICE_ACCOUNT_EMAIL";
const serviceAccountKeyEnv = "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY";
const sourceSheets = ["Meeting Database", "Students"] as const;

function configurationError() {
  return new Error(
    `Google Sheets API is not configured. Set ${spreadsheetIdEnv}, ${serviceAccountEmailEnv}, and ${serviceAccountKeyEnv} on the server.`,
  );
}

function sheetsClient() {
  const spreadsheetId = process.env[spreadsheetIdEnv];
  const email = process.env[serviceAccountEmailEnv];
  const privateKey = process.env[serviceAccountKeyEnv]?.replace(/\\n/g, "\n");

  if (!spreadsheetId || !email || !privateKey) throw configurationError();

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return { client: google.sheets({ version: "v4", auth }), spreadsheetId };
}

function sheetRange(sheetName: string) {
  return `'${sheetName.replaceAll("'", "''")}'!A:ZZ`;
}

function records(values: string[][] | null | undefined): SheetRow[] {
  if (!values?.length) return [];
  const headers = values[0].map((header) => String(header || "").trim());
  if (!headers.some(Boolean)) return [];

  return values.slice(1).flatMap((row, index) => {
    const record = Object.fromEntries(headers.map((header, column) => [header, row[column] || ""])) as SheetRow;
    if (!Object.values(record).some((value) => String(value).trim())) return [];
    record.__rowNumber = String(index + 2);
    return [record];
  });
}

function value(row: SheetRow, ...keys: string[]) {
  for (const key of keys) {
    const exact = String(row[key] ?? "").trim();
    if (exact) return exact;
    const match = Object.entries(row).find(([header]) => header.trim().toLowerCase() === key.trim().toLowerCase());
    if (match && String(match[1]).trim()) return String(match[1]).trim();
  }
  return "";
}

function hasContent(row: SheetRow) {
  return [
    "Student name",
    "Workstream",
    "What did you complete this week?",
    "What are you currently working on?",
    "What are your next steps?",
    "What is still pending or needs follow-up?",
    "What question do you have for Dr. Lina?",
    "What support do you need?",
    "Who did you collaborate with?",
    "Add any relevant links or file names",
    "Task",
    "Meeting notes",
  ].some((key) => value(row, key));
}

function keepRow(row: SheetRow) {
  return Boolean(value(row, "Source record ID", "Source Record Id", "Record ID", "ID")) || hasContent(row);
}

function mergeUpdateRows(...groups: SheetRow[][]) {
  const output: SheetRow[] = [];
  const seen = new Set<string>();

  groups.flat().forEach((row) => {
    if (!keepRow(row)) return;
    const sourceId = value(row, "Source record ID", "Source Record Id", "Record ID", "ID").toLowerCase();
    if (sourceId && seen.has(sourceId)) return;
    if (sourceId) seen.add(sourceId);
    output.push(row);
  });

  return output;
}

export async function readGoogleSheetState() {
  const { client, spreadsheetId } = sheetsClient();
  const response = await client.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: [...sourceSheets].map(sheetRange),
    valueRenderOption: "FORMATTED_VALUE",
  });
  const ranges = response.data.valueRanges || [];
  const rowsBySheet = sourceSheets.map((name, index) => ({
    name,
    rows: records(ranges[index]?.values as string[][] | undefined),
  }));
  const sheet = (name: typeof sourceSheets[number]) => rowsBySheet.find((item) => item.name === name)?.rows || [];

  return {
    updates: mergeUpdateRows(sheet("Meeting Database")),
    students: sheet("Students"),
  };
}

function importValue(row: Record<string, unknown>, header: string) {
  const normalized = header.trim().toLowerCase();
  const aliases: Record<string, string> = {
    timestamp: "__timestamp",
    "submitted at": "__timestamp",
    "student name": "Student name",
    program: "Team / program",
    "team / program": "Team / program",
    role: "Role",
    "meeting title": "Meeting title",
    "meeting date": "Week / meeting date",
    "week / meeting date": "Week / meeting date",
    workstream: "Workstream",
    "completed this week": "What did I complete this week?",
    "what did you complete this week?": "What did I complete this week?",
    "currently working on": "What are you currently working on?",
    "what are you currently working on?": "What are you currently working on?",
    "next steps": "What are your next steps?",
    "pending / follow-up": "What are your next steps?",
    "what is still pending or needs follow-up?": "What are your next steps?",
    "what are your next steps?": "What are your next steps?",
    "question for dr. lina": "What question do you have for Dr. Lina?",
    "what question do you have for dr. lina?": "What question do you have for Dr. Lina?",
    "support needed": "What support do you need?",
    "what support do you need?": "What support do you need?",
    collaborators: "Who did you collaborate with?",
    "who did you collaborate with?": "Who did you collaborate with?",
    "relevant links / files": "Add any relevant links or file names",
    "add any relevant links or file names": "Add any relevant links or file names",
    status: "Current status",
    "current status": "Current status",
    project: "Project",
    task: "Task",
    "task status": "Task status",
    event: "Event",
    "deadline / meeting": "Event",
    notes: "Meeting notes",
    "meeting notes": "Meeting notes",
    "source record id": "Source record ID",
    "source document": "Source document",
    source: "Source document",
    "source section": "Source section",
    "dr. begdache feedback": "Dr. Begdache feedback",
    "attribution note": "Attribution Note",
  };
  const key = aliases[normalized] || header;
  if (key === "__timestamp") {
    return row["Week / meeting date"] ? `${String(row["Week / meeting date"])}T12:00:00.000Z` : new Date().toISOString();
  }
  return row[key] === undefined || row[key] === null ? "" : String(row[key]);
}

export async function appendMeetingRows(rows: Array<Record<string, unknown>>) {
  const { client, spreadsheetId } = sheetsClient();
  const response = await client.spreadsheets.values.get({
    spreadsheetId,
    range: sheetRange("Meeting Database"),
    valueRenderOption: "FORMATTED_VALUE",
  });
  const values = (response.data.values || []) as string[][];
  const headers = values[0]?.map((header) => String(header || "").trim()) || [];
  if (!headers.length) throw new Error("Meeting Database headers were not found.");

  const sourceColumn = headers.findIndex((header) => header.toLowerCase() === "source record id");
  if (sourceColumn < 0) throw new Error("Meeting Database must contain a Source record ID column.");

  const existingIds = new Set(values.slice(1).map((row) => String(row[sourceColumn] || "").trim()).filter(Boolean));
  const incomingIds = new Set<string>();
  const newRows = rows.filter((row) => {
    const sourceId = String(row["Source record ID"] || "").trim();
    if (!sourceId || existingIds.has(sourceId) || incomingIds.has(sourceId)) return false;
    incomingIds.add(sourceId);
    return true;
  });

  if (!newRows.length) return { count: 0, skipped: rows.length };

  await client.spreadsheets.values.append({
    spreadsheetId,
    range: sheetRange("Meeting Database"),
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: newRows.map((row) => headers.map((header) => importValue(row, header))) },
  });

  return { count: newRows.length, skipped: rows.length - newRows.length };
}
