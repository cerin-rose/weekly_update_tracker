"use client";

import { ArrowLeft, ArrowRight, MessageCircle, Save, Search, X } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { getDisplayStatus } from "@/lib/display-status";
import { loadGoogleSheetState } from "@/lib/google-sheets";
import { loadMentorResponses, saveMentorResponses } from "@/lib/update-storage";
import type { MentorResponse, ProgramAffiliation, ResolutionStatus, Student, UpdateStatus, WeeklyUpdate, Workstream } from "@/types";
import { StatusBadge } from "@/components/status-badge";
import { UpdateRecord } from "@/components/update-record";

type HomeTab = "response" | "updates" | "missing";
type TeamFilter = "All teams" | ProgramAffiliation;
type WorkstreamFilter = "All workstreams" | Workstream;

const workstreamOptions: WorkstreamFilter[] = ["All workstreams", "Research", "Education", "Outreach", "Communications", "Fundraising", "Manuscript", "Social Media", "Operations", "Website", "Other"];
const teamOptions: TeamFilter[] = ["All teams", "B-SMART", "BMINDS", "SMART-MINDS"];
const resolutionOptions: Array<{ value: ResolutionStatus; label: string }> = [
  { value: "open", label: "Open" },
  { value: "follow-up-needed", label: "Follow-up needed" },
  { value: "resolved", label: "Resolved" },
];
const statusRank: Record<UpdateStatus, number> = { blocked: 0, "needs-help": 1, question: 2, "on-track": 3 };

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatShortDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function studentFor(update: WeeklyUpdate, students: Student[]) {
  return students.find((student) => student.id === update.studentId) ?? {
    id: update.studentId,
    name: update.studentId,
    initials: "SM",
    leadershipRole: "SMART-MINDS Contributor",
    programAffiliation: "SMART-MINDS" as const,
    primaryWorkstream: update.workstream,
    currentFocus: "",
  };
}

function responseLabel(response?: MentorResponse) {
  if (!response) return "Awaiting response";
  if (response.resolutionStatus === "resolved") return "Resolved";
  return "Responded by Dr. Lina";
}

function ReviewRow({ update, students, response, onView }: { update: WeeklyUpdate; students: Student[]; response?: MentorResponse; onView: () => void }) {
  const student = studentFor(update, students);
  const status = getDisplayStatus(update);
  const questionOrSupport = update.questionForDrLina || update.supportNeeded || "No question submitted";

  return <div className="review-row" role="row">
    <div className="review-student" role="cell"><span className="initials-avatar small">{student.initials}</span><div><strong>{student.name}</strong><small>{student.leadershipRole}</small></div></div>
    <div className="review-workstream" role="cell"><strong>{student.programAffiliation}</strong><small>{update.workstream}</small></div>
    <p className="review-completed" role="cell">{update.completed}</p>
    <p className="review-question" role="cell">{questionOrSupport}</p>
    <div className="review-response" role="cell"><span>{responseLabel(response)}</span></div>
    <div className="review-status" role="cell"><StatusBadge status={status} /><small>{formatDate(update.meetingDate)}</small></div>
    <button className="text-button review-view" onClick={onView}>Details <ArrowRight size={14} /></button>
  </div>;
}

function MissingRow({ student, lastSubmission }: { student: Student; lastSubmission?: WeeklyUpdate }) {
  return <div className="missing-row" role="row"><div className="review-student" role="cell"><span className="initials-avatar small">{student.initials}</span><div><strong>{student.name}</strong><small>{student.leadershipRole}</small></div></div><div className="missing-team" role="cell"><strong>{student.programAffiliation}</strong><small>{student.primaryWorkstream}</small></div><span className="missing-last" role="cell">{lastSubmission ? formatDate(lastSubmission.meetingDate) : "No prior submission"}</span><span className="missing-status" role="cell">Update not submitted</span></div>;
}

function DirectoryRow({ student, update, onView }: { student: Student; update?: WeeklyUpdate; onView: () => void }) {
  return <div className="directory-review-row" role="row"><button className="student-name-button" onClick={onView}><span className="initials-avatar small">{student.initials}</span><span><strong>{student.name}</strong><small>{student.programAffiliation} · {student.primaryWorkstream}</small></span></button><p role="cell">{student.currentFocus}</p><div className="directory-status" role="cell">{update ? <StatusBadge status={getDisplayStatus(update)} /> : <span className="directory-no-status">No recent update</span>}</div><button className="text-button" onClick={onView}>View history <ArrowRight size={14} /></button></div>;
}

function MentorResponseEditor({ update, existing, onSave }: { update: WeeklyUpdate; existing?: MentorResponse; onSave: (response: MentorResponse) => void }) {
  const [message, setMessage] = useState(existing?.message ?? "");
  const [resolutionStatus, setResolutionStatus] = useState<ResolutionStatus>(existing?.resolutionStatus ?? "open");
  const [followUpDate, setFollowUpDate] = useState(existing?.followUpDate ?? "");
  const [saved, setSaved] = useState(false);

  function saveResponse() {
    onSave({ message, resolutionStatus, followUpDate: followUpDate || undefined, respondedAt: new Date().toISOString() });
    setSaved(true);
  }

  return <section className="response-editor" aria-labelledby="response-editor-heading">
    <div className="response-editor-heading"><div><p className="section-kicker">Mentor response</p><h3 id="response-editor-heading">Keep the conversation moving</h3></div><MessageCircle size={19} /></div>
    <label className="response-field"><span>Response text</span><textarea value={message} onChange={(event) => { setMessage(event.target.value); setSaved(false); }} placeholder="Write a short response for the student..." required /></label>
    <div className="response-editor-grid"><label className="response-field"><span>Resolution</span><select value={resolutionStatus} onChange={(event) => { setResolutionStatus(event.target.value as ResolutionStatus); setSaved(false); }}>{resolutionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label className="response-field"><span>Follow-up date <em>Optional</em></span><input type="date" value={followUpDate} onChange={(event) => { setFollowUpDate(event.target.value); setSaved(false); }} /></label></div>
    <div className="response-editor-footer"><span className="response-state-note">{existing ? responseLabel(existing) : "Awaiting response"}</span><button className="primary-button" type="button" onClick={saveResponse} disabled={!message.trim()}><Save size={15} /> Save response</button></div>
    <p className="save-message" aria-live="polite">{saved ? "Response saved. The student’s status has been updated." : ""}</p>
  </section>;
}

function TaskCreationPrompt({ update }: { update: WeeklyUpdate }) {
  return <section className="task-creation-prompt" aria-labelledby="task-prompt-heading"><div className="task-prompt-copy"><p className="section-kicker">Task planning</p><h3 id="task-prompt-heading">Pending work</h3><div className="task-context-grid"><div><strong>Summary</strong><p>{update.completed || "No summary submitted."}</p></div><div><strong>Next steps</strong><p>{update.nextSteps || update.workingOn || "No pending work submitted."}</p></div></div></div><p className="task-sheet-note">Create tasks from this pending work in the Google Sheet Tasks tab.</p></section>;
}

export function Dashboard() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [updates, setUpdates] = useState<WeeklyUpdate[]>([]);
  const [availableMeetingDates, setAvailableMeetingDates] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<HomeTab>("response");
  const [selectedUpdateId, setSelectedUpdateId] = useState<string | null>(null);
  const [mentorResponses, setMentorResponses] = useState<Record<string, MentorResponse>>({});
  const [meetingDate, setMeetingDate] = useState("all");
  const [team, setTeam] = useState<TeamFilter>("All teams");
  const [workstream, setWorkstream] = useState<WorkstreamFilter>("All workstreams");
  const [role, setRole] = useState("All roles");
  const [studentSearch, setStudentSearch] = useState("");
  const [showDateRange, setShowDateRange] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [showDirectory, setShowDirectory] = useState(false);
   const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    let cancelled = false;
    async function refreshData() {
      try {
        const remote = await loadGoogleSheetState();
        if (!cancelled) {
          setStudents(remote.students);
          setUpdates(remote.updates);
          setMentorResponses(loadMentorResponses());
          const remoteMeetingDates = [...new Set(remote.updates.map((update) => update.meetingDate))].sort((a, b) => b.localeCompare(a));
          setAvailableMeetingDates(remoteMeetingDates);
          setMeetingDate((current) => current === "all" ? remoteMeetingDates[0] ?? "all" : current);
        }
      } catch (error) {
        console.error("Unable to load Google Sheet data", error);
      }
    }

    void refreshData();
    const refreshTimer = window.setInterval(() => void refreshData(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => {
    function syncHashView() {
      setShowDirectory(window.location.hash === "#student-directory");
    }

    syncHashView();
    window.addEventListener("hashchange", syncHashView);
    return () => window.removeEventListener("hashchange", syncHashView);
  }, []);

  const roles = ["All roles", ...Array.from(new Set(students.map((student) => student.leadershipRole)))];
  const matchesText = (student: Student, update?: WeeklyUpdate) => {
    const historyText = update ? `${update.completed} ${update.workingOn} ${update.nextSteps} ${update.questionForDrLina} ${update.supportNeeded} ${update.meetingDate} ${formatDate(update.meetingDate)}` : updates.filter((item) => item.studentId === student.id).map((item) => `${item.completed} ${item.workingOn} ${item.nextSteps} ${item.questionForDrLina} ${item.supportNeeded} ${item.meetingDate} ${formatDate(item.meetingDate)}`).join(" ");
    return `${student.name} ${student.leadershipRole} ${student.programAffiliation} ${student.primaryWorkstream} ${student.currentFocus} ${historyText}`.toLowerCase().includes(studentSearch.toLowerCase());
  };
  const matchesStudentFilters = (student: Student) => (team === "All teams" || student.programAffiliation === team) && (workstream === "All workstreams" || student.primaryWorkstream === workstream) && (role === "All roles" || student.leadershipRole === role);
  const inRange = (date: string) => (!appliedFrom || date >= appliedFrom) && (!appliedTo || date <= appliedTo);
  const meetingUpdates = updates.filter((update) => meetingDate === "all" || update.meetingDate === meetingDate);
  const filteredMeetingUpdates = meetingUpdates.filter((update) => { const student = studentFor(update, students); return matchesStudentFilters(student) && matchesText(student, update) && inRange(update.meetingDate); });
  const scopedStudents = students.filter((student) => matchesStudentFilters(student) && matchesText(student));
  const responseFor = (update: WeeklyUpdate) => mentorResponses[update.id] ?? update.mentorResponse;
  const needsResponse = filteredMeetingUpdates.filter((update) => { const response = responseFor(update); return (getDisplayStatus(update) !== "on-track" || response?.resolutionStatus === "follow-up-needed") && response?.resolutionStatus !== "resolved"; }).sort((a, b) => statusRank[getDisplayStatus(a)] - statusRank[getDisplayStatus(b)] || a.meetingDate.localeCompare(b.meetingDate));
  const missingStudents = meetingDate === "all" ? [] : scopedStudents.filter((student) => !updates.some((update) => update.studentId === student.id && update.meetingDate === meetingDate));
  const selectedUpdate = updates.find((update) => update.id === selectedUpdateId);
  const selectedResponse = selectedUpdate ? mentorResponses[selectedUpdate.id] ?? selectedUpdate.mentorResponse : undefined;
   const effectiveUpdate = selectedUpdate ? { ...selectedUpdate, status: getDisplayStatus(selectedUpdate), mentorResponse: selectedResponse } : undefined;

  function showUpdate(updateId: string) {
    setSelectedUpdateId(updateId);
    window.setTimeout(() => document.getElementById("update-detail")?.focus(), 0);
  }

  function moveMeeting(direction: -1 | 1) {
     const index = availableMeetingDates.indexOf(meetingDate);
     const next = availableMeetingDates[index + direction];
    if (next) setMeetingDate(next);
  }

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
     const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : event.key === "Home" ? 0 : event.key === "End" ? 2 : -1;
    if (direction < 0) return;
    event.preventDefault();
     const nextIndex = direction === 2 ? 2 : direction === 0 ? 0 : (index + direction + 3) % 3;
     setActiveTab((["response", "updates", "missing"] as HomeTab[])[nextIndex]);
    tabRefs.current[nextIndex]?.focus();
  }

  function saveResponse(updateId: string, response: MentorResponse) {
    const next = { ...mentorResponses, [updateId]: response };
    setMentorResponses(next);
    saveMentorResponses(next);
  }

  function clearDateRange() {
    setFromDate(""); setToDate(""); setAppliedFrom(""); setAppliedTo("");
  }

  return <main className="page-frame dashboard-page">
       <div className="page-intro dashboard-intro">{showDirectory ? <><h1>Student Directory</h1></> : <><p className="eyebrow">Weekly review</p><p className="dashboard-greeting">Good morning, Dr. Lina</p><h1>Wednesday Meeting Review</h1><p className="page-description">Review contributions, questions, and support needs for the selected meeting.</p></>}</div>

     {!showDirectory && <>
      <div className="review-toolbar"><div className="meeting-navigation"><button className="toolbar-icon-button" aria-label="Previous meeting" disabled={!availableMeetingDates.length || availableMeetingDates.indexOf(meetingDate) === availableMeetingDates.length - 1} onClick={() => moveMeeting(1)}><ArrowLeft size={15} /></button><label htmlFor="meeting-date"><span>Meeting</span><select id="meeting-date" value={meetingDate} onChange={(event) => setMeetingDate(event.target.value)}>{availableMeetingDates.map((date) => <option key={date} value={date}>{formatDate(date)}</option>)}<option value="all">All meetings</option></select></label><button className="toolbar-icon-button" aria-label="Next meeting" disabled={!availableMeetingDates.length || meetingDate === availableMeetingDates[0]} onClick={() => moveMeeting(-1)}><ArrowRight size={15} /></button></div><label htmlFor="team-filter"><span>Team</span><select id="team-filter" value={team} onChange={(event) => setTeam(event.target.value as TeamFilter)}>{teamOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label htmlFor="workstream-filter"><span>Workstream</span><select id="workstream-filter" value={workstream} onChange={(event) => setWorkstream(event.target.value as WorkstreamFilter)}>{workstreamOptions.map((option) => <option key={option}>{option}</option>)}</select></label></div>
     <div className="search-row"><label className="student-search" htmlFor="student-search"><Search size={16} /><span className="sr-only">Search students or contributions</span><input id="student-search" type="search" value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Search students or contributions" /></label><button className="date-range-toggle" aria-expanded={showDateRange} onClick={() => setShowDateRange((current) => !current)}>Date range</button></div>
     {showDateRange && <div className="date-range-panel" role="region" aria-label="Date range"><label><span>From date</span><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label><label><span>To date</span><input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label><button className="primary-button" onClick={() => { setAppliedFrom(fromDate); setAppliedTo(toDate); }}>Apply</button><button className="quiet-button" onClick={clearDateRange}>Clear</button></div>}

      <div className="hub-tabs" role="tablist" aria-label="Meeting review views">{[{ id: "response" as const, label: "Needs response" }, { id: "updates" as const, label: "All updates" }, { id: "missing" as const, label: "Missing updates" }].map((tab, index) => <button key={tab.id} ref={(element) => { tabRefs.current[index] = element; }} id={`tab-${tab.id}`} className={activeTab === tab.id ? "active" : ""} role="tab" aria-selected={activeTab === tab.id} aria-controls={`panel-${tab.id}`} tabIndex={activeTab === tab.id ? 0 : -1} onClick={() => setActiveTab(tab.id)} onKeyDown={(event) => handleTabKey(event, index)}>{tab.label}{tab.id === "response" && <span className="tab-count">{needsResponse.length}</span>}</button>)}</div>

      <section id="panel-response" className="hub-panel review-panel" role="tabpanel" aria-labelledby="tab-response" hidden={activeTab !== "response"} tabIndex={0}><div className="review-table" role="table" aria-label="Updates needing a response"><div className="review-table-header" role="row"><span>Student</span><span>Role / Team</span><span>Completed</span><span>Question / Support</span><span>Response</span><span>Status</span><span>Action</span></div>{needsResponse.length ? needsResponse.map((update) => <ReviewRow key={update.id} update={update} students={students} response={mentorResponses[update.id] ?? update.mentorResponse} onView={() => showUpdate(update.id)} />) : <p className="empty-state">No response is needed for this meeting.</p>}</div></section>

      <section id="panel-updates" className="hub-panel review-panel" role="tabpanel" aria-labelledby="tab-updates" hidden={activeTab !== "updates"} tabIndex={0}><div className="review-table" role="table" aria-label="All updates for selected meeting"><div className="review-table-header" role="row"><span>Student</span><span>Role / Team</span><span>Completed</span><span>Question / Support</span><span>Response</span><span>Status</span><span>Action</span></div>{filteredMeetingUpdates.length ? filteredMeetingUpdates.map((update) => <ReviewRow key={update.id} update={update} students={students} response={mentorResponses[update.id] ?? update.mentorResponse} onView={() => showUpdate(update.id)} />) : <p className="empty-state">No submissions for this meeting.</p>}</div></section>

     <section id="panel-missing" className="hub-panel review-panel" role="tabpanel" aria-labelledby="tab-missing" hidden={activeTab !== "missing"} tabIndex={0}>{meetingDate === "all" ? <p className="empty-state">Choose a Wednesday meeting to see missing updates.</p> : <div className="missing-table" role="table" aria-label="Missing updates"><div className="missing-table-header" role="row"><span>Student</span><span>Role / Team</span><span>Last submission</span><span>Status</span></div>{missingStudents.length ? missingStudents.map((student) => <MissingRow key={student.id} student={student} lastSubmission={updates.filter((update) => update.studentId === student.id && update.meetingDate < meetingDate).sort((a, b) => b.meetingDate.localeCompare(a.meetingDate))[0]} />) : <p className="empty-state">Everyone in this view submitted an update.</p>}</div>}</section>
     </>}

        <section id="student-directory" className="hub-panel review-panel" role="region" aria-label="Student directory" hidden={!showDirectory}><div className="directory-table"><div className="directory-controls"><div className="directory-heading"><strong>Student directory</strong><small>{scopedStudents.length} students from Google Sheet</small></div><label><span className="sr-only">Filter by role</span><select value={role} onChange={(event) => setRole(event.target.value)}>{roles.map((option) => <option key={option}>{option}</option>)}</select></label></div><div role="table" aria-label="Student directory"><div className="directory-table-header" role="row"><span>Student</span><span>Current focus</span><span>Status</span><span>Action</span></div>{scopedStudents.length ? scopedStudents.map((student) => { const latest = updates.filter((update) => update.studentId === student.id).sort((a, b) => b.meetingDate.localeCompare(a.meetingDate))[0]; return <DirectoryRow key={student.id} student={student} update={latest} onView={() => router.push(`/students/${student.id}`)} />; }) : <p className="empty-state">No students match these filters.</p>}</div></div></section>

        {effectiveUpdate && <section id="update-detail" className="update-detail" aria-labelledby="update-detail-heading" tabIndex={-1}><div className="detail-heading"><div><p className="section-kicker">Complete update · {studentFor(effectiveUpdate, students).name}</p><h2 id="update-detail-heading">{formatDate(effectiveUpdate.meetingDate)}</h2><p className="detail-context">{studentFor(effectiveUpdate, students).programAffiliation} · {effectiveUpdate.workstream}</p><p className="detail-submitted">Submitted {formatDateTime(effectiveUpdate.submittedAt)}</p></div><button className="icon-button" aria-label="Close update detail" onClick={() => setSelectedUpdateId(null)}><X size={18} /></button></div><UpdateRecord update={effectiveUpdate} /><TaskCreationPrompt update={effectiveUpdate} /><MentorResponseEditor key={effectiveUpdate.id} update={effectiveUpdate} existing={selectedResponse} onSave={(response) => saveResponse(effectiveUpdate.id, response)} /></section>}
  </main>;
}
