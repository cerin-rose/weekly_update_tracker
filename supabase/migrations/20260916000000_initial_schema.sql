create extension if not exists pgcrypto;

create table if not exists public.students (
  id text primary key default gen_random_uuid()::text,
  first_name text not null,
  last_name text not null,
  display_name text not null,
  email text unique,
  phone text,
  team_program text not null check (team_program in ('SMART-MINDS', 'B-SMART', 'BMINDS')),
  active boolean not null default true,
  joined_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  team_program text not null check (team_program in ('SMART-MINDS', 'B-SMART', 'BMINDS')),
  description text not null default '',
  created_at timestamptz not null default now(),
  unique (name, team_program)
);

create table if not exists public.student_roles (
  id text primary key default gen_random_uuid()::text,
  student_id text not null references public.students(id) on delete cascade,
  role_id text not null references public.roles(id) on delete restrict,
  start_date date not null,
  end_date date,
  is_current boolean not null default true,
  check (end_date is null or end_date >= start_date),
  unique (student_id, role_id, start_date)
);

create table if not exists public.meetings (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  meeting_date date not null,
  semester text not null default 'Fall 2026',
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (title, meeting_date)
);

create table if not exists public.projects (
  id text primary key default gen_random_uuid()::text,
  name text not null unique,
  description text not null default '',
  category text not null default 'Other',
  team_program text not null check (team_program in ('SMART-MINDS', 'B-SMART', 'BMINDS')),
  status text not null default 'Planned' check (status in ('Planned', 'Active', 'On Hold', 'Completed', 'Cancelled')),
  start_date date,
  target_end_date date,
  actual_end_date date,
  owner_student_id text references public.students(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (target_end_date is null or start_date is null or target_end_date >= start_date),
  check (actual_end_date is null or start_date is null or actual_end_date >= start_date)
);

create table if not exists public.project_members (
  id text primary key default gen_random_uuid()::text,
  project_id text not null references public.projects(id) on delete cascade,
  student_id text not null references public.students(id) on delete restrict,
  responsibility text not null default '',
  joined_at date not null default current_date,
  unique (project_id, student_id)
);

create table if not exists public.student_updates (
  id text primary key default gen_random_uuid()::text,
  student_id text not null references public.students(id) on delete restrict,
  meeting_id text not null references public.meetings(id) on delete restrict,
  category text not null check (category in ('Outreach', 'Education', 'Social Media', 'Research', 'Manuscript', 'Fundraising', 'Operations', 'Website', 'Other')),
  activity_type text not null default 'update' check (activity_type in ('update', 'completed', 'working_on', 'next_steps', 'question', 'support')),
  update_text text not null,
  status text not null default 'Update' check (status in ('Update', 'Completed', 'In Progress', 'Blocked', 'Planned')),
  project_id text references public.projects(id) on delete set null,
  source_record_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.mentor_responses (
  id text primary key default gen_random_uuid()::text,
  student_update_id text not null references public.student_updates(id) on delete cascade,
  message text not null,
  responded_at timestamptz not null default now(),
  resolution_status text not null default 'open' check (resolution_status in ('open', 'follow-up-needed', 'resolved')),
  follow_up_date date
);

create table if not exists public.tasks (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  description text not null default '',
  assigned_to_student_id text not null references public.students(id) on delete restrict,
  project_id text references public.projects(id) on delete set null,
  created_from_meeting_id text references public.meetings(id) on delete set null,
  category text not null check (category in ('Outreach', 'Education', 'Social Media', 'Research', 'Manuscript', 'Fundraising', 'Operations', 'Website', 'Other')),
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High', 'Urgent')),
  due_date date,
  status text not null default 'Not Started' check (status in ('Not Started', 'In Progress', 'Blocked', 'Completed', 'Cancelled')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  description text not null default '',
  event_type text not null check (event_type in ('Meeting', 'Outreach', 'Presentation', 'Collaboration', 'Tabling', 'PA Show', 'Fundraising', 'Deadline', 'Other')),
  event_date date not null,
  start_time time,
  end_time time,
  location text,
  project_id text references public.projects(id) on delete set null,
  status text not null default 'Planned' check (status in ('Planned', 'Confirmed', 'Completed', 'Cancelled')),
  created_at timestamptz not null default now(),
  check (end_time is null or start_time is null or end_time >= start_time)
);

create table if not exists public.event_participants (
  id text primary key default gen_random_uuid()::text,
  event_id text not null references public.events(id) on delete cascade,
  student_id text not null references public.students(id) on delete restrict,
  participant_role text not null default '',
  attendance_status text not null default 'Invited' check (attendance_status in ('Invited', 'Confirmed', 'Attended', 'Declined')),
  unique (event_id, student_id)
);

create table if not exists public.resources (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  resource_type text not null check (resource_type in ('Google Doc', 'Google Sheet', 'Google Form', 'Google Slides', 'Canva', 'Website', 'Instagram', 'TikTok', 'Drive Folder', 'Other')),
  url text,
  description text not null default '',
  project_id text references public.projects(id) on delete set null,
  meeting_id text references public.meetings(id) on delete set null,
  owner_student_id text references public.students(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.survey_campaigns (
  id text primary key default gen_random_uuid()::text,
  name text not null unique,
  description text not null default '',
  team_program text not null check (team_program in ('SMART-MINDS', 'B-SMART', 'BMINDS')),
  responder_url text,
  target_responses integer not null default 0 check (target_responses >= 0),
  current_responses integer not null default 0 check (current_responses >= 0),
  deadline date,
  status text not null default 'Planned' check (status in ('Planned', 'Active', 'Paused', 'Completed', 'Cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.survey_goals (
  id text primary key default gen_random_uuid()::text,
  survey_campaign_id text not null references public.survey_campaigns(id) on delete cascade,
  goal_date date not null,
  target_count integer not null check (target_count >= 0),
  actual_count integer not null default 0 check (actual_count >= 0),
  unique (survey_campaign_id, goal_date)
);

create table if not exists public.outreach_contacts (
  id text primary key default gen_random_uuid()::text,
  organization text not null,
  contact_name text not null,
  contact_type text not null check (contact_type in ('Professor', 'School', 'Student Organization', 'Community Organization', 'Company', 'Partner', 'Media', 'Other')),
  email text,
  phone text,
  notes text not null default '',
  current_status text not null default 'New' check (current_status in ('New', 'Contacted', 'Responded', 'Active', 'No Response', 'Closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.outreach_interactions (
  id text primary key default gen_random_uuid()::text,
  contact_id text not null references public.outreach_contacts(id) on delete cascade,
  student_id text not null references public.students(id) on delete restrict,
  interaction_date date not null,
  interaction_type text not null check (interaction_type in ('Email', 'Call', 'Meeting', 'Event', 'Message', 'Other')),
  notes text not null default '',
  outcome text not null default '',
  follow_up_date date,
  status text not null default 'Open' check (status in ('Open', 'Follow-up needed', 'Resolved', 'No response'))
);

create table if not exists public.manuscripts (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  research_question text not null default '',
  team_program text not null check (team_program in ('SMART-MINDS', 'B-SMART', 'BMINDS')),
  status text not null default 'Topic Selection' check (status in ('Topic Selection', 'Literature Review', 'Methods', 'Introduction', 'Data Analysis', 'Drafting', 'Review', 'Submitted', 'Published')),
  supervisor_student_id text references public.students(id) on delete set null,
  deadline date,
  created_at timestamptz not null default now()
);

create table if not exists public.manuscript_authors (
  id text primary key default gen_random_uuid()::text,
  manuscript_id text not null references public.manuscripts(id) on delete cascade,
  student_id text not null references public.students(id) on delete restrict,
  author_order integer not null check (author_order > 0),
  author_role text not null check (author_role in ('First Author', 'Second Author', 'Co-author', 'Corresponding Author')),
  unique (manuscript_id, student_id),
  unique (manuscript_id, author_order)
);

create table if not exists public.fundraisers (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  description text not null default '',
  event_id text references public.events(id) on delete set null,
  organizer_student_id text references public.students(id) on delete set null,
  fundraising_goal numeric(12, 2) check (fundraising_goal is null or fundraising_goal >= 0),
  amount_raised numeric(12, 2) check (amount_raised is null or amount_raised >= 0),
  status text not null default 'Planned' check (status in ('Planned', 'Active', 'Completed', 'Cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.social_media_content (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  platform text not null check (platform in ('Instagram', 'TikTok', 'LinkedIn', 'Website', 'Other')),
  content_type text not null default 'Post',
  assigned_to_student_id text not null references public.students(id) on delete restrict,
  project_id text references public.projects(id) on delete set null,
  due_date date,
  publish_date date,
  status text not null default 'Idea' check (status in ('Idea', 'Planned', 'Draft', 'Needs Approval', 'Scheduled', 'Posted')),
  external_url text,
  notes text not null default '',
  created_at timestamptz not null default now(),
  check (publish_date is null or due_date is null or publish_date >= due_date)
);

create index if not exists student_roles_student_idx on public.student_roles(student_id, is_current);
create index if not exists student_roles_role_idx on public.student_roles(role_id);
create index if not exists meetings_date_idx on public.meetings(meeting_date desc);
create index if not exists student_updates_student_meeting_idx on public.student_updates(student_id, meeting_id);
create index if not exists student_updates_category_status_idx on public.student_updates(category, status);
create index if not exists student_updates_project_idx on public.student_updates(project_id);
create index if not exists student_updates_source_idx on public.student_updates(source_record_id, activity_type);
create index if not exists mentor_responses_update_idx on public.mentor_responses(student_update_id);
create index if not exists tasks_assignee_status_idx on public.tasks(assigned_to_student_id, status);
create index if not exists tasks_project_due_idx on public.tasks(project_id, due_date);
create index if not exists tasks_category_priority_idx on public.tasks(category, priority);
create index if not exists project_members_student_idx on public.project_members(student_id);
create index if not exists project_members_project_idx on public.project_members(project_id);
create index if not exists events_date_status_idx on public.events(event_date, status);
create index if not exists event_participants_student_idx on public.event_participants(student_id);
create index if not exists resources_project_idx on public.resources(project_id);
create index if not exists resources_meeting_idx on public.resources(meeting_id);
create index if not exists survey_goals_campaign_date_idx on public.survey_goals(survey_campaign_id, goal_date);
create index if not exists outreach_interactions_contact_date_idx on public.outreach_interactions(contact_id, interaction_date desc);
create index if not exists outreach_interactions_student_idx on public.outreach_interactions(student_id);
create index if not exists manuscript_authors_student_idx on public.manuscript_authors(student_id);
create index if not exists social_content_assignee_status_idx on public.social_media_content(assigned_to_student_id, status);
create index if not exists social_content_project_idx on public.social_media_content(project_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists students_set_updated_at on public.students;
create trigger students_set_updated_at before update on public.students for each row execute function public.set_updated_at();
drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects for each row execute function public.set_updated_at();
drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at before update on public.tasks for each row execute function public.set_updated_at();
drop trigger if exists survey_campaigns_set_updated_at on public.survey_campaigns;
create trigger survey_campaigns_set_updated_at before update on public.survey_campaigns for each row execute function public.set_updated_at();

alter table public.students enable row level security;
alter table public.roles enable row level security;
alter table public.student_roles enable row level security;
alter table public.meetings enable row level security;
alter table public.student_updates enable row level security;
alter table public.mentor_responses enable row level security;
alter table public.tasks enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.resources enable row level security;
alter table public.survey_campaigns enable row level security;
alter table public.survey_goals enable row level security;
alter table public.outreach_contacts enable row level security;
alter table public.outreach_interactions enable row level security;
alter table public.manuscripts enable row level security;
alter table public.manuscript_authors enable row level security;
alter table public.fundraisers enable row level security;
alter table public.social_media_content enable row level security;

grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- Temporary open policies for local source import and review only.
-- Replace these with authenticated role policies before production use.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'students', 'roles', 'student_roles', 'meetings', 'student_updates', 'mentor_responses', 'tasks', 'projects',
    'project_members', 'events', 'event_participants', 'resources', 'survey_campaigns',
    'survey_goals', 'outreach_contacts', 'outreach_interactions', 'manuscripts',
    'manuscript_authors', 'fundraisers', 'social_media_content'
  ] loop
    execute format('drop policy if exists "Demo read %1$s" on public.%1$I', table_name);
    execute format('create policy "Demo read %1$s" on public.%1$I for select to anon, authenticated using (true)', table_name);
    execute format('drop policy if exists "Demo write %1$s" on public.%1$I', table_name);
    execute format('create policy "Demo write %1$s" on public.%1$I for all to anon, authenticated using (true) with check (true)', table_name);
  end loop;
end;
$$;

do $$
begin
  begin execute 'alter publication supabase_realtime add table public.students'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.student_updates'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.mentor_responses'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.tasks'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.projects'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.events'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.resources'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.survey_campaigns'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.survey_goals'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.outreach_contacts'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.outreach_interactions'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.manuscripts'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.fundraisers'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.social_media_content'; exception when duplicate_object then null; end;
end;
$$;
