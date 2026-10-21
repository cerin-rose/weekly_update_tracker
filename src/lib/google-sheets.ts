import type { Student, WeeklyUpdate } from "@/types";
import { canonicalStudentName, displayStatus, normalizeProgram, normalizeWorkstream, validMeetingDate } from "@/lib/meeting-normalization";

export interface GoogleSheetState {
  students: Student[];
  updates: WeeklyUpdate[];
  lastUpdatedAt?: string;
}

const browserCacheKey = "smart-minds-weekly-updates-cache-v1";

type GoogleSheetRow = Record<string, unknown> & { __rowNumber?: string };

const teamPrograms = ["B-SMART", "BMINDS", "SMART-MINDS"] as const;

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

function dateFromRow(row: GoogleSheetRow) {
  const dateValue = value(row, "Week / meeting date", "Meeting date", "Week", "Date");
  if (!dateValue) return "";
  return validMeetingDate(dateValue);
}

function parseSubmittedAt(row: GoogleSheetRow, meetingDate: string) {
  const submittedAtValue = value(row, "Timestamp", "Submitted At", "Submitted at");
  if (submittedAtValue) {
    const parsed = new Date(submittedAtValue);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return meetingDate ? `${meetingDate}T12:00:00.000Z` : "";
}

function splitList(raw: string) {
  return raw.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
}

export function studentsFromRows(rows: GoogleSheetRow[]) {
  const students = new Map<string, Student>();
  for (const row of rows) {
    const name = canonicalStudentName(value(row, "Student name", "Student Name", "Name"));
    if (!name) continue;
    const primaryWorkstream = normalizeWorkstream(value(row, "Workstream")).value;
    const currentFocus = value(row, "Current focus", "What is still pending or needs follow-up?", "What are your next steps?", "What are you currently working on?", "What did you complete this week?");
    const teamValue = value(row, "Team / program", "Team", "Program", "Column 4");
    const programAffiliation = teamPrograms.includes(teamValue as typeof teamPrograms[number]) ? teamValue as typeof teamPrograms[number] : normalizeProgram(teamValue) as typeof teamPrograms[number];
    students.set(name.toLowerCase(), {
      id: `sheet-student-${slug(name)}`,
      name,
      initials: name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "SM",
      active: value(row, "Active").toLowerCase() !== "no",
      leadershipRole: value(row, "Role") || "Student contributor",
      programAffiliation,
      primaryWorkstream,
      currentFocus: currentFocus || "No current focus submitted.",
    });
  }
  return [...students.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function studentsFromRosterRows(rows: GoogleSheetRow[]) {
  return rows.flatMap((row) => {
    const name = canonicalStudentName(value(row, "Student name", "Student Name", "Name"));
    if (!name) return [];
    const primaryWorkstream = normalizeWorkstream(value(row, "Workstream", "Primary workstream")).value;
    const teamValue = value(row, "Team / program", "Team", "Program", "Column 4");
    const programAffiliation = teamPrograms.includes(teamValue as typeof teamPrograms[number]) ? teamValue as typeof teamPrograms[number] : normalizeProgram(teamValue) as typeof teamPrograms[number];
    return [{
      id: value(row, "Student ID", "Student Id") || `sheet-student-${slug(name)}`,
      name,
      initials: name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "SM",
      active: value(row, "Active").toLowerCase() !== "no",
      leadershipRole: value(row, "Role") || "Student contributor",
      programAffiliation,
      primaryWorkstream,
      currentFocus: value(row, "Current focus", "Pending / Follow-Up", "Next Steps", "Currently Working On") || "No current focus submitted.",
    } satisfies Student];
  }).sort((a, b) => a.name.localeCompare(b.name));
}

export function updatesFromRows(rows: GoogleSheetRow[], students: Student[]): WeeklyUpdate[] {
  const studentsByName = new Map(students.map((student) => [student.name.toLowerCase(), student]));

  return rows.map((row, index) => {
    const submittedName = value(row, "Student name", "Student Name");
    const student = studentsByName.get(submittedName.toLowerCase());
    const meetingDate = dateFromRow(row);
    const submittedAt = parseSubmittedAt(row, meetingDate);
    const workstreamValue = normalizeWorkstream(value(row, "Workstream")).value;
    const rowNumber = value(row, "__rowNumber") || String(index + 2);
    const task = value(row, "Task", "Task title");
    const sourceRecordId = value(row, "Source record ID", "Source Record ID", "Record ID", "ID") || rowNumber;
    const recordType = student ? "student" : "meeting";
    const unmatchedNameNote = submittedName && !student ? `Unmatched source name: ${submittedName}` : "";
    const meetingNotes = [value(row, "Meeting notes", "Meeting Notes", "Notes"), unmatchedNameNote].filter(Boolean).join(" · ");

    return {
      id: `sheet-update-${sourceRecordId}-${rowNumber}`,
      studentId: student?.id ?? null,
      studentName: student?.name ?? "",
      recordType,
      meetingDate,
      workstream: workstreamValue,
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
      meetingNotes,
      sourceRecordId,
      sourceDocument: value(row, "Source document", "Source Document", "Document"),
      sourceSection: value(row, "Source section", "Source Section", "Section"),
      attributionEvidence: value(row, "Attribution Evidence", "Evidence"),
      attributionNote: value(row, "Attribution Note", "Attribution note"),
      status: displayStatus(value(row, "Current status", "Status")),
      submittedAt,
    } satisfies WeeklyUpdate;
  }).sort((a, b) => b.meetingDate.localeCompare(a.meetingDate) || b.submittedAt.localeCompare(a.submittedAt));
}

export async function loadGoogleSheetState(): Promise<GoogleSheetState> {
  let lastError = "The Google Sheet could not be loaded.";

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch("/api/weekly-updates", { cache: "no-store" });
      const payload = await response.json() as { rows?: GoogleSheetRow[]; updates?: GoogleSheetRow[]; students?: GoogleSheetRow[]; lastUpdatedAt?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || "The Google Sheet could not be loaded.");
      const rows = payload.updates?.length ? payload.updates : payload.rows ?? [];
      const students = payload.students?.length ? studentsFromRosterRows(payload.students) : studentsFromRows(rows);
      if (!rows.length && !students.length) throw new Error("The Google Sheets source returned no records.");
      if (typeof window !== "undefined") window.sessionStorage.setItem(browserCacheKey, JSON.stringify(payload));
      return { students, updates: updatesFromRows(rows, students), lastUpdatedAt: payload.lastUpdatedAt };
    } catch (loadError) {
      lastError = loadError instanceof Error ? loadError.message : lastError;
      if (attempt === 0) await new Promise((resolve) => window.setTimeout(resolve, 700));
    }
  }

  if (typeof window !== "undefined") {
    const cachedPayload = window.sessionStorage.getItem(browserCacheKey);
    if (cachedPayload) {
      try {
        const payload = JSON.parse(cachedPayload) as { rows?: GoogleSheetRow[]; updates?: GoogleSheetRow[]; students?: GoogleSheetRow[]; lastUpdatedAt?: string };
        const rows = payload.updates?.length ? payload.updates : payload.rows ?? [];
        const students = payload.students?.length ? studentsFromRosterRows(payload.students) : studentsFromRows(rows);
        if (rows.length || students.length) return { students, updates: updatesFromRows(rows, students), lastUpdatedAt: payload.lastUpdatedAt };
      } catch {
        window.sessionStorage.removeItem(browserCacheKey);
      }
    }
  }

  throw new Error(lastError);
}
