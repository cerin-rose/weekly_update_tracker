import type { Student, UpdateStatus, WeeklyUpdate, Workstream } from "@/types";

export interface GoogleSheetState {
  students: Student[];
  updates: WeeklyUpdate[];
}

type GoogleSheetRow = Record<string, string> & { __rowNumber?: string };

const workstreams: Workstream[] = ["Research", "Education", "Outreach", "Communications", "Fundraising", "Manuscript", "Social Media", "Operations", "Website", "Other"];
const teamPrograms = ["B-SMART", "BMINDS", "SMART-MINDS"] as const;
const statusMap: Record<string, UpdateStatus> = { "On track": "on-track", Question: "question", "Needs help": "needs-help", Blocked: "blocked" };

function value(row: GoogleSheetRow, ...keys: string[]) {
  return keys.map((key) => row[key]?.trim()).find(Boolean) ?? "";
}

function slug(valueToSlug: string) {
  return valueToSlug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function dateFromRow(row: GoogleSheetRow, fallback: Date) {
  const dateValue = value(row, "Week / meeting date", "Meeting date");
  const date = dateValue ? new Date(dateValue) : fallback;
  return Number.isNaN(date.getTime()) ? fallback.toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
}

function studentsFromRows(rows: GoogleSheetRow[]) {
  const students = new Map<string, Student>();
  for (const row of rows) {
    const name = value(row, "Student name");
    if (!name) continue;
    const id = `sheet-student-${slug(name)}`;
    const workstreamValue = value(row, "Workstream");
    const primaryWorkstream = workstreams.includes(workstreamValue as Workstream) ? workstreamValue as Workstream : "Other";
    const currentFocus = value(row, "What is still pending or needs follow-up?", "What are your next steps?", "What are you currently working on?", "What did you complete this week?");
    const teamValue = value(row, "Team / program", "Column 4");
    const programAffiliation = teamPrograms.includes(teamValue as typeof teamPrograms[number]) ? teamValue as typeof teamPrograms[number] : "SMART-MINDS";
    students.set(name.toLowerCase(), {
      id,
      name,
      initials: name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "SM",
      leadershipRole: "Student contributor",
      programAffiliation,
      primaryWorkstream,
      currentFocus: currentFocus || "No current focus submitted.",
    });
  }
  return [...students.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function updatesFromRows(rows: GoogleSheetRow[], students: Student[]): WeeklyUpdate[] {
  const studentsByName = new Map(students.map((student) => [student.name.toLowerCase(), student]));
  return rows.flatMap((row) => {
    const submittedName = value(row, "Student name");
    const exactStudent = studentsByName.get(submittedName.toLowerCase());
    const firstNameMatches = students.filter((student) => student.name.split(/\s+/)[0].toLowerCase() === submittedName.split(/\s+/)[0].toLowerCase());
    const student = exactStudent ?? (firstNameMatches.length === 1 ? firstNameMatches[0] : undefined);
    const submittedAt = new Date(value(row, "Timestamp"));
    if (!student || Number.isNaN(submittedAt.getTime())) return [];

    const workstreamValue = value(row, "Workstream");
    const workstream = workstreams.includes(workstreamValue as Workstream) ? workstreamValue as Workstream : "Other";
    const rowNumber = value(row, "__rowNumber") || submittedAt.toISOString();
    return [{
      id: `sheet-update-${rowNumber}`,
      studentId: student.id,
      meetingDate: dateFromRow(row, submittedAt),
      workstream,
      completed: value(row, "What did you complete this week?"),
      workingOn: value(row, "What are you currently working on?"),
      nextSteps: value(row, "What are your next steps?", "What is still pending or needs follow-up?"),
      questionForDrLina: value(row, "What question do you have for Dr. Lina?"),
      supportNeeded: value(row, "What support do you need?"),
      collaborators: value(row, "Who did you collaborate with?").split(",").map((item) => item.trim()).filter(Boolean),
      resourceLinks: value(row, "Add any relevant links or file names").split(",").map((item) => item.trim()).filter(Boolean),
      status: statusMap[value(row, "Current status")] ?? "on-track",
      submittedAt: submittedAt.toISOString(),
    } satisfies WeeklyUpdate];
  }).sort((a, b) => b.meetingDate.localeCompare(a.meetingDate) || b.submittedAt.localeCompare(a.submittedAt));
}

export async function loadGoogleSheetState(): Promise<GoogleSheetState> {
  const response = await fetch("/api/weekly-updates", { cache: "no-store" });
  if (!response.ok) throw new Error("The Google Sheet could not be loaded.");
  const payload = await response.json() as { rows?: GoogleSheetRow[] };
  const rows = payload.rows ?? [];
  const students = studentsFromRows(rows);
  return { students, updates: updatesFromRows(rows, students) };
}
