"use client";

import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useState } from "react";
import { getDisplayStatus } from "@/lib/display-status";
import { loadGoogleSheetState } from "@/lib/google-sheets";
import type { Student, UpdateStatus, WeeklyUpdate, Workstream } from "@/types";
import { StatusBadge } from "@/components/status-badge";

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

function sourceLink(update: WeeklyUpdate) {
  return [update.sourceDocument, ...update.resourceLinks].join(" ").match(/https?:\/\/[^\s|]+/i)?.[0] ?? "";
}

function cellValue(value: string) {
  return value.trim() || "-";
}

function contributionText(update: WeeklyUpdate) {
  return update.completed || update.workingOn || update.nextSteps || update.task || "No contribution summary";
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

  if (loading) return <main className="page-frame profile-page"><p className="loading-state">Loading profile…</p></main>;
  if (error) return <main className="page-frame profile-page"><div className="notice notice-error" role="alert"><div><strong>Student history could not be loaded.</strong><p>{error}</p></div><button className="button button-secondary" type="button" onClick={() => void refreshData()}><RefreshCw size={15} /> Retry</button></div></main>;
  if (!student) return <main className="page-frame profile-page"><div className="notice notice-error"><div><strong>This student is not in the current roster.</strong><p>Student profiles use only canonical names returned by Google Sheets.</p></div><Link className="button button-secondary" href="/students">Back to directory</Link></div></main>;

  const history = updates.map((update) => ({ ...update, status: getDisplayStatus(update) })).sort((a, b) => b.meetingDate.localeCompare(a.meetingDate) || b.submittedAt.localeCompare(a.submittedAt));
  const visibleHistory = history.filter((update) => (!fromDate || update.meetingDate >= fromDate) && (!toDate || update.meetingDate <= toDate) && (workstream === "All workstreams" || update.workstream === workstream) && (status === "All statuses" || update.status === status));
  const currentFocus = student.currentFocus === "No current focus submitted." ? "" : student.currentFocus;

  return <main className="page-frame profile-page">
    <header className="profile-titlebar"><Link className="profile-back-link" href="/students"><ArrowLeft size={15} /> Students</Link><div className="profile-identity"><span className="owner-mark owner-mark-large">{student.initials}</span><div><h1>{student.name}</h1><p>{student.programAffiliation} · {student.leadershipRole}</p></div></div></header>
    {currentFocus && <section className="profile-focus"><strong>Current focus</strong><p>{currentFocus}</p></section>}
    <section className="history-section"><div className="section-heading"><div><p className="eyebrow">Portfolio</p><h2>Contributions</h2></div><span className="result-count">{visibleHistory.length} shown</span></div><div className="history-filters"><label><span>From date</span><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label><label><span>To date</span><input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label><label><span>Workstream</span><select value={workstream} onChange={(event) => setWorkstream(event.target.value as typeof workstream)}>{workstreamOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>{statusOptions.map((option) => <option key={option} value={option}>{option === "All statuses" ? option : statusLabel(option)}</option>)}</select></label></div>{visibleHistory.length ? <div className="profile-table-wrap"><table className="profile-contribution-table"><caption className="sr-only">All contributions for {student.name}</caption><thead><tr><th scope="col">Date</th><th scope="col">Workstream</th><th scope="col">Contribution / outcome</th><th scope="col">Current work</th><th scope="col">Next step</th><th scope="col">Status</th></tr></thead><tbody>{visibleHistory.map((update) => { const link = sourceLink(update); const expanded = expandedHistoryId === update.id; return <Fragment key={update.id}><tr className={expanded ? "profile-row-expanded" : undefined}><td>{formatDate(update.meetingDate)}</td><td className="profile-table-workstream">{cellValue(update.workstream)}</td><td><button className="profile-row-summary" type="button" aria-expanded={expanded} onClick={() => setExpandedHistoryId((current) => current === update.id ? null : update.id)}><strong>{contributionText(update)}</strong><small>{expanded ? "Hide details" : "View details"}</small></button></td><td>{cellValue(update.workingOn)}</td><td>{cellValue(update.nextSteps || update.task)}</td><td><StatusBadge status={update.status} />{update.taskStatus && <small className="profile-table-subtext">Task: {update.taskStatus}</small>}</td></tr>{expanded && <tr className="profile-detail-row"><td colSpan={6}><div className="profile-detail-grid"><div><strong>Deadline / meeting</strong><span>{cellValue(update.event)}</span></div><div><strong>Questions / support</strong><span>{cellValue([update.questionForDrLina, update.supportNeeded].filter(Boolean).join(" · "))}</span></div><div><strong>Notes / collaborators</strong><span>{cellValue([update.meetingNotes, update.collaborators.length ? `Collaborators: ${update.collaborators.join("; ")}` : ""].filter(Boolean).join(" · "))}</span></div><div><strong>Feedback</strong><span>{cellValue(update.attributionNote)}</span></div><div><strong>Source record</strong><span>{cellValue(update.sourceRecordId)}</span></div><div><strong>Source</strong><span>{link ? <a className="table-source" href={link} target="_blank" rel="noreferrer">Open source ↗</a> : "-"}</span></div></div></td></tr>}</Fragment>; })}</tbody></table></div> : <p className="empty-state">No contributions match these filters.</p>}</section>
  </main>;
}
