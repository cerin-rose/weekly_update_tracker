import type { Student, UpdateStatus, WeeklyUpdate, Workstream } from "@/types";

export interface GoogleSheetState {
  students: Student[];
  updates: WeeklyUpdate[];
}

const browserCacheKey = "smart-minds-weekly-updates-cache-v1";

type GoogleSheetRow = Record<string, unknown> & { __rowNumber?: string };

const workstreams: Workstream[] = ["Research", "Education", "Outreach", "Communications", "Fundraising", "Manuscript", "Social Media", "Operations", "Website", "Other"];
const teamPrograms = ["B-SMART", "BMINDS", "SMART-MINDS"] as const;

const statusMap: Record<string, UpdateStatus> = {
  "on track": "on-track",
  completed: "on-track",
  "in progress": "on-track",
  planned: "on-track",
  update: "on-track",
  question: "question",
  "needs help": "needs-help",
  blocked: "blocked",
};

function textValue(raw: unknown) {
  if (raw === null || raw === undefined) return "";
  return String(raw).trim();
}

function value(row: GoogleSheetRow, ...keys: string[]) {
  for (const key of keys) {
    const exact = textValue(row[key]);
    if (exact) return exact;
    const matchingEntry = Object.entries(row).find(([header]) => header.trim().toLowerCase() === key.trim().toLowerCase());
    const matchingValue = matchingEntry ? textValue(matchingEntry[1]) : "";
    if (matchingValue) return matchingValue;
  }
  return "";
}

function slug(valueToSlug: string) {
  return valueToSlug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function dateFromRow(row: GoogleSheetRow, fallback: Date) {
  const dateValue = value(row, "Week / meeting date", "Meeting date", "Week", "Date");
  const date = dateValue ? new Date(dateValue) : fallback;
  return Number.isNaN(date.getTime()) ? fallback.toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
}

function parseSubmittedAt(row: GoogleSheetRow, meetingDate: string) {
  const submittedAtValue = value(row, "Timestamp", "Submitted At", "Submitted at");
  const parsed = submittedAtValue ? new Date(submittedAtValue) : new Date(`${meetingDate}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? new Date(`${meetingDate}T12:00:00.000Z`) : parsed;
}

function splitList(raw: string) {
  return raw.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
}

function studentsFromRows(rows: GoogleSheetRow[]) {
  const students = new Map<string, Student>();
  for (const row of rows) {
    const name = value(row, "Student name", "Student Name", "Name");
    if (!name) continue;
    const workstreamValue = value(row, "Workstream");
    const primaryWorkstream = workstreams.includes(workstreamValue as Workstream) ? workstreamValue as Workstream : "Other";
    const currentFocus = value(row, "Current focus", "What is still pending or needs follow-up?", "What are your next steps?", "What are you currently working on?", "What did you complete this week?");
    const teamValue = value(row, "Team / program", "Team", "Program", "Column 4");
    const programAffiliation = teamPrograms.includes(teamValue as typeof teamPrograms[number]) ? teamValue as typeof teamPrograms[number] : "SMART-MINDS";
    students.set(name.toLowerCase(), {
      id: `sheet-student-${slug(name)}`,
      name,
      initials: name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "SM",
      leadershipRole: value(row, "Role") || "Student contributor",
      programAffiliation,
      primaryWorkstream,
      currentFocus: currentFocus || "No current focus submitted.",
    });
  }
  return [...students.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function studentsFromRosterRows(rows: GoogleSheetRow[]) {
  return rows.flatMap((row) => {
    const name = value(row, "Student name", "Student Name", "Name");
    if (!name || value(row, "Active").toLowerCase() === "no") return [];
    const workstreamValue = value(row, "Workstream", "Primary workstream");
    const primaryWorkstream = workstreams.includes(workstreamValue as Workstream) ? workstreamValue as Workstream : "Other";
    const teamValue = value(row, "Team / program", "Team", "Program", "Column 4");
    const programAffiliation = teamPrograms.includes(teamValue as typeof teamPrograms[number]) ? teamValue as typeof teamPrograms[number] : "SMART-MINDS";
    return [{
      id: value(row, "Student ID", "Student Id") || `sheet-student-${slug(name)}`,
      name,
      initials: name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "SM",
      leadershipRole: value(row, "Role") || "Student contributor",
      programAffiliation,
      primaryWorkstream,
      currentFocus: value(row, "Current focus", "Pending / Follow-Up", "Next Steps", "Currently Working On") || "No current focus submitted.",
    } satisfies Student];
  }).sort((a, b) => a.name.localeCompare(b.name));
}

function updatesFromRows(rows: GoogleSheetRow[], students: Student[]): WeeklyUpdate[] {
  const studentsByName = new Map(students.map((student) => [student.name.toLowerCase(), student]));

  return rows.map((row, index) => {
    const submittedName = value(row, "Student name", "Student Name");
    const student = studentsByName.get(submittedName.toLowerCase());
    const meetingDate = dateFromRow(row, new Date());
    const submittedAt = parseSubmittedAt(row, meetingDate);
    const workstreamValue = value(row, "Workstream");
    const statusValue = value(row, "Current status", "Status").toLowerCase();
    const rowNumber = value(row, "__rowNumber") || String(index + 2);
    const task = value(row, "Task", "Task title");
    const sourceRecordId = value(row, "Source record ID", "Source Record ID", "Record ID", "ID") || rowNumber;
    const recordType = student ? "student" : submittedName ? "unassigned" : "meeting";

    return {
      id: `sheet-update-${sourceRecordId}-${rowNumber}`,
      studentId: student?.id ?? null,
      studentName: student?.name ?? submittedName,
      recordType,
      meetingDate,
      workstream: workstreams.includes(workstreamValue as Workstream) ? workstreamValue as Workstream : "Other",
      completed: value(row, "What did you complete this week?", "Completed This Week") || (value(row, "Task status", "Task Status").toLowerCase() === "completed" ? task : ""),
      workingOn: value(row, "What are you currently working on?", "Currently Working On"),
      nextSteps: value(row, "What are your next steps?", "What is still pending or needs follow-up?", "Pending / Follow-Up", "Next Steps") || task,
      questionForDrLina: value(row, "What question do you have for Dr. Lina?", "Question for Dr. Lina"),
      supportNeeded: value(row, "What support do you need?", "Support Needed"),
      collaborators: splitList(value(row, "Who did you collaborate with?", "Collaborators")),
      resourceLinks: splitList(value(row, "Add any relevant links or file names", "Relevant Links / Files", "Source links")),
      task,
      taskStatus: value(row, "Task status", "Task Status"),
      project: value(row, "Project"),
      event: value(row, "Event"),
      sourceRecordId,
      sourceDocument: value(row, "Source document", "Source Document", "Document"),
      sourceSection: value(row, "Source section", "Source Section", "Section"),
      attributionEvidence: value(row, "Attribution Evidence", "Evidence"),
      attributionNote: value(row, "Attribution Note", "Attribution note"),
      status: statusMap[statusValue] ?? "on-track",
      submittedAt: submittedAt.toISOString(),
    } satisfies WeeklyUpdate;
  }).sort((a, b) => b.meetingDate.localeCompare(a.meetingDate) || b.submittedAt.localeCompare(a.submittedAt));
}

export async function loadGoogleSheetState(): Promise<GoogleSheetState> {
  let lastError = "The Google Sheet could not be loaded.";

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch("/api/weekly-updates", { cache: "no-store" });
      const payload = await response.json() as { rows?: GoogleSheetRow[]; updates?: GoogleSheetRow[]; students?: GoogleSheetRow[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "The Google Sheet could not be loaded.");
      const rows = payload.updates?.length ? payload.updates : payload.rows ?? [];
      const students = payload.students?.length ? studentsFromRosterRows(payload.students) : studentsFromRows(rows);
      if (!rows.length && !students.length) throw new Error("The Google Sheets source returned no records.");
      if (typeof window !== "undefined") window.sessionStorage.setItem(browserCacheKey, JSON.stringify(payload));
      return { students, updates: updatesFromRows(rows, students) };
    } catch (loadError) {
      lastError = loadError instanceof Error ? loadError.message : lastError;
      if (attempt === 0) await new Promise((resolve) => window.setTimeout(resolve, 700));
    }
  }

  if (typeof window !== "undefined") {
    const cachedPayload = window.sessionStorage.getItem(browserCacheKey);
    if (cachedPayload) {
      try {
        const payload = JSON.parse(cachedPayload) as { rows?: GoogleSheetRow[]; updates?: GoogleSheetRow[]; students?: GoogleSheetRow[] };
        const rows = payload.updates?.length ? payload.updates : payload.rows ?? [];
        const students = payload.students?.length ? studentsFromRosterRows(payload.students) : studentsFromRows(rows);
        if (rows.length || students.length) return { students, updates: updatesFromRows(rows, students) };
      } catch {
        window.sessionStorage.removeItem(browserCacheKey);
      }
    }
  }

  throw new Error(lastError);
}
