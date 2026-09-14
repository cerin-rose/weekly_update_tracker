export type ProgramAffiliation = "B-SMART" | "BMINDS" | "SMART-MINDS";

export type Workstream =
  | "Research"
  | "Education"
  | "Outreach"
  | "Communications"
  | "Fundraising"
  | "Manuscripts"
  | "Social Media";

export type UpdateStatus = "on-track" | "question" | "needs-help" | "blocked";
export type ResolutionStatus = "open" | "follow-up-needed" | "resolved";

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
}

export interface WeeklyUpdate {
  id: string;
  studentId: string;
  meetingDate: string;
  completed: string;
  workingOn: string;
  nextSteps: string;
  questionForDrLina: string;
  supportNeeded: string;
  collaborators: string[];
  resourceLinks: string[];
  status: UpdateStatus;
  submittedAt: string;
  mentorResponse?: MentorResponse;
}

export type UpdateWithStudent = WeeklyUpdate & { student: Student };
