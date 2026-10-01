"use client";

import { ArrowLeft, ArrowRight, RefreshCw, Search } from "lucide-react";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getDisplayStatus } from "@/lib/display-status";
import { loadGoogleSheetState } from "@/lib/google-sheets";
import type { ProgramAffiliation, Student, UpdateStatus, WeeklyUpdate, Workstream } from "@/types";
import { StatusBadge } from "@/components/status-badge";
import { StudentRosterTable } from "@/components/student-roster-table";

type TeamFilter = "All teams" | ProgramAffiliation;
type WorkstreamFilter = "All workstreams" | Workstream;
type StatusFilter = "All statuses" | UpdateStatus;

const workstreamOptions: WorkstreamFilter[] = ["All workstreams", "Research", "Education", "Outreach", "Communications", "Fundraising", "Manuscript", "Social Media", "Operations", "Website", "Other"];
const teamOptions: TeamFilter[] = ["All teams", "B-SMART", "BMINDS", "SMART-MINDS"];
const statusOptions: StatusFilter[] = ["All statuses", "on-track", "question", "needs-help", "blocked"];
const workstreamOrder: Record<string, number> = { Outreach: 1, Education: 2, "Social Media": 3, Research: 4, Manuscript: 5, Fundraising: 6, Other: 7, Operations: 8, Communications: 9, Website: 10 };

function formatDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function statusLabel(status: StatusFilter | UpdateStatus) {
  return status === "All statuses" ? status : { "on-track": "On track", question: "Question", "needs-help": "Needs help", blocked: "Blocked" }[status];
}

function sourceLink(update: WeeklyUpdate) {
  const source = [update.sourceDocument, ...update.resourceLinks].join(" ");
  return source.match(/https?:\/\/[^\s|]+/i)?.[0] ?? "";
}

function splitFeedback(notes: string, attributionNote = "") {
  const match = notes.match(/Dr\.\s*Begdache feedback[\s\S]*/i);
  const rawFeedback = match?.[0]?.replace(/^Dr\.\s*Begdache feedback\s*:?[\s-]*/i, "").trim() ?? "";
  const feedback = attributionNote.trim() || (rawFeedback === "." ? "" : rawFeedback.replace(/^and follow-up action\.?$/i, "Follow-up action."));
  return { notes: match ? notes.slice(0, match.index).trim() : notes, feedback };
}

function taskText(update: WeeklyUpdate) {
  return update.task || update.nextSteps || update.workingOn || update.completed || "-";
}

function noteText(update: WeeklyUpdate, meetingNotes = update.meetingNotes) {
  const pieces = [meetingNotes, update.questionForDrLina ? `Question: ${update.questionForDrLina}` : "", update.supportNeeded ? `Support: ${update.supportNeeded}` : "", update.collaborators.length ? `Collaborators: ${update.collaborators.join(" · ")}` : ""].filter(Boolean);
  return pieces.join(" · ") || "-";
}

type EditableDraft = { task: string; status: UpdateStatus; notes: string; feedback: string };
type SaveState = "idle" | "saving" | "saved" | "error";
const editableStatusOptions: UpdateStatus[] = ["on-track", "question", "needs-help", "blocked"];

function draftFor(update: WeeklyUpdate): EditableDraft {
  const feedback = splitFeedback(update.meetingNotes, update.attributionNote);
  return { task: update.task, status: getDisplayStatus(update), notes: feedback.notes, feedback: feedback.feedback };
}

function MeetingDetailEditor({ update, draft, saveState, onDraftChange, onAutosave }: { update: WeeklyUpdate; draft: EditableDraft; saveState: SaveState; onDraftChange: (changes: Partial<EditableDraft>) => void; onAutosave: (changes: Partial<EditableDraft>) => void }) {
  return <div className="meeting-edit-grid">
    <div className="meeting-edit-field"><label htmlFor={`meeting-task-${update.id}`}>Task / work</label><textarea id={`meeting-task-${update.id}`} value={draft.task} onChange={(event) => onDraftChange({ task: event.target.value })} onBlur={() => onAutosave({ task: draft.task })} placeholder="Add task or work" /></div>
    <div className="meeting-edit-field"><label htmlFor={`meeting-status-${update.id}`}>Status</label><select id={`meeting-status-${update.id}`} value={draft.status} onChange={(event) => onAutosave({ status: event.target.value as UpdateStatus })}>{editableStatusOptions.map((option) => <option key={option} value={option}>{statusLabel(option)}</option>)}</select></div>
    <div className="meeting-edit-field"><label htmlFor={`meeting-notes-${update.id}`}>Notes</label><textarea id={`meeting-notes-${update.id}`} value={draft.notes} onChange={(event) => onDraftChange({ notes: event.target.value })} onBlur={() => onAutosave({ notes: draft.notes })} placeholder="Add notes" /></div>
    <div className="meeting-edit-field"><label htmlFor={`meeting-feedback-${update.id}`}>Dr. Begdache feedback</label><textarea id={`meeting-feedback-${update.id}`} value={draft.feedback} onChange={(event) => onDraftChange({ feedback: event.target.value })} onBlur={() => onAutosave({ feedback: draft.feedback })} placeholder="Add feedback" /></div>
    <div className="meeting-edit-meta"><strong>Questions / support</strong><span>{[update.questionForDrLina, update.supportNeeded].filter(Boolean).join(" · ") || "-"}</span></div>
    <div className="meeting-edit-meta"><strong>Collaborators</strong><span>{update.collaborators.join(" · ") || "-"}</span></div>
    <div className="meeting-edit-meta"><strong>Source record</strong><span>{update.sourceRecordId || "-"}</span></div>
    <span className={`profile-autosave-status is-${saveState}`} aria-live="polite">{saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Could not save" : ""}</span>
  </div>;
}

function MeetingUpdateRow({ update, student, expanded, draft, saveState, onStudent, onToggle, onDraftChange, onAutosave }: { update: WeeklyUpdate; student?: Student; expanded: boolean; draft: EditableDraft; saveState: SaveState; onStudent: (studentId: string) => void; onToggle: () => void; onDraftChange: (changes: Partial<EditableDraft>) => void; onAutosave: (changes: Partial<EditableDraft>) => void }) {
  const feedback = splitFeedback(update.meetingNotes, update.attributionNote);
  const link = sourceLink(update);
  const relatedLinks = update.resourceLinks.filter((item) => !item.includes(link) && item.trim());
  return <Fragment><tr className={`${!student ? "review-row-meeting" : ""} ${expanded ? "review-row-expanded" : ""}`}>
    <td className="review-cell-workstream">{update.workstream}</td>
    <td className="review-cell-owner">{student ? <span className="review-owner"><span className="owner-mark">{student.initials}</span><span><strong><button className="student-name-link" type="button" onClick={() => onStudent(student.id)}>{student.name}</button></strong><small>{student.programAffiliation}</small></span></span> : <span className="meeting-level-label">Meeting-level</span>}</td>
    <td><button className="meeting-task-button" type="button" aria-expanded={expanded} onClick={onToggle}><strong className="meeting-task">{taskText(update)}</strong><small>{expanded ? "Hide details" : "Edit details"}</small></button></td>
    <td><StatusBadge status={getDisplayStatus(update)} /></td>
    <td>{update.event || "-"}</td>
    <td>{noteText(update, feedback.notes)}</td>
    <td className="review-cell-feedback">{feedback.feedback || "-"}</td>
    <td>{link ? <a className="table-source" href={link} target="_blank" rel="noreferrer">Open source ↗</a> : "-"}{relatedLinks.length > 0 && <small className="table-subtext">{relatedLinks.join(" · ")}</small>}</td>
  </tr>{expanded && <tr className="review-detail-row"><td colSpan={8}><MeetingDetailEditor update={update} draft={draft} saveState={saveState} onDraftChange={onDraftChange} onAutosave={onAutosave} /></td></tr>}</Fragment>;
}

export function Dashboard() {
  const pathname = usePathname();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [updates, setUpdates] = useState<WeeklyUpdate[]>([]);
  const [availableMeetingDates, setAvailableMeetingDates] = useState<string[]>([]);
  const [meetingDate, setMeetingDate] = useState("all");
  const [team, setTeam] = useState<TeamFilter>("All teams");
  const [workstream, setWorkstream] = useState<WorkstreamFilter>("All workstreams");
  const [status, setStatus] = useState<StatusFilter>("All statuses");
  const [search, setSearch] = useState("");
  const [showDirectory, setShowDirectory] = useState(false);
  const [expandedMeetingId, setExpandedMeetingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, EditableDraft>>({});
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const hasInitializedMeetingDate = useRef(false);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const remote = await loadGoogleSheetState();
      setStudents(remote.students);
      setUpdates(remote.updates);
      const dates = [...new Set(remote.updates.map((update) => update.meetingDate).filter(Boolean))].sort((a, b) => b.localeCompare(a));
      setAvailableMeetingDates(dates);
      setMeetingDate((current) => {
        if (!hasInitializedMeetingDate.current) {
          hasInitializedMeetingDate.current = true;
          return dates[0] ?? "all";
        }
        return current === "all" || dates.includes(current) ? current : dates[0] ?? "all";
      });
    } catch (loadError) {
      console.error("Unable to load Google Sheet data", loadError);
      setError(loadError instanceof Error ? loadError.message : "The Google Sheets source could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refreshData(), 0);
    const refreshTimer = window.setInterval(() => void refreshData(), 60_000);
    return () => { window.clearTimeout(initialRefresh); window.clearInterval(refreshTimer); };
  }, [refreshData]);

  useEffect(() => {
    function syncHashView() { setShowDirectory(pathname === "/students" || (pathname === "/" && window.location.hash === "#student-directory")); }
    syncHashView();
    window.addEventListener("hashchange", syncHashView);
    return () => window.removeEventListener("hashchange", syncHashView);
  }, [pathname]);

  const studentFor = (update: WeeklyUpdate) => update.studentId ? students.find((student) => student.id === update.studentId) : undefined;
  const normalizedSearch = search.trim().toLowerCase();
  const matchesFilters = (update: WeeklyUpdate) => {
    const student = studentFor(update);
    const searchable = [update.studentName, update.workstream, update.completed, update.workingOn, update.nextSteps, update.questionForDrLina, update.supportNeeded, update.collaborators.join(" "), update.task, update.taskStatus, update.project, update.event, update.meetingNotes, update.sourceRecordId, update.sourceDocument, update.sourceSection, update.resourceLinks.join(" ")].join(" ").toLowerCase();
    return (meetingDate === "all" || update.meetingDate === meetingDate) && (team === "All teams" || student?.programAffiliation === team) && (workstream === "All workstreams" || update.workstream === workstream) && (status === "All statuses" || getDisplayStatus(update) === status) && (!normalizedSearch || searchable.includes(normalizedSearch));
  };

  const filteredUpdates = updates.filter(matchesFilters).sort((a, b) => (workstreamOrder[a.workstream] ?? 99) - (workstreamOrder[b.workstream] ?? 99) || (a.studentName || "Meeting-level").localeCompare(b.studentName || "Meeting-level") || b.submittedAt.localeCompare(a.submittedAt));
  const directoryStudents = students.filter((student) => (team === "All teams" || student.programAffiliation === team) && (!normalizedSearch || `${student.name} ${student.programAffiliation} ${student.leadershipRole}`.toLowerCase().includes(normalizedSearch)));

  function toggleMeetingDetails(update: WeeklyUpdate) {
    setExpandedMeetingId((current) => current === update.id ? null : update.id);
    setDrafts((current) => current[update.id] ? current : { ...current, [update.id]: draftFor(update) });
  }

  function changeDraft(update: WeeklyUpdate, changes: Partial<EditableDraft>) {
    setDrafts((current) => ({ ...current, [update.id]: { ...(current[update.id] || draftFor(update)), ...changes } }));
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

  function moveMeeting(direction: -1 | 1) {
    const index = availableMeetingDates.indexOf(meetingDate);
    const next = availableMeetingDates[index + direction];
    if (next) setMeetingDate(next);
  }

  return <main className="page-frame dashboard-page">
    <header className="review-titlebar"><h1>{showDirectory ? "Students" : "Meeting Review"}</h1>{!showDirectory && <span>{meetingDate === "all" ? "All meetings" : formatDate(meetingDate)}</span>}</header>
    {error && <div className="notice notice-error" role="alert"><div><strong>We couldn’t load the updates.</strong><p>{error}</p></div><button className="button button-secondary" type="button" onClick={() => void refreshData()}><RefreshCw size={15} /> Retry</button></div>}

    {showDirectory ? <section className="directory-section" aria-labelledby="students-heading">
      <div className="section-heading directory-heading"><div><p className="eyebrow">Roster</p><h2 id="students-heading">Students</h2></div><span className="result-count">{loading ? "Loading..." : `${directoryStudents.length} students`}</span></div>
      <div className="directory-filters"><label><span>Search</span><span className="input-with-icon"><Search size={16} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search students" /></span></label><label><span>Team</span><select value={team} onChange={(event) => setTeam(event.target.value as TeamFilter)}>{teamOptions.map((option) => <option key={option}>{option}</option>)}</select></label></div>
      {loading ? <div className="directory-table-wrap"><p className="loading-state">Loading students...</p></div> : directoryStudents.length ? <StudentRosterTable students={directoryStudents} onStudent={(studentId) => router.push(`/students/${studentId}`)} /> : <p className="empty-state">No students match these filters.</p>}
    </section> : <>
      <section className="filter-panel" aria-label="Meeting View filters"><div className="meeting-picker"><button className="icon-button" aria-label="Previous meeting" disabled={!availableMeetingDates.length || availableMeetingDates.indexOf(meetingDate) === availableMeetingDates.length - 1} onClick={() => moveMeeting(1)}><ArrowLeft size={16} /></button><label><span>Meeting</span><select value={meetingDate} onChange={(event) => setMeetingDate(event.target.value)}>{availableMeetingDates.map((date) => <option key={date} value={date}>{formatDate(date)}</option>)}<option value="all">All meetings</option></select></label><button className="icon-button" aria-label="Next meeting" disabled={!availableMeetingDates.length || meetingDate === availableMeetingDates[0]} onClick={() => moveMeeting(-1)}><ArrowRight size={16} /></button></div><label><span>Team</span><select value={team} onChange={(event) => setTeam(event.target.value as TeamFilter)}>{teamOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label><span>Workstream</span><select value={workstream} onChange={(event) => setWorkstream(event.target.value as WorkstreamFilter)}>{workstreamOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>{statusOptions.map((option) => <option key={option} value={option}>{statusLabel(option)}</option>)}</select></label><label className="filter-search"><span>Search</span><span className="input-with-icon"><Search size={16} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student, task, or question" /></span></label></section>
      <div className="review-context"><span>{loading ? "Loading…" : `${filteredUpdates.length} updates`}</span></div>
      <section className="review-list" aria-label="Meeting updates">{loading ? <div className="loading-state">Loading meeting updates…</div> : filteredUpdates.length ? <div className="review-table-wrap"><table className="review-table meeting-view-table"><caption className="sr-only">One row per update for the selected meeting</caption><thead><tr><th scope="col">Category</th><th scope="col">Person</th><th scope="col">Task / What they are working on</th><th scope="col">Status</th><th scope="col">Deadline / Meeting</th><th scope="col">Notes</th><th scope="col">Dr. Begdache feedback</th><th scope="col">Source</th></tr></thead><tbody>{filteredUpdates.map((update) => <MeetingUpdateRow key={update.id} update={update} student={studentFor(update)} expanded={expandedMeetingId === update.id} draft={drafts[update.id] || draftFor(update)} saveState={saveStates[update.id] || "idle"} onStudent={(studentId) => router.push(`/students/${studentId}`)} onToggle={() => toggleMeetingDetails(update)} onDraftChange={(changes) => changeDraft(update, changes)} onAutosave={(changes) => void autosave(update, changes)} />)}</tbody></table></div> : <div className="empty-state">No updates match these filters.</div>}</section>
    </>}
  </main>;
}
