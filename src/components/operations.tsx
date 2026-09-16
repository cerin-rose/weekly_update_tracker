"use client";

import { useEffect, useMemo, useState } from "react";
import { hasSupabaseConfig, loadOperationsState, subscribeToOperations, updateRemoteTaskStatus, type OperationsState } from "@/lib/supabase";
import type { Student } from "@/types";
import type { TaskRow } from "@/types/database";

type OperationsTab = "tasks" | "projects" | "outreach" | "surveys" | "calendar";

const emptyState: OperationsState = {
  students: [], tasks: [], projects: [], projectMembers: [], meetings: [], studentUpdates: [], events: [], eventParticipants: [], resources: [], outreachContacts: [], outreachInteractions: [], surveyCampaigns: [], surveyGoals: [], manuscripts: [], manuscriptAuthors: [], fundraisers: [], socialMediaContent: [],
};
const taskStatuses: TaskRow["status"][] = ["Not Started", "In Progress", "Blocked", "Completed"];
const allTaskStatuses: TaskRow["status"][] = [...taskStatuses, "Cancelled"];
const taskCategories = ["All categories", "Outreach", "Education", "Social Media", "Research", "Manuscript", "Fundraising", "Operations", "Website", "Other"];
const taskPriorities = ["All priorities", "Low", "Medium", "High", "Urgent"];

function formatDate(value: string | null) {
  if (!value) return "No date";
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function studentName(studentId: string, students: Student[]) {
  return students.find((student) => student.id === studentId)?.name ?? "Unassigned student";
}

function projectName(projectId: string | null, projects: OperationsState["projects"]) {
  return projects.find((project) => project.id === projectId)?.name ?? "No project";
}

function TaskCard({ task, students, projects, onStatusChange }: { task: TaskRow; students: Student[]; projects: OperationsState["projects"]; onStatusChange: (status: TaskRow["status"]) => void }) {
  return <article className="operation-task"><div><strong>{task.title}</strong><p>{task.description || `${task.category} task`}</p></div><div className="operation-task-meta"><span>{studentName(task.assigned_to_student_id, students)}</span><span>{projectName(task.project_id, projects)}</span><span className={`task-priority task-priority-${task.priority.toLowerCase()}`}>{task.priority}</span><span>{formatDate(task.due_date)}</span></div><label className="task-status-control"><span>Status</span><select value={task.status} disabled={!hasSupabaseConfig} onChange={(event) => onStatusChange(event.target.value as TaskRow["status"])}>{allTaskStatuses.map((status) => <option key={status}>{status}</option>)}</select></label></article>;
}

export function Operations() {
  const [activeTab, setActiveTab] = useState<OperationsTab>("tasks");
  const [data, setData] = useState<OperationsState>(emptyState);
  const [loading, setLoading] = useState(hasSupabaseConfig);
  const [error, setError] = useState("");
  const [taskStudent, setTaskStudent] = useState("All students");
  const [taskCategory, setTaskCategory] = useState("All categories");
  const [taskProject, setTaskProject] = useState("All projects");
  const [taskPriority, setTaskPriority] = useState("All priorities");
  const [taskDueDate, setTaskDueDate] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      if (!hasSupabaseConfig) return;
      try {
        const remote = await loadOperationsState();
        if (!cancelled && remote) { setData(remote); setError(""); }
      } catch (loadError) {
        console.error("Unable to load operations data", loadError);
        if (!cancelled) setError("The operations data could not be loaded.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void refresh();
    if (!hasSupabaseConfig) return () => undefined;
    const unsubscribe = subscribeToOperations(() => void refresh());
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  const filteredTasks = useMemo(() => data.tasks.filter((task) => (taskStudent === "All students" || task.assigned_to_student_id === taskStudent) && (taskCategory === "All categories" || task.category === taskCategory) && (taskProject === "All projects" || task.project_id === taskProject) && (taskPriority === "All priorities" || task.priority === taskPriority) && (!taskDueDate || (task.due_date !== null && task.due_date <= taskDueDate))), [data.tasks, taskCategory, taskDueDate, taskPriority, taskProject, taskStudent]);

  async function changeTaskStatus(taskId: string, status: TaskRow["status"]) {
    try {
      await updateRemoteTaskStatus(taskId, status);
      setData((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === taskId ? { ...task, status, completed_at: status === "Completed" ? new Date().toISOString() : null } : task) }));
    } catch (updateError) {
      console.error("Unable to update task status", updateError);
      setError("The task status could not be updated.");
    }
  }

  const nextMilestone = (campaignId: string) => data.surveyGoals.filter((goal) => goal.survey_campaign_id === campaignId).find((goal) => goal.goal_date >= new Date().toISOString().slice(0, 10));

  return <main className="page-frame operations-page">
    <div className="page-intro"><p className="eyebrow">SMART-MINDS operations</p><h1>Operations</h1><p className="page-description">Track people, work, relationships, and milestones in one shared workspace.</p></div>
    {!hasSupabaseConfig && <div className="database-notice"><strong>Supabase is not connected.</strong><span>Run the migration, seed the database, and add the variables from <code>.env.example</code> to load shared records.</span></div>}
    {error && <p className="save-message" role="alert">{error}</p>}
    {loading ? <p className="empty-state">Loading operations data...</p> : <>
      <div className="operations-tabs" role="tablist" aria-label="Operations views">{([ ["tasks", "Task board"], ["projects", "Projects"], ["outreach", "Outreach CRM"], ["surveys", "Surveys"], ["calendar", "Calendar"] ] as const).map(([id, label]) => <button key={id} className={activeTab === id ? "active" : ""} role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)}>{label}</button>)}</div>
       {activeTab === "tasks" && <section className="operations-panel" role="tabpanel"><div className="operations-filters"><label><span>Student</span><select value={taskStudent} onChange={(event) => setTaskStudent(event.target.value)}><option>All students</option>{data.students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></label><label><span>Category</span><select value={taskCategory} onChange={(event) => setTaskCategory(event.target.value)}>{taskCategories.map((category) => <option key={category}>{category}</option>)}</select></label><label><span>Project</span><select value={taskProject} onChange={(event) => setTaskProject(event.target.value)}><option>All projects</option>{data.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label><label><span>Priority</span><select value={taskPriority} onChange={(event) => setTaskPriority(event.target.value)}>{taskPriorities.map((priority) => <option key={priority}>{priority}</option>)}</select></label><label><span>Due by</span><input type="date" value={taskDueDate} onChange={(event) => setTaskDueDate(event.target.value)} /></label></div><div className="task-board">{taskStatuses.map((status) => <section className="task-column" key={status}><div className="task-column-heading"><h2>{status}</h2><span>{filteredTasks.filter((task) => task.status === status).length}</span></div>{filteredTasks.filter((task) => task.status === status).map((task) => <TaskCard key={task.id} task={task} students={data.students} projects={data.projects} onStatusChange={(nextStatus) => void changeTaskStatus(task.id, nextStatus)} />)}</section>)}</div>{!data.tasks.length && <p className="empty-state">No tasks are loaded yet.</p>}</section>}
       {activeTab === "projects" && <section className="operations-panel" role="tabpanel"><div className="operations-section-heading"><h2>Projects</h2><span>{data.projects.length} records</span></div><div className="operations-table"><div className="operations-table-header"><span>Project</span><span>Team</span><span>Owner</span><span>Members</span><span>Work</span><span>Status</span></div>{data.projects.map((project) => <div className="operations-table-row" key={project.id}><strong>{project.name}</strong><span>{project.team_program}</span><span>{project.owner_student_id ? studentName(project.owner_student_id, data.students) : "No owner"}</span><span>{data.projectMembers.filter((member) => member.project_id === project.id).length}</span><span>{data.tasks.filter((task) => task.project_id === project.id).length} tasks · {data.studentUpdates.filter((update) => update.project_id === project.id).length} updates · {data.events.filter((event) => event.project_id === project.id).length} events · {data.resources.filter((resource) => resource.project_id === project.id).length} resources</span><span>{project.status}</span></div>)}{!data.projects.length && <p className="empty-state">No projects are loaded yet.</p>}</div></section>}
       {activeTab === "outreach" && <section className="operations-panel" role="tabpanel"><div className="operations-section-heading"><h2>Outreach relationships</h2><span>{data.outreachContacts.length} contacts</span></div><div className="operations-table"><div className="operations-table-header"><span>Organization</span><span>Contact</span><span>Last contacted</span><span>Contacted by</span><span>Status</span><span>Follow-up</span></div>{data.outreachContacts.map((contact) => { const interactions = data.outreachInteractions.filter((interaction) => interaction.contact_id === contact.id).sort((a, b) => b.interaction_date.localeCompare(a.interaction_date)); const latest = interactions[0]; return <div className="operations-table-row" key={contact.id}><strong>{contact.organization}</strong><span>{contact.contact_name}</span><span>{formatDate(latest?.interaction_date ?? null)}</span><span>{latest ? studentName(latest.student_id, data.students) : "Not contacted"}</span><span>{contact.current_status}</span><span>{formatDate(latest?.follow_up_date ?? null)}</span></div>; })}{!data.outreachContacts.length && <p className="empty-state">No outreach contacts are loaded yet.</p>}</div></section>}
      {activeTab === "surveys" && <section className="operations-panel" role="tabpanel"><div className="operations-section-heading"><h2>Survey campaigns</h2><span>{data.surveyCampaigns.length} campaigns</span></div><div className="survey-grid">{data.surveyCampaigns.map((campaign) => { const milestone = nextMilestone(campaign.id); const progress = campaign.target_responses ? Math.min(100, Math.round((campaign.current_responses / campaign.target_responses) * 100)) : 0; return <article className="survey-card" key={campaign.id}><div><h3>{campaign.name}</h3><p>{campaign.description}</p></div><strong>{campaign.current_responses} / {campaign.target_responses}</strong><div className="survey-progress"><span style={{ width: `${progress}%` }} /></div><small>{progress}% complete · {milestone ? `Next target ${milestone.target_count} by ${formatDate(milestone.goal_date)}` : "All milestones reached"}</small><div className="survey-milestones">{data.surveyGoals.filter((goal) => goal.survey_campaign_id === campaign.id).map((goal) => <span key={goal.id}>{formatDate(goal.goal_date)} · {goal.target_count}</span>)}</div></article>; })}{!data.surveyCampaigns.length && <p className="empty-state">No survey campaigns are loaded yet.</p>}</div></section>}
      {activeTab === "calendar" && <section className="operations-panel" role="tabpanel"><div className="operations-section-heading"><h2>Calendar</h2><span>{data.meetings.length + data.events.length} entries</span></div><div className="operations-table"><div className="operations-table-header"><span>Date</span><span>Name</span><span>Type</span><span>Location</span><span>Project</span><span>Status</span></div>{data.meetings.map((meeting) => <div className="operations-table-row" key={meeting.id}><strong>{formatDate(meeting.meeting_date)}</strong><span>{meeting.title}</span><span>Meeting</span><span>Not set</span><span>Not linked</span><span>Scheduled</span></div>)}{data.events.map((event) => <div className="operations-table-row" key={event.id}><strong>{formatDate(event.event_date)}</strong><span>{event.name}</span><span>{event.event_type}</span><span>{event.location ?? "Not set"}</span><span>{projectName(event.project_id, data.projects)}</span><span>{event.status}</span></div>)}{!data.meetings.length && !data.events.length && <p className="empty-state">No meetings or events are loaded yet.</p>}</div></section>}
    </>}
  </main>;
}
