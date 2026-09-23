"use client";

import { ArrowLeft, ArrowRight, ChevronDown, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getDisplayStatus } from "@/lib/display-status";
import { loadGoogleSheetState } from "@/lib/google-sheets";
import type { Student, UpdateStatus, WeeklyUpdate, Workstream } from "@/types";
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

function profileIdMatches(student: Student, requestedId: string) {
  const nameSlug = student.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return student.id === requestedId || requestedId === `sheet-student-${nameSlug}` || requestedId === `student-${nameSlug}`;
}

function HistoryEntry({ update, expanded, onToggle }: { update: WeeklyUpdate & { status: UpdateStatus }; expanded: boolean; onToggle: () => void }) {
  return <article className="history-entry">
    <button className="history-entry-header" type="button" aria-expanded={expanded} onClick={onToggle}><span><strong>{formatDate(update.meetingDate)}</strong><small>{update.workstream} · {update.completed || update.nextSteps || "No update summary"}</small></span><span className="history-entry-meta"><StatusBadge status={update.status} /><ChevronDown size={18} aria-hidden="true" /></span></button>
    {expanded && <div className="history-entry-detail"><UpdateRecord update={update} /></div>}
  </article>;
}

export function StudentProfile({ studentId }: { studentId: string }) {
  const [student, setStudent] = useState<Student | null>(null);
  const [updates, setUpdates] = useState<WeeklyUpdate[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [workstream, setWorkstream] = useState<"All workstreams" | Workstream>("All workstreams");
  const [status, setStatus] = useState<"All statuses" | UpdateStatus>("All statuses");
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const remote = await loadGoogleSheetState();
      const profileStudent = remote.students.find((candidate) => profileIdMatches(candidate, studentId)) ?? null;
      setStudent(profileStudent);
      setUpdates(profileStudent ? remote.updates.filter((update) => update.studentId === profileStudent.id) : []);
    } catch (loadError) {
      console.error("Unable to load Google Sheet profile data", loadError);
      setError(loadError instanceof Error ? loadError.message : "The Google Sheets source could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refreshData(), 0);
    const refreshTimer = window.setInterval(() => void refreshData(), 60_000);
    return () => { window.clearTimeout(initialRefresh); window.clearInterval(refreshTimer); };
  }, [refreshData]);

  if (loading) return <main className="page-frame profile-page"><p className="loading-state">Loading student history from Google Sheets…</p></main>;
  if (error) return <main className="page-frame profile-page"><div className="notice notice-error" role="alert"><div><strong>Student history could not be loaded.</strong><p>{error}</p></div><button className="button button-secondary" type="button" onClick={() => void refreshData()}><RefreshCw size={15} /> Retry</button></div></main>;
  if (!student) return <main className="page-frame profile-page"><div className="notice notice-error"><div><strong>This student is not in the current roster.</strong><p>Student profiles use only canonical names returned by Google Sheets.</p></div><Link className="button button-secondary" href="/#student-directory">Back to directory</Link></div></main>;

  const history = updates.map((update) => ({ ...update, status: getDisplayStatus(update) })).sort((a, b) => b.meetingDate.localeCompare(a.meetingDate) || b.submittedAt.localeCompare(a.submittedAt));
  const visibleHistory = history.filter((update) => (!fromDate || update.meetingDate >= fromDate) && (!toDate || update.meetingDate <= toDate) && (workstream === "All workstreams" || update.workstream === workstream) && (status === "All statuses" || update.status === status));
  const latest = history[0];
  const questions = history.filter((update) => update.questionForDrLina || update.supportNeeded);
  const openTasks = history.filter((update) => update.task && update.taskStatus.toLowerCase() !== "completed");

  return <main className="page-frame profile-page">
    <Link className="back-link" href="/#student-directory"><ArrowLeft size={15} /> Student directory</Link>
    <header className="profile-header"><div className="profile-identity"><span className="owner-mark owner-mark-large">{student.initials}</span><div><p className="eyebrow">Student profile</p><h1>{student.name}</h1><p>{student.programAffiliation} · {student.leadershipRole}</p></div></div><div className="profile-latest">{latest && <><span>Latest status</span><StatusBadge status={latest.status} /></>}</div></header>
    <section className="profile-focus"><div><p className="eyebrow">Current focus</p><p>{student.currentFocus}</p></div><Link className="button button-secondary" href="/records">View all records <ArrowRight size={15} /></Link></section>
    <div className="profile-overview"><section><div className="section-heading"><div><p className="eyebrow">Questions and support</p><h2>Items to discuss</h2></div><span className="result-count">{questions.length}</span></div>{questions.length ? <ul className="simple-list">{questions.slice(0, 5).map((update) => <li key={update.id}><strong>{formatDate(update.meetingDate)}</strong><span>{update.questionForDrLina || update.supportNeeded}</span></li>)}</ul> : <p className="muted">No questions or support requests recorded.</p>}</section><section><div className="section-heading"><div><p className="eyebrow">Tasks</p><h2>Open work</h2></div><span className="result-count">{openTasks.length}</span></div>{openTasks.length ? <ul className="simple-list">{openTasks.slice(0, 5).map((update) => <li key={update.id}><strong>{update.taskStatus || "Open"}</strong><span>{update.task}</span></li>)}</ul> : <p className="muted">No open tasks recorded.</p>}</section></div>
    <section className="history-section"><div className="section-heading"><div><p className="eyebrow">From Google Sheets</p><h2>Contribution history</h2></div><span className="result-count">{visibleHistory.length} shown</span></div><div className="history-filters"><label><span>From date</span><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label><label><span>To date</span><input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label><label><span>Workstream</span><select value={workstream} onChange={(event) => setWorkstream(event.target.value as typeof workstream)}>{workstreamOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>{statusOptions.map((option) => <option key={option} value={option}>{option === "All statuses" ? option : statusLabel(option)}</option>)}</select></label></div>{visibleHistory.length ? <div className="history-list">{visibleHistory.map((update) => <HistoryEntry key={update.id} update={update} expanded={expandedHistoryId === update.id} onToggle={() => setExpandedHistoryId((current) => current === update.id ? null : update.id)} />)}</div> : <p className="empty-state">No contribution history matches these filters.</p>}</section>
  </main>;
}
