"use client";

import { ArrowRight, CircleHelp, MessageCircle, Save, Search, X } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { students, weeklyUpdates } from "@/data/mock-data";
import { loadMentorResponses, saveMentorResponses } from "@/lib/update-storage";
import type { MentorResponse, ResolutionStatus, Student, UpdateStatus, WeeklyUpdate, Workstream } from "@/types";
import { StatusBadge } from "@/components/status-badge";
import { UpdateRecord } from "@/components/update-record";

type HomeTab = "response" | "updates" | "students";

const workstreamOptions: Array<"All workstreams" | Workstream> = ["All workstreams", "Research", "Education", "Outreach", "Communications", "Fundraising", "Manuscripts", "Social Media"];
const resolutionOptions: Array<{ value: ResolutionStatus; label: string }> = [
  { value: "open", label: "Open" },
  { value: "follow-up-needed", label: "Follow-up needed" },
  { value: "resolved", label: "Resolved" },
];

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function responseStatus(status: UpdateStatus, response?: MentorResponse): UpdateStatus {
  if (response?.resolutionStatus === "resolved") return "on-track";
  if (response?.resolutionStatus === "follow-up-needed") return "needs-help";
  return status;
}

function studentFor(update: WeeklyUpdate) {
  return students.find((student) => student.id === update.studentId) ?? students[0];
}

function ReviewRow({ update, response, onView }: { update: WeeklyUpdate; response?: MentorResponse; onView: () => void }) {
  const student = studentFor(update);
  const status = responseStatus(update.status, response);
  const questionOrSupport = update.questionForDrLina || update.supportNeeded || "No question or support request";

  return <div className="review-row" role="row">
    <div className="review-student" role="cell"><span className="initials-avatar small">{student.initials}</span><div><strong>{student.name}</strong><small>{student.leadershipRole}</small></div></div>
    <div className="review-workstream" role="cell"><strong>{student.primaryWorkstream}</strong><small>{student.programAffiliation}</small></div>
    <p className="review-completed" role="cell">{update.completed}</p>
    <p className="review-question" role="cell">{questionOrSupport}</p>
    <div className="review-status" role="cell"><StatusBadge status={status} /><small>{formatDate(update.meetingDate)}</small></div>
    <button className="text-button review-view" onClick={onView}>View update <ArrowRight size={14} /></button>
  </div>;
}

function DirectoryRow({ student, update, response, onView }: { student: Student; update?: WeeklyUpdate; response?: MentorResponse; onView: () => void }) {
  return <div className="directory-review-row" role="row"><button className="student-name-button" onClick={onView}><span className="initials-avatar small">{student.initials}</span><span><strong>{student.name}</strong><small>{student.leadershipRole}</small></span></button><span className="directory-role">{student.primaryWorkstream}</span><p>{student.currentFocus}</p>{update && <StatusBadge status={responseStatus(update.status, response)} />}<button className="text-button" onClick={onView}>View profile <ArrowRight size={14} /></button></div>;
}

function MentorResponseEditor({ update, existing, onSave }: { update: WeeklyUpdate; existing?: MentorResponse; onSave: (response: MentorResponse) => void }) {
  const [message, setMessage] = useState(existing?.message ?? "");
  const [resolutionStatus, setResolutionStatus] = useState<ResolutionStatus>(existing?.resolutionStatus ?? "open");
  const [saved, setSaved] = useState(false);

  function saveResponse() {
    onSave({ message, resolutionStatus, respondedAt: new Date().toISOString() });
    setSaved(true);
  }

  return <section className="response-editor" aria-labelledby="response-editor-heading">
    <div className="response-editor-heading"><div><p className="section-kicker">Mentor response</p><h3 id="response-editor-heading">Keep the conversation moving</h3></div><MessageCircle size={19} /></div>
    <label className="response-field"><span>Response text</span><textarea value={message} onChange={(event) => { setMessage(event.target.value); setSaved(false); }} placeholder="Write a short response for the student..." required /></label>
    <div className="response-editor-footer"><label className="response-field select-field"><span>Resolution status</span><select value={resolutionStatus} onChange={(event) => { setResolutionStatus(event.target.value as ResolutionStatus); setSaved(false); }}>{resolutionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><button className="primary-button" type="button" onClick={saveResponse} disabled={!message.trim()}><Save size={15} /> Save response</button></div>
    <p className="save-message" aria-live="polite">{saved ? "Response saved. The student’s status has been updated." : ""}</p>
  </section>;
}

export function Dashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<HomeTab>("response");
  const [selectedUpdateId, setSelectedUpdateId] = useState<string | null>(null);
  const [mentorResponses, setMentorResponses] = useState<Record<string, MentorResponse>>({});
  const [studentSearch, setStudentSearch] = useState("");
  const [meeting, setMeeting] = useState("Sep 16, 2026");
  const [program, setProgram] = useState("");
  const [workstream, setWorkstream] = useState<"All workstreams" | Workstream>("All workstreams");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setMentorResponses(loadMentorResponses()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const matchesSearch = (student: Student, update?: WeeklyUpdate) => {
    const updateText = update ? `${update.completed} ${update.workingOn} ${update.nextSteps} ${update.questionForDrLina} ${update.supportNeeded} ${update.meetingDate} ${formatDate(update.meetingDate)}` : weeklyUpdates.filter((item) => item.studentId === student.id).map((item) => `${item.meetingDate} ${formatDate(item.meetingDate)}`).join(" ");
    return `${student.name} ${student.leadershipRole} ${student.primaryWorkstream} ${student.programAffiliation} ${student.currentFocus} ${updateText}`.toLowerCase().includes(studentSearch.toLowerCase());
  };
  const matchesFilters = (student: Student) => {
    const matchesProgram = !program || student.programAffiliation === program;
    const matchesWorkstream = workstream === "All workstreams" || student.primaryWorkstream === workstream;
    return matchesProgram && matchesWorkstream;
  };
  const filteredUpdates = weeklyUpdates.filter((update) => { const student = studentFor(update); return matchesFilters(student) && matchesSearch(student, update); });
  const attentionUpdates = filteredUpdates.filter((update) => (update.questionForDrLina || update.supportNeeded || update.status === "blocked") && mentorResponses[update.id]?.resolutionStatus !== "resolved").sort((a, b) => (a.studentId === "sofia-nguyen" ? -1 : b.studentId === "sofia-nguyen" ? 1 : 0));
  const recentUpdates = filteredUpdates.slice(0, 4);
  const visibleStudents = students.filter((student) => matchesFilters(student) && matchesSearch(student));
  const selectedUpdate = weeklyUpdates.find((update) => update.id === selectedUpdateId);
  const selectedResponse = selectedUpdate ? mentorResponses[selectedUpdate.id] ?? selectedUpdate.mentorResponse : undefined;
  const effectiveUpdate = selectedUpdate ? { ...selectedUpdate, status: responseStatus(selectedUpdate.status, selectedResponse), mentorResponse: selectedResponse } : undefined;

  function showUpdate(updateId: string) {
    setSelectedUpdateId(updateId);
    window.setTimeout(() => document.getElementById("update-detail")?.focus(), 0);
  }

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : event.key === "Home" ? 0 : event.key === "End" ? 2 : -1;
    if (direction < 0) return;
    event.preventDefault();
    const nextIndex = direction === 2 ? 2 : direction === 0 ? 0 : (index + direction + 3) % 3;
    setActiveTab((["response", "updates", "students"] as HomeTab[])[nextIndex]);
    tabRefs.current[nextIndex]?.focus();
  }

  function saveResponse(updateId: string, response: MentorResponse) {
    const next = { ...mentorResponses, [updateId]: response };
    setMentorResponses(next);
    saveMentorResponses(next);
  }

  return <main className="page-frame dashboard-page">
    <div className="page-intro dashboard-intro"><p className="eyebrow">SMART-MINDS Weekly Hub</p><h1>Wednesday Meeting Review</h1><p className="page-description">Review student contributions and questions for Sep 16, 2026</p></div>

    <div className="review-filters"><label><span>Meeting</span><select value={meeting} onChange={(event) => setMeeting(event.target.value)}><option>Sep 16, 2026</option><option>All meetings</option></select></label><label><span>Program</span><select value={program} onChange={(event) => setProgram(event.target.value)}><option value="" hidden>All programs</option><option>B-SMART</option><option>BMINDS</option><option>SMART-MINDS</option></select></label><label><span>Workstream</span><select value={workstream} onChange={(event) => setWorkstream(event.target.value as "All workstreams" | Workstream)}>{workstreamOptions.map((option) => <option key={option}>{option}</option>)}</select></label></div>
    <label className="student-search"><Search size={16} /><span className="sr-only">Search students or contributions</span><input type="search" value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Search students or contributions..." /></label>

    <div className="review-summary" aria-label="Meeting review summary"><div><strong>{attentionUpdates.length}</strong><span>Needs response</span></div><div><strong>3</strong><span>Missing updates</span></div><div><strong>14 of 17</strong><span>Submitted</span></div></div>

    <div className="hub-tabs" role="tablist" aria-label="Meeting review views">
      {[{ id: "response" as const, label: "Needs response" }, { id: "updates" as const, label: "All updates" }, { id: "students" as const, label: "Student directory" }].map((tab, index) => <button key={tab.id} ref={(element) => { tabRefs.current[index] = element; }} id={`tab-${tab.id}`} className={activeTab === tab.id ? "active" : ""} role="tab" aria-selected={activeTab === tab.id} aria-controls={`panel-${tab.id}`} tabIndex={activeTab === tab.id ? 0 : -1} onClick={() => setActiveTab(tab.id)} onKeyDown={(event) => handleTabKey(event, index)}>{tab.label}{tab.id === "response" && <span className="tab-count">{attentionUpdates.length}</span>}</button>)}
    </div>

    <section id="panel-response" className="hub-panel review-panel" role="tabpanel" aria-labelledby="tab-response" hidden={activeTab !== "response"} tabIndex={0}>
      <div className="review-table" role="table" aria-label="Students needing a response"><div className="review-table-header" role="row"><span>Student</span><span>Role / team</span><span>Completed</span><span>Question / support</span><span>Status</span><span /></div>{attentionUpdates.length ? attentionUpdates.map((update) => <ReviewRow key={update.id} update={update} response={mentorResponses[update.id]} onView={() => showUpdate(update.id)} />) : <p className="empty-state">No student questions match these filters.</p>}</div>
    </section>

    <section id="panel-updates" className="hub-panel review-panel" role="tabpanel" aria-labelledby="tab-updates" hidden={activeTab !== "updates"} tabIndex={0}>
      <div className="review-table" role="table" aria-label="All student updates"><div className="review-table-header" role="row"><span>Student</span><span>Role / team</span><span>Completed</span><span>Question / support</span><span>Status</span><span /></div>{recentUpdates.length ? recentUpdates.map((update) => <ReviewRow key={update.id} update={update} response={mentorResponses[update.id]} onView={() => showUpdate(update.id)} />) : <p className="empty-state">No updates match these filters.</p>}</div>
    </section>

    <section id="panel-students" className="hub-panel review-panel" role="tabpanel" aria-labelledby="tab-students" hidden={activeTab !== "students"} tabIndex={0}>
      <div className="directory-table" role="table" aria-label="Student directory"><div className="directory-table-header" role="row"><span>Student</span><span>Primary workstream</span><span>Current focus</span><span>Status</span><span /></div>{visibleStudents.length ? visibleStudents.map((student) => { const update = weeklyUpdates.find((item) => item.studentId === student.id); return <DirectoryRow key={student.id} student={student} update={update} response={update ? mentorResponses[update.id] : undefined} onView={() => router.push(`/students/${student.id}`)} />; }) : <p className="empty-state">No students match your search.</p>}</div>
    </section>

    {effectiveUpdate && <section id="update-detail" className="update-detail" aria-labelledby="update-detail-heading" tabIndex={-1}><div className="detail-heading"><div><p className="section-kicker">Update detail · {studentFor(effectiveUpdate).name}</p><h2 id="update-detail-heading">Wednesday, {formatDate(effectiveUpdate.meetingDate)}</h2></div><button className="icon-button" aria-label="Close update detail" onClick={() => setSelectedUpdateId(null)}><X size={18} /></button></div><UpdateRecord update={effectiveUpdate} /><MentorResponseEditor key={effectiveUpdate.id} update={effectiveUpdate} existing={selectedResponse} onSave={(response) => saveResponse(effectiveUpdate.id, response)} /></section>}
    <p className="dashboard-note"><CircleHelp size={15} /> Search matches student names, contributions, workstreams, and meeting dates.</p>
  </main>;
}
