const SPREADSHEET_ID = "1NZM8v_hWtAh54GDy2A1r4kGog3LJyYynwEJvGdMt3E0";
const CANONICAL_STUDENTS = {
  Georgi: "SMART-MINDS",
  Sarah: "BMINDS",
  Marissa: "BMINDS",
  Emma: "B-SMART",
  Gianna: "B-SMART",
  Zach: "SMART-MINDS",
  Carolyn: "SMART-MINDS",
  Ysabel: "B-SMART",
  Megan: "B-SMART",
  Serena: "B-SMART",
  Christos: "SMART-MINDS",
  Christian: "B-SMART",
  Alyssa: "B-SMART",
  Katarina: "SMART-MINDS",
  Isabella: "SMART-MINDS",
  Max: "BMINDS",
  Amalia: "BMINDS",
  Joaquim: "BMINDS",
  Izzy: "B-SMART",
  Cerin: "SMART-MINDS"
};

function doGet() {
  const finalRows = readSheet("Final Overall");
  const meetingRows = readSheet("Meeting Database");
  const formRows = readSheet("Form Responses 1");
  const sourceRows = finalRows.length ? finalRows : meetingRows;
  const updates = sourceRows.length
    ? sourceRows.filter(keepRow)
    : formRows.filter(hasFormContent);
  const students = readSheet("Students").length
    ? readSheet("Students")
    : buildStudents(updates);

  return ContentService
    .createTextOutput(JSON.stringify({ updates, rows: updates, students }))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const body = JSON.parse(e && e.postData && e.postData.contents ? e.postData.contents : "{}");
    if (body.action !== "appendMeetingRows") return jsonResponse({ ok: false, error: "Unsupported bridge action." });

    const expectedToken = PropertiesService.getScriptProperties().getProperty("IMPORT_WRITE_TOKEN");
    if (!expectedToken) return jsonResponse({ ok: false, error: "IMPORT_WRITE_TOKEN is not configured in Apps Script." });
    if (body.token !== expectedToken) return jsonResponse({ ok: false, error: "Invalid import token." });
    if (!Array.isArray(body.rows) || !body.rows.length) return jsonResponse({ ok: false, error: "No meeting rows were supplied." });

    const sheet = spreadsheet().getSheetByName("Meeting Database");
    if (!sheet || sheet.getLastColumn() < 1) return jsonResponse({ ok: false, error: "Meeting Database sheet or headers were not found." });

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const values = body.rows.map(function(row) {
        return headers.map(function(header) { return importValue(row, header); });
      });
      sheet.getRange(sheet.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
      return jsonResponse({ ok: true, count: values.length });
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function importValue(row, header) {
  const normalized = String(header || "").trim().toLowerCase();
  const aliases = {
    "timestamp": "__timestamp",
    "submitted at": "__timestamp",
    "student name": "Student name",
    "team / program": "Team / program",
    "program": "Team / program",
    "role": "Role",
    "meeting title": "Meeting title",
    "week / meeting date": "Week / meeting date",
    "meeting date": "Week / meeting date",
    "workstream": "Workstream",
    "what did you complete this week?": "What did you complete this week?",
    "completed this week": "What did you complete this week?",
    "what are you currently working on?": "What are you currently working on?",
    "currently working on": "What are you currently working on?",
    "what are your next steps?": "What are your next steps?",
    "next steps": "What are your next steps?",
    "what is still pending or needs follow-up?": "What are your next steps?",
    "pending / follow-up": "What are your next steps?",
    "what question do you have for dr. lina?": "What question do you have for Dr. Lina?",
    "question for dr. lina": "What question do you have for Dr. Lina?",
    "what support do you need?": "What support do you need?",
    "support needed": "What support do you need?",
    "who did you collaborate with?": "Who did you collaborate with?",
    "collaborators": "Who did you collaborate with?",
    "add any relevant links or file names": "Add any relevant links or file names",
    "relevant links / files": "Add any relevant links or file names",
    "current status": "Current status",
    "status": "Current status",
    "project": "Project",
    "task": "Task",
    "task status": "Task status",
    "event": "Event",
    "deadline / meeting": "Event",
    "meeting notes": "Meeting notes",
    "notes": "Meeting notes",
    "source record id": "Source record ID",
    "source document": "Source document",
    "source": "Source document",
    "source section": "Source section",
    "dr. begdache feedback": "Dr. Begdache feedback",
    "attribution note": "Attribution Note"
  };
  const key = aliases[normalized] || header;
  if (key === "__timestamp") {
    return row["Week / meeting date"] ? String(row["Week / meeting date"]) + "T12:00:00.000Z" : new Date().toISOString();
  }
  return row[key] === undefined || row[key] === null ? "" : row[key];
}

function spreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function readSheet(sheetName) {
  const sheet = spreadsheet().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];

  const values = sheet.getDataRange().getDisplayValues();
  const headers = values.shift();
  return values
    .filter((row) => row.some(Boolean))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])));
}

function getValue(row, names) {
  const wanted = Array.isArray(names) ? names : [names];
  for (const name of wanted) {
    const matchingHeader = Object.keys(row).find((header) => header.toLowerCase() === name.toLowerCase());
    if (matchingHeader && String(row[matchingHeader]).trim()) return String(row[matchingHeader]).trim();
  }
  return "";
}

function keepRow(row) {
  if (getValue(row, "Source record ID")) return true;
  return hasFormContent(row);
}

function hasFormContent(row) {
  const fields = [
    "Student name",
    "Workstream",
    "What did you complete this week?",
    "What are you currently working on?",
    "What are your next steps?",
    "What is still pending or needs follow-up?",
    "What question do you have for Dr. Lina?",
    "What support do you need?",
    "Who did you collaborate with?",
    "Add any relevant links or file names"
  ];
  return fields.some((field) => getValue(row, field));
}

function normalizeProgram(value) {
  const program = value.toUpperCase();
  if (program.includes("B-SMART") && program.includes("BMINDS")) return "SMART-MINDS";
  if (program.includes("B-SMART")) return "B-SMART";
  if (program.includes("BMINDS")) return "BMINDS";
  if (program.includes("SMART-MINDS")) return "SMART-MINDS";
  return "SMART-MINDS";
}

function studentId(name) {
  return "sheet-student-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function buildStudents(rows) {
  const students = {};
  const canonicalNames = Object.keys(CANONICAL_STUDENTS);
  rows.forEach((row) => {
    const name = getValue(row, ["Student name", "Student Name", "Name"]);
    const canonicalName = canonicalNames.find(
      (candidate) => candidate.toLowerCase() === name.toLowerCase()
    );
    if (!canonicalName || students[canonicalName.toLowerCase()]) return;
    students[canonicalName.toLowerCase()] = {
      "Student ID": studentId(canonicalName),
      "Student Name": canonicalName,
      "Team / program": CANONICAL_STUDENTS[canonicalName],
      Active: "Yes",
      Role: getValue(row, "Role") || "Student contributor",
      "Current focus": getValue(row, ["What are your next steps?", "Next Steps", "Task"])
    };
  });
  canonicalNames.forEach((canonicalName) => {
    if (students[canonicalName.toLowerCase()]) return;
    students[canonicalName.toLowerCase()] = {
      "Student ID": studentId(canonicalName),
      "Student Name": canonicalName,
      "Team / program": CANONICAL_STUDENTS[canonicalName],
      Active: "Yes",
      Role: "Student contributor",
      "Current focus": ""
    };
  });
  return canonicalNames.map((name) => students[name.toLowerCase()]);
}
