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
const editableStatusOptions: UpdateStatus[] = ["on-track", "question", "needs-help", "blocked"];

type EditableDraft = { task: string; status: UpdateStatus; notes: string; feedback: string };
type SaveState = "idle" | "saving" | "saved" | "error";

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

function draftFor(update: WeeklyUpdate): EditableDraft {
  return { task: update.task, status: update.status, notes: update.meetingNotes, feedback: update.attributionNote };
}

function EditableDetailGrid({ update, draft, link, saveState, onDraftChange, onAutosave }: { update: WeeklyUpdate; draft: EditableDraft; link: string; saveState: SaveState; onDraftChange: (changes: Partial<EditableDraft>) => void; onAutosave: (changes: Partial<EditableDraft>) => void }) {
  return <div className="profile-detail-grid">
    <div className="profile-edit-field"><label htmlFor={`task-${update.id}`}>Task</label><textarea id={`task-${update.id}`} value={draft.task} onChange={(event) => onDraftChange({ task: event.target.value })} onBlur={() => onAutosave({ task: draft.task })} placeholder="Add a task" /></div>
    <div className="profile-edit-field"><label htmlFor={`status-${update.id}`}>Status</label><select id={`status-${update.id}`} value={draft.status} onChange={(event) => onAutosave({ status: event.target.value as UpdateStatus })}>{editableStatusOptions.map((option) => <option key={option} value={option}>{statusLabel(option)}</option>)}</select></div>
    <div className="profile-edit-field"><label htmlFor={`notes-${update.id}`}>Notes</label><textarea id={`notes-${update.id}`} value={draft.notes} onChange={(event) => onDraftChange({ notes: event.target.value })} onBlur={() => onAutosave({ notes: draft.notes })} placeholder="Add notes" /></div>
    <div className="profile-edit-field"><label htmlFor={`feedback-${update.id}`}>Dr. Begdache feedback</label><textarea id={`feedback-${update.id}`} value={draft.feedback} onChange={(event) => onDraftChange({ feedback: event.target.value })} onBlur={() => onAutosave({ feedback: draft.feedback })} placeholder="Add feedback" /></div>
    <div><strong>Deadline / meeting</strong><span>{cellValue(update.event)}</span></div>
    <div><strong>Questions / support</strong><span>{cellValue([update.questionForDrLina, update.supportNeeded].filter(Boolean).join(" · "))}</span></div>
    <div><strong>Notes / collaborators</strong><span>{cellValue([update.meetingNotes, update.collaborators.length ? `Collaborators: ${update.collaborators.join("; ")}` : ""].filter(Boolean).join(" · "))}</span></div>
    <div><strong>Source record</strong><span>{cellValue(update.sourceRecordId)}</span></div>
    <div><strong>Source</strong><span>{link ? <a className="table-source" href={link} target="_blank" rel="noreferrer">Open source ↗</a> : "-"}</span></div>
    <span className={`profile-autosave-status is-${saveState}`} aria-live="polite">{saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Could not save" : ""}</span>
  </div>;
}

export function StudentProfile({ studentId }: { studentId: string }) {
  const [student, setStudent] = useState<Student | null>(null);
  const [updates, setUpdates] = useState<WeeklyUpdate[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [workstream, setWorkstream] = useState<"All workstreams" | Workstream>("All workstreams");
  const [status, setStatus] = useState<"All statuses" | UpdateStatus>("All statuses");
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, EditableDraft>>({});
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
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

  function toggleDetails(update: WeeklyUpdate) {
    setExpandedHistoryId((current) => current === update.id ? null : update.id);
    setDrafts((current) => current[update.id] ? current : { ...current, [update.id]: draftFor(update) });
  }

  function changeDraft(updateId: string, changes: Partial<EditableDraft>) {
    setDrafts((current) => ({ ...current, [updateId]: { ...(current[updateId] || draftFor(updates.find((item) => item.id === updateId) as WeeklyUpdate)), ...changes } }));
  }

  async function autosave(update: WeeklyUpdate, changes: Partial<EditableDraft>) {
    const draft = { ...(drafts[update.id] || draftFor(update)), ...changes };
    setDrafts((current) => ({ ...current, [update.id]: draft }));
    setSaveStates((current) => ({ ...current, [update.id]: "saving" }));
    try {
      const response = await fetch("/api/update-meeting-row", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceRecordId: update.sourceRecordId, task: draft.task, status: statusLabel(draft.status), notes: draft.notes, feedback: draft.feedback }) });
      const payload = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "The change could not be saved.");
      setUpdates((current) => current.map((item) => item.id === update.id ? { ...item, task: draft.task, meetingNotes: draft.notes, attributionNote: draft.feedback, status: draft.status } : item));
      setSaveStates((current) => ({ ...current, [update.id]: "saved" }));
      window.setTimeout(() => setSaveStates((current) => ({ ...current, [update.id]: "idle" })), 1800);
    } catch (saveError) {
      console.error("Unable to autosave meeting row", saveError);
      setSaveStates((current) => ({ ...current, [update.id]: "error" }));
    }
  }

  return <main className="page-frame profile-page">
    <header className="profile-titlebar"><Link className="profile-back-link" href="/students"><ArrowLeft size={15} /> Students</Link><div className="profile-identity"><span className="owner-mark owner-mark-large">{student.initials}</span><div><h1>{student.name}</h1><p>{student.programAffiliation} · {student.leadershipRole}</p></div></div></header>
    {currentFocus && <section className="profile-focus"><strong>Current focus</strong><p>{currentFocus}</p></section>}
    <section className="history-section"><div className="section-heading"><div><p className="eyebrow">Portfolio</p><h2>Contributions</h2></div><span className="result-count">{visibleHistory.length} shown</span></div><div className="history-filters"><label><span>From date</span><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label><label><span>To date</span><input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label><label><span>Workstream</span><select value={workstream} onChange={(event) => setWorkstream(event.target.value as typeof workstream)}>{workstreamOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>{statusOptions.map((option) => <option key={option} value={option}>{option === "All statuses" ? option : statusLabel(option)}</option>)}</select></label></div>{visibleHistory.length ? <div className="profile-table-wrap"><table className="profile-contribution-table"><caption className="sr-only">All contributions for {student.name}</caption><thead><tr><th scope="col">Date</th><th scope="col">Workstream</th><th scope="col">Contribution / outcome</th><th scope="col">Current work</th><th scope="col">Next step</th><th scope="col">Status</th></tr></thead><tbody>{visibleHistory.map((update) => { const link = sourceLink(update); const expanded = expandedHistoryId === update.id; const draft = drafts[update.id] || draftFor(update); return <Fragment key={update.id}><tr className={expanded ? "profile-row-expanded" : undefined}><td>{formatDate(update.meetingDate)}</td><td className="profile-table-workstream">{cellValue(update.workstream)}</td><td><button className="profile-row-summary" type="button" aria-expanded={expanded} onClick={() => toggleDetails(update)}><strong>{contributionText(update)}</strong><small>{expanded ? "Hide details" : "View details"}</small></button></td><td>{cellValue(update.workingOn)}</td><td>{cellValue(update.nextSteps || update.task)}</td><td><StatusBadge status={update.status} /></td></tr>{expanded && <tr className="profile-detail-row"><td colSpan={6}><EditableDetailGrid update={update} draft={draft} link={link} saveState={saveStates[update.id] || "idle"} onDraftChange={(changes) => changeDraft(update.id, changes)} onAutosave={(changes) => void autosave(update, changes)} /></td></tr>}</Fragment>; })}</tbody></table></div> : <p className="empty-state">No contributions match these filters.</p>}</section>
  </main>;
}
