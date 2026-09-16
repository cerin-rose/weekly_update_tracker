"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { getDisplayStatus } from "@/lib/display-status";
import { hasSupabaseConfig, loadDatabaseState, loadOperationsState, subscribeToDatabase, subscribeToOperations, type OperationsState } from "@/lib/supabase";
import type { MentorResponse, Student, UpdateStatus, WeeklyUpdate, Workstream } from "@/types";
import { StatusBadge } from "@/components/status-badge";
import { UpdateRecord } from "@/components/update-record";

const workstreamOptions: Array<"All workstreams" | Workstream> = ["All workstreams", "Research", "Education", "Outreach", "Communications", "Fundraising", "Manuscript", "Social Media", "Operations", "Website", "Other"];
const statusOptions: Array<"All statuses" | UpdateStatus> = ["All statuses", "on-track", "question", "needs-help", "blocked"];

function statusLabel(status: UpdateStatus) {
  return { "on-track": "On track", question: "Question", "needs-help": "Needs help", blocked: "Blocked" }[status];
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ProfileDataSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="profile-data-section"><h2>{title}</h2>{children}</section>;
}

function HistoryRow({ update, expanded, onToggle }: { update: WeeklyUpdate & { status: UpdateStatus; mentorResponse?: MentorResponse }; expanded: boolean; onToggle: () => void }) {
  return <>
    <tr className="history-row">
      <td><strong>{formatDate(update.meetingDate)}</strong><small>Submitted {new Date(update.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</small></td>
      <td><strong>{update.workstream}</strong></td>
      <td className="history-completed">{update.completed}</td>
      <td><StatusBadge status={update.status} /></td>
      <td><button className="history-toggle" type="button" aria-expanded={expanded} aria-label={`${expanded ? "Hide" : "Show"} details for ${formatDate(update.meetingDate)}`} onClick={onToggle}><ChevronDown size={17} aria-hidden="true" /></button></td>
    </tr>
    {expanded && <tr className="history-detail-row"><td colSpan={5}><UpdateRecord update={update} /></td></tr>}
  </>;
}

export function StudentProfile({ studentId }: { studentId: string }) {
  const [student, setStudent] = useState<Student | null>(null);
  const [updates, setUpdates] = useState<WeeklyUpdate[]>([]);
  const [mentorResponses, setMentorResponses] = useState<Record<string, MentorResponse>>({});
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [workstream, setWorkstream] = useState<"All workstreams" | Workstream>("All workstreams");
  const [status, setStatus] = useState<"All statuses" | UpdateStatus>("All statuses");
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [operations, setOperations] = useState<OperationsState | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function refreshData() {
      if (hasSupabaseConfig) {
        try {
          const [remote, operational] = await Promise.all([loadDatabaseState(), loadOperationsState()]);
          if (!cancelled && remote && operational) {
            setStudent(remote.students.find((candidate) => candidate.id === studentId) ?? null);
            setUpdates(remote.updates.filter((update) => update.studentId === studentId));
            setMentorResponses(remote.mentorResponses);
            setOperations(operational);
          }
        } catch (error) {
          console.error("Unable to load Supabase profile data", error);
        }
        return;
      }

      setStudent(null);
      setUpdates([]);
    }

    void refreshData();
    if (!hasSupabaseConfig) return;
    const unsubscribe = subscribeToDatabase(() => void refreshData());
    const unsubscribeOperations = subscribeToOperations(() => void refreshData());
    return () => {
      cancelled = true;
      unsubscribe();
      unsubscribeOperations();
    };
  }, [studentId]);

  if (!student) return <main className="page-frame profile-page"><p className="empty-state">Student data is not available from Supabase.</p></main>;

  const history = updates.map((update) => {
    const response = mentorResponses[update.id] ?? update.mentorResponse;
    return { ...update, status: getDisplayStatus(update), mentorResponse: response };
  }).sort((a, b) => b.meetingDate.localeCompare(a.meetingDate) || b.submittedAt.localeCompare(a.submittedAt));
  const visibleHistory = history.filter((update) => (!fromDate || update.meetingDate >= fromDate) && (!toDate || update.meetingDate <= toDate) && (workstream === "All workstreams" || update.workstream === workstream) && (status === "All statuses" || update.status === status));
  const latest = history[0];
  const studentTasks = operations?.tasks.filter((task) => task.assigned_to_student_id === student.id && !["Completed", "Cancelled"].includes(task.status)) ?? [];
  const studentProjects = operations?.projects.filter((project) => project.owner_student_id === student.id || operations.projectMembers.some((member) => member.project_id === project.id && member.student_id === student.id)) ?? [];
  const upcomingEvents = operations?.events.filter((event) => event.event_date >= new Date().toISOString().slice(0, 10) && (operations.eventParticipants.some((participant) => participant.event_id === event.id && participant.student_id === student.id) || operations.projectMembers.some((member) => member.project_id === event.project_id && member.student_id === student.id))) ?? [];
  const outreachActivity = operations?.outreachInteractions.filter((interaction) => interaction.student_id === student.id).slice(0, 5) ?? [];
  const manuscripts = operations?.manuscripts.filter((manuscript) => manuscript.supervisor_student_id === student.id || operations.manuscriptAuthors.some((author) => author.manuscript_id === manuscript.id && author.student_id === student.id)) ?? [];
  const socialContent = operations?.socialMediaContent.filter((content) => content.assigned_to_student_id === student.id) ?? [];
  const resources = operations?.resources.filter((resource) => resource.owner_student_id === student.id) ?? [];

  return <main className="page-frame profile-page">
     <div className="profile-hero"><span className="initials-avatar hero">{student.initials}</span><div className="profile-hero-copy"><h1>{student.name}</h1><div className="profile-meta"><span>{student.leadershipRole} · {student.programAffiliation} / {student.primaryWorkstream}</span></div></div><StatusBadge status={latest?.status ?? "on-track"} /></div>
     <section className="profile-focus"><div><p className="section-kicker">Current focus</p><p>{student.currentFocus}</p></div><Link className="profile-action" href="/submit">Submit update</Link></section>
     <div className="profile-data-grid">
       <ProfileDataSection title="Current tasks">{studentTasks.length ? <ul>{studentTasks.slice(0, 5).map((task) => <li key={task.id}><strong>{task.title}</strong><small>{task.status} · {task.due_date ? formatDate(task.due_date) : "No due date"}</small></li>)}</ul> : <p className="empty-state">No current tasks.</p>}</ProfileDataSection>
       <ProfileDataSection title="Current projects">{studentProjects.length ? <ul>{studentProjects.map((project) => <li key={project.id}><strong>{project.name}</strong><small>{project.status} · {project.team_program}</small></li>)}</ul> : <p className="empty-state">No current projects.</p>}</ProfileDataSection>
       <ProfileDataSection title="Upcoming events">{upcomingEvents.length ? <ul>{upcomingEvents.map((event) => <li key={event.id}><strong>{event.name}</strong><small>{formatDate(event.event_date)} · {event.event_type}</small></li>)}</ul> : <p className="empty-state">No upcoming events.</p>}</ProfileDataSection>
       <ProfileDataSection title="Outreach activity">{outreachActivity.length ? <ul>{outreachActivity.map((interaction) => <li key={interaction.id}><strong>{interaction.interaction_type}</strong><small>{formatDate(interaction.interaction_date)} · {interaction.status}</small></li>)}</ul> : <p className="empty-state">No outreach activity.</p>}</ProfileDataSection>
       <ProfileDataSection title="Manuscript work">{manuscripts.length ? <ul>{manuscripts.map((manuscript) => <li key={manuscript.id}><strong>{manuscript.title}</strong><small>{manuscript.status}</small></li>)}</ul> : <p className="empty-state">No manuscript work.</p>}</ProfileDataSection>
       <ProfileDataSection title="Social media contributions">{socialContent.length ? <ul>{socialContent.map((content) => <li key={content.id}><strong>{content.title}</strong><small>{content.platform} · {content.status}</small></li>)}</ul> : <p className="empty-state">No social media contributions.</p>}</ProfileDataSection>
       <ProfileDataSection title="Resources">{resources.length ? <ul>{resources.map((resource) => <li key={resource.id}><strong>{resource.title}</strong><small>{resource.resource_type}</small></li>)}</ul> : <p className="empty-state">No owned resources.</p>}</ProfileDataSection>
     </div>
     <section className="profile-history"><div className="history-heading"><div><h2>Contribution history</h2></div><span>{visibleHistory.length} shown</span></div><div className="history-filters"><label><span>From date</span><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label><label><span>To date</span><input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label><label><span>Workstream</span><select value={workstream} onChange={(event) => setWorkstream(event.target.value as "All workstreams" | Workstream)}>{workstreamOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value as "All statuses" | UpdateStatus)}>{statusOptions.map((option) => <option key={option} value={option}>{option === "All statuses" ? option : statusLabel(option)}</option>)}</select></label></div>{visibleHistory.length ? <div className="history-table-wrap"><table className="history-table"><caption className="sr-only">Contribution history for {student.name}</caption><thead><tr><th scope="col">Date</th><th scope="col">Workstream</th><th scope="col">Completed</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Details</span></th></tr></thead><tbody>{visibleHistory.map((update) => <HistoryRow key={update.id} update={update} expanded={expandedHistoryId === update.id} onToggle={() => setExpandedHistoryId((current) => current === update.id ? null : update.id)} />)}</tbody></table></div> : <p className="empty-state">No contribution history matches these filters.</p>}</section>
  </main>;
}
