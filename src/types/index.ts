export type ProgramAffiliation = "B-SMART" | "BMINDS" | "SMART-MINDS";

export type Workstream =
  | "Research"
  | "Education"
  | "Outreach"
  | "Communications"
  | "Fundraising"
  | "Manuscript"
  | "Social Media"
  | "Operations"
  | "Website"
  | "Other";

export type UpdateStatus = "on-track" | "question" | "needs-help" | "blocked";
export type RecordType = "student" | "meeting" | "unassigned";

export interface Student {
  id: string;
  name: string;
  initials: string;
  leadershipRole: string;
  programAffiliation: ProgramAffiliation;
  primaryWorkstream: Workstream;
  currentFocus: string;
}

export interface WeeklyUpdate {
  id: string;
  studentId: string | null;
  studentName: string;
  recordType: RecordType;
  meetingDate: string;
  workstream: Workstream;
  completed: string;
  workingOn: string;
  nextSteps: string;
  questionForDrLina: string;
  supportNeeded: string;
  collaborators: string[];
  resourceLinks: string[];
  task: string;
  taskStatus: string;
  project: string;
  event: string;
  meetingNotes: string;
  sourceRecordId: string;
  sourceDocument: string;
  sourceSection: string;
  attributionEvidence: string;
  attributionNote: string;
  status: UpdateStatus;
  submittedAt: string;
}

export type UpdateWithStudent = WeeklyUpdate & { student?: Student };
