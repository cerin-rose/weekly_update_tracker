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

export function StudentProfile({ studentId = "sofia-nguyen" }: { studentId?: string }) {
  const student = getStudent(studentId);
  const [updates, setUpdates] = useState<WeeklyUpdate[]>(weeklyUpdates.filter((update) => update.studentId === student.id));
  const [mentorResponses, setMentorResponses] = useState<Record<string, MentorResponse>>({});
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [workstream, setWorkstream] = useState<"All workstreams" | Workstream>("All workstreams");
  const [status, setStatus] = useState<"All statuses" | UpdateStatus>("All statuses");
  const [showFilters, setShowFilters] = useState(false);

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
     <section className="profile-history"><div className="history-heading"><h2>Weekly record</h2><div className="history-tools"><span>{visibleHistory.length} {visibleHistory.length === 1 ? "entry" : "entries"}</span><button className="filter-toggle" type="button" aria-expanded={showFilters} onClick={() => setShowFilters((current) => !current)}>{showFilters ? "Hide filters" : "Filter history"}</button></div></div>{showFilters && <div className="history-filters"><label><span>From date</span><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label><label><span>To date</span><input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label><label><span>Workstream</span><select value={workstream} onChange={(event) => setWorkstream(event.target.value as "All workstreams" | Workstream)}>{workstreamOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value as "All statuses" | UpdateStatus)}>{statusOptions.map((option) => <option key={option} value={option}>{option === "All statuses" ? option : statusLabel(option)}</option>)}</select></label></div>}{visibleHistory.length ? visibleHistory.map((update, index) => <details className="history-entry" key={update.id} open={index === 0}><summary><span><strong>{new Date(`${update.meetingDate}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</strong><small>{update.workstream} · {statusLabel(update.status)}</small></span><ChevronDown size={17} /></summary><UpdateRecord update={update} /></details>) : <p className="empty-state">No contribution history matches these filters.</p>}</section>
  </main>;
}
