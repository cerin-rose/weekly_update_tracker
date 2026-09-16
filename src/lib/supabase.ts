import { createClient } from "@supabase/supabase-js";
import type { MentorResponse, Student, WeeklyUpdate, Workstream } from "@/types";
import type { Database, EventParticipantRow, EventRow, FundraiserRow, ManuscriptAuthorRow, ManuscriptRow, MeetingRow, MentorResponseRow, OutreachContactRow, OutreachInteractionRow, ProjectMemberRow, ProjectRow, ResourceRow, RoleRow, SocialMediaContentRow, StudentRow, StudentRoleRow, StudentUpdateRow, SurveyCampaignRow, SurveyGoalRow, TaskRow } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabasePublishableKey);
export const supabase = hasSupabaseConfig ? createClient<Database>(supabaseUrl!, supabasePublishableKey!) : null;

export interface DatabaseState {
  students: Student[];
  meetings: MeetingRow[];
  updates: WeeklyUpdate[];
  mentorResponses: Record<string, MentorResponse>;
}

export interface OperationsState {
  students: Student[];
  tasks: TaskRow[];
  projects: ProjectRow[];
  projectMembers: ProjectMemberRow[];
  meetings: MeetingRow[];
  studentUpdates: StudentUpdateRow[];
  events: EventRow[];
  eventParticipants: EventParticipantRow[];
  resources: ResourceRow[];
  outreachContacts: OutreachContactRow[];
  outreachInteractions: OutreachInteractionRow[];
  surveyCampaigns: SurveyCampaignRow[];
  surveyGoals: SurveyGoalRow[];
  manuscripts: ManuscriptRow[];
  manuscriptAuthors: ManuscriptAuthorRow[];
  fundraisers: FundraiserRow[];
  socialMediaContent: SocialMediaContentRow[];
}

function workstreamForRole(role: string): Workstream {
  const value = role.toLowerCase();
  if (value.includes("research") || value.includes("scholarly")) return "Research";
  if (value.includes("education")) return "Education";
  if (value.includes("outreach")) return "Outreach";
  if (value.includes("social")) return "Social Media";
  if (value.includes("fundraising")) return "Fundraising";
  if (value.includes("manuscript")) return "Manuscript";
  if (value.includes("website") || value.includes("digital")) return "Website";
  if (value.includes("operations") || value.includes("systems")) return "Operations";
  return "Other";
}

function directoryFromRows(students: StudentRow[], roles: RoleRow[], assignments: StudentRoleRow[]) {
  const rolesById = new Map(roles.map((role) => [role.id, role]));
  const roleByStudent = new Map(assignments.map((assignment) => [assignment.student_id, rolesById.get(assignment.role_id)]));
  return students.map((student) => {
    const nameParts = student.display_name.trim().split(/\s+/).filter(Boolean);
    const initials = nameParts.map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "SM";
    const leadershipRole = roleByStudent.get(student.id)?.name ?? "SMART-MINDS Contributor";
    return {
      id: student.id,
      name: student.display_name,
      initials,
      leadershipRole,
      programAffiliation: student.team_program,
      primaryWorkstream: workstreamForRole(leadershipRole),
      currentFocus: roleByStudent.has(student.id) ? `${leadershipRole} responsibilities recorded in the Fall 2026 agendas.` : "Contribution recorded in the Fall 2026 agendas.",
    } satisfies Student;
  });
}

function toMentorResponse(row: MentorResponseRow): MentorResponse {
  return {
    message: row.message,
    respondedAt: row.responded_at,
    resolutionStatus: row.resolution_status,
    followUpDate: row.follow_up_date ?? undefined,
  };
}

function groupActivities(rows: StudentUpdateRow[], meetings: MeetingRow[], responses: MentorResponseRow[]): DatabaseState {
  const meetingDates = new Map(meetings.map((meeting) => [meeting.id, meeting.meeting_date]));
  const grouped = new Map<string, { studentId: string; meetingDate: string; submittedAt: string; workstream: StudentUpdateRow["category"]; completed: string; workingOn: string; nextSteps: string; question: string; support: string }>();
  const questionRows = new Map<string, string>();

  for (const row of rows) {
    const sourceId = row.source_record_id ?? row.id;
    const current = grouped.get(sourceId) ?? { studentId: row.student_id, meetingDate: meetingDates.get(row.meeting_id) ?? row.created_at.slice(0, 10), submittedAt: row.created_at, workstream: row.category, completed: "", workingOn: "", nextSteps: "", question: "", support: "" };
    current.workstream = row.category;
    current.submittedAt = current.submittedAt < row.created_at ? current.submittedAt : row.created_at;
    if (row.activity_type === "completed") current.completed = row.update_text;
    if (row.activity_type === "working_on") current.workingOn = row.update_text;
    if (row.activity_type === "next_steps") current.nextSteps = row.update_text;
    if (row.activity_type === "question") { current.question = row.update_text.replace(/^Question for Dr\. Lina: /, ""); questionRows.set(sourceId, row.id); }
    if (row.activity_type === "support") current.support = row.update_text.replace(/^Support needed: /, "");
    if (row.activity_type === "update") current.completed = row.update_text;
    grouped.set(sourceId, current);
  }

  const responseBySource = new Map<string, MentorResponse>();
  const sourceByQuestionRow = new Map([...questionRows].map(([source, rowId]) => [rowId, source]));
  for (const response of responses) {
    const sourceId = sourceByQuestionRow.get(response.student_update_id);
    if (sourceId) responseBySource.set(sourceId, toMentorResponse(response));
  }

  const mentorResponses = Object.fromEntries(responseBySource);
  const updates = [...grouped.entries()].map(([id, item]) => ({
    id,
    studentId: item.studentId,
    meetingDate: item.meetingDate,
    workstream: item.workstream as WeeklyUpdate["workstream"],
    completed: item.completed,
    workingOn: item.workingOn,
    nextSteps: item.nextSteps,
    questionForDrLina: item.question,
    supportNeeded: item.support,
    collaborators: [],
    resourceLinks: [],
    status: "on-track" as WeeklyUpdate["status"],
    submittedAt: item.submittedAt,
    mentorResponse: mentorResponses[id],
  }));

  return { updates, mentorResponses, students: [], meetings };
}

export async function loadDatabaseState(): Promise<DatabaseState | null> {
  if (!supabase) return null;

  const [{ data: studentRows, error: studentError }, { data: roleRows, error: roleError }, { data: assignmentRows, error: assignmentError }, { data: activityRows, error: activityError }, { data: meetingRows, error: meetingError }, { data: responseRows, error: responseError }] = await Promise.all([
    supabase.from("students").select("*").order("display_name", { ascending: true }),
    supabase.from("roles").select("*"),
    supabase.from("student_roles").select("*"),
    supabase.from("student_updates").select("*").order("created_at", { ascending: false }),
    supabase.from("meetings").select("*").order("meeting_date", { ascending: false }),
    supabase.from("mentor_responses").select("*").order("responded_at", { ascending: false }),
  ]);

  if (studentError) throw studentError;
  if (roleError) throw roleError;
  if (assignmentError) throw assignmentError;
  if (activityError) throw activityError;
  if (meetingError) throw meetingError;
  if (responseError) throw responseError;
  const state = groupActivities(activityRows ?? [], meetingRows ?? [], responseRows ?? []);
  return { ...state, students: directoryFromRows(studentRows ?? [], roleRows ?? [], assignmentRows ?? []) };
}

function activitiesFor(update: WeeklyUpdate) {
  const sourceId = update.id;
  return [
    { id: `${sourceId}-completed`, activity_type: "completed", update_text: update.completed, status: "Completed" },
    { id: `${sourceId}-working_on`, activity_type: "working_on", update_text: update.workingOn, status: "In Progress" },
    { id: `${sourceId}-next_steps`, activity_type: "next_steps", update_text: update.nextSteps, status: "Planned" },
    { id: `${sourceId}-question`, activity_type: "question", update_text: update.questionForDrLina ? `Question for Dr. Lina: ${update.questionForDrLina}` : "", status: "Update" },
    { id: `${sourceId}-support`, activity_type: "support", update_text: update.supportNeeded ? `Support needed: ${update.supportNeeded}` : "", status: update.supportNeeded.toLowerCase().includes("blocked") ? "Blocked" : "Update" },
  ].filter((activity) => activity.update_text.trim());
}

export async function saveRemoteWeeklyUpdate(update: WeeklyUpdate) {
  if (!supabase) return;
  const meetingId = `meeting-${update.meetingDate}`;
  const rows = activitiesFor(update).map((activity) => ({
    ...activity,
    student_id: update.studentId,
    meeting_id: meetingId,
    category: update.workstream,
    project_id: null,
    source_record_id: update.id,
  }));
  const { error } = await supabase.from("student_updates").upsert(rows);
  if (error) throw error;
}

export async function saveRemoteMentorResponse(updateId: string, response: MentorResponse) {
  if (!supabase) return;
  const { data: questionRow, error: questionError } = await supabase.from("student_updates").select("id").eq("source_record_id", updateId).eq("activity_type", "question").limit(1).maybeSingle();
  if (questionError) throw questionError;
  if (!questionRow) throw new Error("A mentor response needs a question activity row.");
  const { error } = await supabase.from("mentor_responses").upsert({
    id: `response-${updateId}`,
    student_update_id: questionRow.id,
    message: response.message,
    responded_at: response.respondedAt,
    resolution_status: response.resolutionStatus,
    follow_up_date: response.followUpDate ?? null,
  });
  if (error) throw error;
}

export async function updateRemoteTaskStatus(taskId: string, status: TaskRow["status"]) {
  if (!supabase) return;
  const { error } = await supabase.from("tasks").update({
    status,
    completed_at: status === "Completed" ? new Date().toISOString() : null,
  }).eq("id", taskId);
  if (error) throw error;
}

export async function loadOperationsState(): Promise<OperationsState | null> {
  if (!supabase) return null;

  const [students, roles, studentRoles, tasks, projects, projectMembers, meetings, studentUpdates, events, eventParticipants, resources, outreachContacts, outreachInteractions, surveyCampaigns, surveyGoals, manuscripts, manuscriptAuthors, fundraisers, socialMediaContent] = await Promise.all([
    supabase.from("students").select("*").order("display_name", { ascending: true }),
    supabase.from("roles").select("*"),
    supabase.from("student_roles").select("*"),
    supabase.from("tasks").select("*").order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("projects").select("*").order("updated_at", { ascending: false }),
    supabase.from("project_members").select("*"),
    supabase.from("meetings").select("*").order("meeting_date", { ascending: true }),
    supabase.from("student_updates").select("*").order("created_at", { ascending: false }),
    supabase.from("events").select("*").order("event_date", { ascending: true }),
    supabase.from("event_participants").select("*"),
    supabase.from("resources").select("*").order("created_at", { ascending: false }),
    supabase.from("outreach_contacts").select("*").order("organization", { ascending: true }),
    supabase.from("outreach_interactions").select("*").order("interaction_date", { ascending: false }),
    supabase.from("survey_campaigns").select("*").order("name", { ascending: true }),
    supabase.from("survey_goals").select("*").order("goal_date", { ascending: true }),
    supabase.from("manuscripts").select("*").order("created_at", { ascending: false }),
    supabase.from("manuscript_authors").select("*").order("author_order", { ascending: true }),
    supabase.from("fundraisers").select("*").order("created_at", { ascending: false }),
    supabase.from("social_media_content").select("*").order("due_date", { ascending: true, nullsFirst: false }),
  ]);

  for (const result of [students, roles, studentRoles, tasks, projects, projectMembers, meetings, studentUpdates, events, eventParticipants, resources, outreachContacts, outreachInteractions, surveyCampaigns, surveyGoals, manuscripts, manuscriptAuthors, fundraisers, socialMediaContent]) {
    if (result.error) throw result.error;
  }

  return {
    students: directoryFromRows(students.data ?? [], roles.data ?? [], studentRoles.data ?? []),
    tasks: tasks.data ?? [],
    projects: projects.data ?? [],
    projectMembers: projectMembers.data ?? [],
    meetings: meetings.data ?? [],
    studentUpdates: studentUpdates.data ?? [],
    events: events.data ?? [],
    eventParticipants: eventParticipants.data ?? [],
    resources: resources.data ?? [],
    outreachContacts: outreachContacts.data ?? [],
    outreachInteractions: outreachInteractions.data ?? [],
    surveyCampaigns: surveyCampaigns.data ?? [],
    surveyGoals: surveyGoals.data ?? [],
    manuscripts: manuscripts.data ?? [],
    manuscriptAuthors: manuscriptAuthors.data ?? [],
    fundraisers: fundraisers.data ?? [],
    socialMediaContent: socialMediaContent.data ?? [],
  };
}

export function subscribeToOperations(onChange: () => void) {
  if (!supabase) return () => undefined;
  const tables = ["tasks", "projects", "project_members", "meetings", "student_updates", "events", "event_participants", "resources", "outreach_contacts", "outreach_interactions", "survey_campaigns", "survey_goals", "manuscripts", "manuscript_authors", "fundraisers", "social_media_content"] as const;
  const channel = tables.reduce((current, table) => current.on("postgres_changes", { event: "*", schema: "public", table }, onChange), supabase.channel("smart-minds-live-operations"));
  channel.subscribe();
  return () => { void supabase.removeChannel(channel); };
}

export function subscribeToDatabase(onChange: () => void) {
  if (!supabase) return () => undefined;
  const channel = supabase
    .channel("smart-minds-live-updates")
    .on("postgres_changes", { event: "*", schema: "public", table: "student_updates" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "mentor_responses" }, onChange)
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}
