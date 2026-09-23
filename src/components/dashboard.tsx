"use client";

import { ArrowLeft, ArrowRight, MessageCircle, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { getDisplayStatus } from "@/lib/display-status";
import { loadGoogleSheetState } from "@/lib/google-sheets";
import { loadMentorResponses, saveMentorResponses } from "@/lib/update-storage";
import type { MentorResponse, ProgramAffiliation, Student, UpdateStatus, WeeklyUpdate, Workstream } from "@/types";
import { StatusBadge } from "@/components/status-badge";
import { UpdateRecord } from "@/components/update-record";

type HomeTab = "updates" | "response" | "meeting" | "missing";
type TeamFilter = "All teams" | ProgramAffiliation;
type WorkstreamFilter = "All workstreams" | Workstream;

const workstreamOptions: WorkstreamFilter[] = ["All workstreams", "Research", "Education", "Outreach", "Communications", "Fundraising", "Manuscript", "Social Media", "Operations", "Website", "Other"];
const teamOptions: TeamFilter[] = ["All teams", "B-SMART", "BMINDS", "SMART-MINDS"];
const statusRank: Record<UpdateStatus, number> = { blocked: 0, "needs-help": 1, question: 2, "on-track": 3 };

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function studentFor(update: WeeklyUpdate, students: Student[]) {
  return update.studentId ? students.find((student) => student.id === update.studentId) : undefined;
}

function updateOwnerLabel(update: WeeklyUpdate) {
  if (update.recordType === "meeting") return "Meeting-level record";
  if (update.recordType === "unassigned") return update.studentName || "Unassigned record";
  return update.studentName || "Student update";
}

function responseLabel(response?: MentorResponse) {
  if (!response) return "Awaiting response";
  if (response.resolutionStatus === "resolved") return "Resolved";
  return "Responded by Dr. Lina";
}

function MentorResponseEditor({ update, existing, onSave }: { update: WeeklyUpdate; existing?: MentorResponse; onSave: (response: MentorResponse) => void }) {
  const [message, setMessage] = useState(existing?.message ?? "");
  const [resolutionStatus, setResolutionStatus] = useState<"open" | "follow-up-needed" | "resolved">(existing?.resolutionStatus ?? "open");
  const [followUpDate, setFollowUpDate] = useState(existing?.followUpDate ?? "");
  const [saved, setSaved] = useState(false);

  return <section className="mentor-response-editor" aria-labelledby={`response-${update.id}`}>
    <div className="section-heading"><div><p className="eyebrow">Mentor response</p><h3 id={`response-${update.id}`}>Keep the conversation moving</h3></div><MessageCircle size={18} /></div>
    <label><span>Response</span><textarea value={message} onChange={(event) => { setMessage(event.target.value); setSaved(false); }} placeholder="Write a short response for the student..." /></label>
    <div className="response-fields"><label><span>Resolution</span><select value={resolutionStatus} onChange={(event) => { setResolutionStatus(event.target.value as typeof resolutionStatus); setSaved(false); }}><option value="open">Open</option><option value="follow-up-needed">Follow-up needed</option><option value="resolved">Resolved</option></select></label><label><span>Follow-up date</span><input type="date" value={followUpDate} onChange={(event) => { setFollowUpDate(event.target.value); setSaved(false); }} /></label></div>
    <div className="response-actions"><small>{existing ? responseLabel(existing) : "Awaiting response"}</small><button className="button button-primary" type="button" disabled={!message.trim()} onClick={() => { onSave({ message, resolutionStatus, followUpDate: followUpDate || undefined, respondedAt: new Date().toISOString() }); setSaved(true); }}>Save response</button></div>
    {saved && <p className="save-confirmation" role="status">Response saved locally for this browser.</p>}
  </section>;
}

function ReviewItem({ update, students, response, onSaveResponse, onViewStudent }: { update: WeeklyUpdate; students: Student[]; response?: MentorResponse; onSaveResponse: (response: MentorResponse) => void; onViewStudent: (studentId: string) => void }) {
  const student = studentFor(update, students);
  const status = getDisplayStatus(update);
  const questionOrSupport = update.questionForDrLina || update.supportNeeded;
  return <article className={`review-item ${update.recordType !== "student" ? "review-item-meeting" : ""}`}>
    <div className="review-item-header review-item-header-static">
      <span className="review-item-owner"><span className="owner-mark">{student?.initials ?? (update.recordType === "meeting" ? "M" : "?")}</span><span><strong>{student ? <button className="student-name-link" type="button" onClick={() => onViewStudent(student.id)}>{updateOwnerLabel(update)}</button> : updateOwnerLabel(update)}</strong><small>{student ? `${student.programAffiliation} · ${student.leadershipRole}` : update.sourceSection || "Source record without a canonical roster name"}</small></span></span>
      <span className="review-item-workstream"><small>Workstream</small><strong>{update.workstream}</strong></span>
      <span className="review-item-summary"><small>Completed</small><span>{update.completed || update.workingOn || update.nextSteps || "No update text provided."}</span></span>
      <span className="review-item-question"><small>{questionOrSupport ? "Question / support" : "Next step"}</small><span>{questionOrSupport || update.nextSteps || "No question or next step provided."}</span></span>
      <span className="review-item-status"><StatusBadge status={status} /><small>{formatDate(update.meetingDate)}</small></span>
    </div>
    <div className="review-item-detail review-item-detail-always">
      <div className="detail-toolbar"><div><p className="eyebrow">Source record</p><p>{update.sourceRecordId}{update.sourceDocument ? ` · ${update.sourceDocument}` : ""}</p></div>{student && <button className="button button-secondary" type="button" onClick={() => onViewStudent(student.id)}>View student history <ArrowRight size={15} /></button>}</div>
      <UpdateRecord update={update} />
      {student && <MentorResponseEditor update={update} existing={response} onSave={onSaveResponse} />}
    </div>
  </article>;
}

function MissingRow({ student, lastSubmission }: { student: Student; lastSubmission?: WeeklyUpdate }) {
  return <div className="missing-row"><div className="review-item-owner"><span className="owner-mark">{student.initials}</span><span><strong>{student.name}</strong><small>{student.programAffiliation} · {student.leadershipRole}</small></span></div><span>{student.primaryWorkstream}</span><span>{lastSubmission ? `Last update ${formatDate(lastSubmission.meetingDate)}` : "No prior submission"}</span><StatusBadge status="needs-help" /></div>;
}

export function Dashboard() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [updates, setUpdates] = useState<WeeklyUpdate[]>([]);
  const [availableMeetingDates, setAvailableMeetingDates] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<HomeTab>("updates");
  const [mentorResponses, setMentorResponses] = useState<Record<string, MentorResponse>>({});
  const [meetingDate, setMeetingDate] = useState("all");
  const [team, setTeam] = useState<TeamFilter>("All teams");
  const [workstream, setWorkstream] = useState<WorkstreamFilter>("All workstreams");
  const [studentSearch, setStudentSearch] = useState("");
  const [showDirectory, setShowDirectory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const remote = await loadGoogleSheetState();
      setStudents(remote.students);
      setUpdates(remote.updates);
      setMentorResponses(loadMentorResponses());
      const dates = [...new Set(remote.updates.map((update) => update.meetingDate).filter(Boolean))].sort((a, b) => b.localeCompare(a));
      setAvailableMeetingDates(dates);
      setMeetingDate((current) => current === "all" ? dates[0] ?? "all" : current);
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
    function syncHashView() { setShowDirectory(window.location.hash === "#student-directory"); }
    syncHashView();
    window.addEventListener("hashchange", syncHashView);
    return () => window.removeEventListener("hashchange", syncHashView);
  }, []);

  const studentForId = (studentId: string | null) => studentId ? students.find((student) => student.id === studentId) : undefined;
  const normalizedSearch = studentSearch.trim().toLowerCase();
  const matchesUpdate = (update: WeeklyUpdate) => {
    const student = studentForId(update.studentId);
    const searchText = [update.studentName, update.workstream, update.completed, update.workingOn, update.nextSteps, update.questionForDrLina, update.supportNeeded, update.task, update.sourceRecordId].join(" ").toLowerCase();
    return (team === "All teams" || student?.programAffiliation === team) && (workstream === "All workstreams" || update.workstream === workstream) && (!normalizedSearch || searchText.includes(normalizedSearch));
  };
  const meetingUpdates = updates.filter((update) => meetingDate === "all" || update.meetingDate === meetingDate).filter(matchesUpdate);
  const responseFor = (update: WeeklyUpdate) => mentorResponses[update.id] ?? update.mentorResponse;
  const needsResponse = meetingUpdates.filter((update) => { const status = getDisplayStatus(update); const response = responseFor(update); return (status !== "on-track" || response?.resolutionStatus === "follow-up-needed") && response?.resolutionStatus !== "resolved"; }).sort((a, b) => statusRank[getDisplayStatus(a)] - statusRank[getDisplayStatus(b)]);
  const meetingLevel = meetingUpdates.filter((update) => update.recordType !== "student");
  const roles = ["All roles", ...Array.from(new Set(students.map((student) => student.leadershipRole)))];
  const [role, setRole] = useState("All roles");
  const scopedStudents = students.filter((student) => (team === "All teams" || student.programAffiliation === team) && (workstream === "All workstreams" || student.primaryWorkstream === workstream) && (role === "All roles" || student.leadershipRole === role) && (!normalizedSearch || `${student.name} ${student.currentFocus} ${student.primaryWorkstream} ${student.programAffiliation}`.toLowerCase().includes(normalizedSearch)));
  const selectedUpdates = activeTab === "response" ? needsResponse : activeTab === "meeting" ? meetingLevel : meetingUpdates;
  const visibleUpdates = activeTab === "missing" ? [] : selectedUpdates;
  const missingStudents = meetingDate === "all" ? [] : scopedStudents.filter((student) => !updates.some((update) => update.studentId === student.id && update.meetingDate === meetingDate));
  const latestUpdateFor = (studentId: string) => updates.filter((update) => update.studentId === studentId).sort((a, b) => b.meetingDate.localeCompare(a.meetingDate))[0];

  function moveMeeting(direction: -1 | 1) {
    const index = availableMeetingDates.indexOf(meetingDate);
    const next = availableMeetingDates[index + direction];
    if (next) setMeetingDate(next);
  }

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : event.key === "Home" ? 0 : event.key === "End" ? 3 : -1;
    if (direction < 0) return;
    event.preventDefault();
    const nextIndex = direction === 3 ? 3 : direction === 0 ? 0 : (index + direction + 4) % 4;
    setActiveTab((["updates", "response", "meeting", "missing"] as HomeTab[])[nextIndex]);
    tabRefs.current[nextIndex]?.focus();
  }

  function saveResponse(updateId: string, response: MentorResponse) {
    const next = { ...mentorResponses, [updateId]: response };
    setMentorResponses(next);
    saveMentorResponses(next);
  }

  return <main className="page-frame dashboard-page">
    <header className="page-header dashboard-header">
      <div><p className="eyebrow">Meeting review</p><h1>{showDirectory ? "Student directory" : "Weekly contributions"}</h1><p className="page-description">{showDirectory ? "Browse the real roster and open each student’s contribution history." : "A focused view of what students completed, what is next, and where support is needed."}</p></div>
      <div className="source-status"><span className={`source-dot ${loading ? "is-loading" : error ? "is-error" : ""}`} /> <span>{loading ? "Loading Google Sheets" : error ? "Google Sheets unavailable" : "Google Sheets source"}</span></div>
    </header>

    {error && <div className="notice notice-error" role="alert"><div><strong>We couldn’t load the Google Sheets data.</strong><p>{error}</p></div><button className="button button-secondary" type="button" onClick={() => void refreshData()}><RefreshCw size={15} /> Retry</button></div>}

    {showDirectory ? <section className="directory-section" aria-labelledby="directory-heading">
      <div className="section-heading directory-heading"><div><p className="eyebrow">Roster from Google Sheets</p><h2 id="directory-heading">Students</h2></div><span className="result-count">{loading ? "Loading…" : `${scopedStudents.length} students`}</span></div>
      <div className="directory-filters"><label><span>Search</span><span className="input-with-icon"><Search size={16} /><input type="search" value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Search students or focus" /></span></label><label><span>Team</span><select value={team} onChange={(event) => setTeam(event.target.value as TeamFilter)}>{teamOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label><span>Workstream</span><select value={workstream} onChange={(event) => setWorkstream(event.target.value as WorkstreamFilter)}>{workstreamOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label><span>Role</span><select value={role} onChange={(event) => setRole(event.target.value)}>{roles.map((option) => <option key={option}>{option}</option>)}</select></label></div>
      <div className="directory-list">{loading ? <p className="loading-state">Loading students…</p> : scopedStudents.length ? scopedStudents.map((student) => { const latest = latestUpdateFor(student.id); return <article className="directory-row" key={student.id}><div className="directory-student"><span className="owner-mark">{student.initials}</span><div><strong>{student.name}</strong><small>{student.programAffiliation} · {student.leadershipRole}</small></div></div><p><span className="field-label">Current focus</span>{student.currentFocus}</p><div><span className="field-label">Latest status</span>{latest ? <StatusBadge status={getDisplayStatus(latest)} /> : <span className="muted">No update yet</span>}</div><button className="button button-secondary" type="button" onClick={() => router.push(`/students/${student.id}`)}>View history <ArrowRight size={15} /></button></article>; }) : <p className="empty-state">No students match these filters.</p>}</div>
    </section> : <>
      <section className="filter-panel" aria-label="Review filters"><div className="meeting-picker"><button className="icon-button" aria-label="Previous meeting" disabled={!availableMeetingDates.length || availableMeetingDates.indexOf(meetingDate) === availableMeetingDates.length - 1} onClick={() => moveMeeting(1)}><ArrowLeft size={16} /></button><label><span>Meeting</span><select value={meetingDate} onChange={(event) => setMeetingDate(event.target.value)}>{availableMeetingDates.map((date) => <option key={date} value={date}>{formatDate(date)}</option>)}<option value="all">All meetings</option></select></label><button className="icon-button" aria-label="Next meeting" disabled={!availableMeetingDates.length || meetingDate === availableMeetingDates[0]} onClick={() => moveMeeting(-1)}><ArrowRight size={16} /></button></div><label><span>Team</span><select value={team} onChange={(event) => setTeam(event.target.value as TeamFilter)}>{teamOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label><span>Workstream</span><select value={workstream} onChange={(event) => setWorkstream(event.target.value as WorkstreamFilter)}>{workstreamOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label className="filter-search"><span>Search</span><span className="input-with-icon"><Search size={16} /><input type="search" value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Student, task, question, or source ID" /></span></label></section>
      <div className="review-context"><span>{meetingDate === "all" ? "All meeting records" : `Meeting of ${formatDate(meetingDate)}`}</span><span>{loading ? "Loading records…" : `${meetingUpdates.length} records · ${students.length} students in roster`}</span></div>
      <div className="review-tabs" role="tablist" aria-label="Meeting review views">{([{ id: "updates", label: "All updates", count: meetingUpdates.length }, { id: "response", label: "Needs attention", count: needsResponse.length }, { id: "meeting", label: "Meeting-level", count: meetingLevel.length }, { id: "missing", label: "Missing updates", count: missingStudents.length }] as Array<{ id: HomeTab; label: string; count: number }>).map((tab, index) => <button key={tab.id} ref={(element) => { tabRefs.current[index] = element; }} type="button" role="tab" aria-selected={activeTab === tab.id} tabIndex={activeTab === tab.id ? 0 : -1} className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)} onKeyDown={(event) => handleTabKey(event, index)}>{tab.label}<span>{tab.count}</span></button>)}</div>
      <section className="review-list" role="tabpanel" aria-label={activeTab === "missing" ? "Missing updates" : "Reviewable updates"}>
        {loading ? <div className="loading-state">Loading updates from Google Sheets…</div> : activeTab === "missing" ? (meetingDate === "all" ? <div className="empty-state">Choose a meeting date to see which students have not submitted.</div> : missingStudents.length ? missingStudents.map((student) => <MissingRow key={student.id} student={student} lastSubmission={latestUpdateFor(student.id)} />) : <div className="empty-state">Everyone in this view submitted an update.</div>) : visibleUpdates.length ? visibleUpdates.map((update) => <ReviewItem key={update.id} update={update} students={students} response={responseFor(update)} onSaveResponse={(response) => saveResponse(update.id, response)} onViewStudent={(studentId) => router.push(`/students/${studentId}`)} />) : <div className="empty-state">No records match these filters.</div>}
      </section>
    </>}
  </main>;
}
