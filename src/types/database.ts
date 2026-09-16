type Table<Row> = {
  Row: Row & Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};

export interface StudentRow {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  team_program: "SMART-MINDS" | "B-SMART" | "BMINDS";
  active: boolean;
  joined_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoleRow {
  id: string;
  name: string;
  team_program: StudentRow["team_program"];
  description: string;
  created_at: string;
}

export interface StudentRoleRow {
  id: string;
  student_id: string;
  role_id: string;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
}

export interface MeetingRow {
  id: string;
  title: string;
  meeting_date: string;
  semester: string;
  notes: string;
  created_at: string;
}

export type ActivityType = "update" | "completed" | "working_on" | "next_steps" | "question" | "support";
export type UpdateCategory = "Outreach" | "Education" | "Social Media" | "Research" | "Manuscript" | "Fundraising" | "Operations" | "Website" | "Other";
export type StudentUpdateStatus = "Update" | "Completed" | "In Progress" | "Blocked" | "Planned";

export interface StudentUpdateRow {
  id: string;
  student_id: string;
  meeting_id: string;
  category: UpdateCategory;
  activity_type: ActivityType;
  update_text: string;
  status: StudentUpdateStatus;
  project_id: string | null;
  source_record_id: string | null;
  created_at: string;
}

export interface MentorResponseRow {
  id: string;
  student_update_id: string;
  message: string;
  responded_at: string;
  resolution_status: "open" | "follow-up-needed" | "resolved";
  follow_up_date: string | null;
}

export interface TaskRow {
  id: string;
  title: string;
  description: string;
  assigned_to_student_id: string;
  project_id: string | null;
  created_from_meeting_id: string | null;
  category: UpdateCategory;
  priority: "Low" | "Medium" | "High" | "Urgent";
  due_date: string | null;
  status: "Not Started" | "In Progress" | "Blocked" | "Completed" | "Cancelled";
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectRow {
  id: string;
  name: string;
  description: string;
  category: string;
  team_program: StudentRow["team_program"];
  status: "Planned" | "Active" | "On Hold" | "Completed" | "Cancelled";
  start_date: string | null;
  target_end_date: string | null;
  actual_end_date: string | null;
  owner_student_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMemberRow { id: string; project_id: string; student_id: string; responsibility: string; joined_at: string; }
export interface EventRow { id: string; name: string; description: string; event_type: string; event_date: string; start_time: string | null; end_time: string | null; location: string | null; project_id: string | null; status: string; created_at: string; }
export interface EventParticipantRow { id: string; event_id: string; student_id: string; participant_role: string; attendance_status: string; }
export interface ResourceRow { id: string; title: string; resource_type: string; url: string | null; description: string; project_id: string | null; meeting_id: string | null; owner_student_id: string | null; created_at: string; }
export interface SurveyCampaignRow { id: string; name: string; description: string; team_program: StudentRow["team_program"]; responder_url: string | null; target_responses: number; current_responses: number; deadline: string | null; status: string; created_at: string; updated_at: string; }
export interface SurveyGoalRow { id: string; survey_campaign_id: string; goal_date: string; target_count: number; actual_count: number; }
export interface OutreachContactRow { id: string; organization: string; contact_name: string; contact_type: string; email: string | null; phone: string | null; notes: string; current_status: string; created_at: string; }
export interface OutreachInteractionRow { id: string; contact_id: string; student_id: string; interaction_date: string; interaction_type: string; notes: string; outcome: string; follow_up_date: string | null; status: string; }
export interface ManuscriptRow { id: string; title: string; research_question: string; team_program: StudentRow["team_program"]; status: string; supervisor_student_id: string | null; deadline: string | null; created_at: string; }
export interface ManuscriptAuthorRow { id: string; manuscript_id: string; student_id: string; author_order: number; author_role: string; }
export interface FundraiserRow { id: string; name: string; description: string; event_id: string | null; organizer_student_id: string | null; fundraising_goal: number | null; amount_raised: number | null; status: string; created_at: string; }
export interface SocialMediaContentRow { id: string; title: string; platform: string; content_type: string; assigned_to_student_id: string; project_id: string | null; due_date: string | null; publish_date: string | null; status: string; external_url: string | null; notes: string; created_at: string; }

export type Database = {
  public: {
    Tables: {
      students: Table<StudentRow>;
      roles: Table<RoleRow>;
      student_roles: Table<StudentRoleRow>;
      meetings: Table<MeetingRow>;
      student_updates: Table<StudentUpdateRow>;
      mentor_responses: Table<MentorResponseRow>;
      tasks: Table<TaskRow>;
      projects: Table<ProjectRow>;
      project_members: Table<ProjectMemberRow>;
      events: Table<EventRow>;
      event_participants: Table<EventParticipantRow>;
      resources: Table<ResourceRow>;
      survey_campaigns: Table<SurveyCampaignRow>;
      survey_goals: Table<SurveyGoalRow>;
      outreach_contacts: Table<OutreachContactRow>;
      outreach_interactions: Table<OutreachInteractionRow>;
      manuscripts: Table<ManuscriptRow>;
      manuscript_authors: Table<ManuscriptAuthorRow>;
      fundraisers: Table<FundraiserRow>;
      social_media_content: Table<SocialMediaContentRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
