"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getStudent, weeklyUpdates } from "@/data/mock-data";
import { getDisplayStatus } from "@/lib/display-status";
import { loadMentorResponses, loadStoredUpdates } from "@/lib/update-storage";
import type { MentorResponse, UpdateStatus, WeeklyUpdate, Workstream } from "@/types";
import { StatusBadge } from "@/components/status-badge";
import { UpdateRecord } from "@/components/update-record";

const workstreamOptions: Array<"All workstreams" | Workstream> = ["All workstreams", "Research", "Education", "Outreach", "Communications", "Fundraising", "Manuscript", "Social Media"];
const statusOptions: Array<"All statuses" | UpdateStatus> = ["All statuses", "on-track", "question", "needs-help", "blocked"];

function statusLabel(status: UpdateStatus) {
  return { "on-track": "On track", question: "Question", "needs-help": "Needs help", blocked: "Blocked" }[status];
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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

export function StudentProfile({ studentId = "sofia-nguyen" }: { studentId?: string }) {
  const student = getStudent(studentId);
  const [updates, setUpdates] = useState<WeeklyUpdate[]>(weeklyUpdates.filter((update) => update.studentId === student.id));
  const [mentorResponses, setMentorResponses] = useState<Record<string, MentorResponse>>({});
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [workstream, setWorkstream] = useState<"All workstreams" | Workstream>("All workstreams");
  const [status, setStatus] = useState<"All statuses" | UpdateStatus>("All statuses");
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setUpdates([...weeklyUpdates.filter((update) => update.studentId === student.id), ...loadStoredUpdates().filter((update) => update.studentId === student.id)]);
      setMentorResponses(loadMentorResponses());
    }, 0);
    return () => window.clearTimeout(timer);
  }, [student.id]);

  const history = updates.map((update) => {
    const response = mentorResponses[update.id] ?? update.mentorResponse;
    return { ...update, status: getDisplayStatus(update), mentorResponse: response };
  }).sort((a, b) => b.meetingDate.localeCompare(a.meetingDate) || b.submittedAt.localeCompare(a.submittedAt));
  const visibleHistory = history.filter((update) => (!fromDate || update.meetingDate >= fromDate) && (!toDate || update.meetingDate <= toDate) && (workstream === "All workstreams" || update.workstream === workstream) && (status === "All statuses" || update.status === status));
  const latest = history[0];

  return <main className="page-frame profile-page">
     <div className="profile-hero"><span className="initials-avatar hero">{student.initials}</span><div className="profile-hero-copy"><h1>{student.name}</h1><div className="profile-meta"><span>{student.leadershipRole} · {student.programAffiliation} / {student.primaryWorkstream}</span></div></div><StatusBadge status={latest?.status ?? "on-track"} /></div>
     <section className="profile-focus"><div><p className="section-kicker">Current focus</p><p>{student.currentFocus}</p></div><Link className="profile-action" href="/submit">Submit update</Link></section>
     <section className="profile-history"><div className="history-heading"><div><h2>Contribution history</h2></div><span>{visibleHistory.length} shown</span></div><div className="history-filters"><label><span>From date</span><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label><label><span>To date</span><input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label><label><span>Workstream</span><select value={workstream} onChange={(event) => setWorkstream(event.target.value as "All workstreams" | Workstream)}>{workstreamOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value as "All statuses" | UpdateStatus)}>{statusOptions.map((option) => <option key={option} value={option}>{option === "All statuses" ? option : statusLabel(option)}</option>)}</select></label></div>{visibleHistory.length ? <div className="history-table-wrap"><table className="history-table"><caption className="sr-only">Contribution history for {student.name}</caption><thead><tr><th scope="col">Date</th><th scope="col">Workstream</th><th scope="col">Completed</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Details</span></th></tr></thead><tbody>{visibleHistory.map((update) => <HistoryRow key={update.id} update={update} expanded={expandedHistoryId === update.id} onToggle={() => setExpandedHistoryId((current) => current === update.id ? null : update.id)} />)}</tbody></table></div> : <p className="empty-state">No contribution history matches these filters.</p>}</section>
  </main>;
}
