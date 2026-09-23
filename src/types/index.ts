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
export type ResolutionStatus = "open" | "follow-up-needed" | "resolved";
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

export interface MentorResponse {
  message: string;
  respondedAt: string;
  resolutionStatus: ResolutionStatus;
  followUpDate?: string;
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
  sourceRecordId: string;
  sourceDocument: string;
  sourceSection: string;
  attributionEvidence: string;
  attributionNote: string;
  status: UpdateStatus;
  submittedAt: string;
  mentorResponse?: MentorResponse;
}

export type UpdateWithStudent = WeeklyUpdate & { student?: Student };
