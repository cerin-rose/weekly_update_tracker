"use client";

import { ArrowRight, CircleHelp, MessageCircle, Save, Search, X } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { students, weeklyUpdates } from "@/data/mock-data";
import { loadMentorResponses, saveMentorResponses } from "@/lib/update-storage";
import type { MentorResponse, ResolutionStatus, Student, UpdateStatus, WeeklyUpdate } from "@/types";
import { StatusBadge } from "@/components/status-badge";
import { UpdateRecord } from "@/components/update-record";

type HomeTab = "response" | "recent" | "students";

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

function SummaryItem({ update, response, onView }: { update: WeeklyUpdate; response?: MentorResponse; onView: () => void }) {
  const student = studentFor(update);
  const status = responseStatus(update.status, response);
  const summary = update.questionForDrLina || update.supportNeeded;

  return <article className="summary-item">
    <div className="summary-identity"><span className="initials-avatar small">{student.initials}</span><div><h3>{student.name}</h3><p>{student.leadershipRole}</p></div></div>
    <div className="summary-meta"><span>{student.primaryWorkstream}</span><span>{formatDate(update.meetingDate)}</span></div>
    <p className="summary-text">{summary}</p>
    <div className="summary-action"><StatusBadge status={status} /><button className="text-button" onClick={onView}>View update <ArrowRight size={14} /></button></div>
  </article>;
}

function RecentItem({ update, response, onView }: { update: WeeklyUpdate; response?: MentorResponse; onView: () => void }) {
  const student = studentFor(update);
  return <article className="recent-item">
    <div className="recent-identity"><span className="initials-avatar small">{student.initials}</span><div><h3>{student.name}</h3><p>{student.leadershipRole} · {student.primaryWorkstream}</p></div></div>
    <p className="recent-completed">{update.completed}</p>
    <div className="recent-bottom"><span>{formatDate(update.meetingDate)}</span><StatusBadge status={responseStatus(update.status, response)} /><button className="text-button" onClick={onView}>View update <ArrowRight size={14} /></button></div>
  </article>;
}

function StudentItem({ student, onView }: { student: Student; onView: () => void }) {
  return <article className="all-student-item"><button className="student-name-button" onClick={onView}><span className="initials-avatar small">{student.initials}</span><span><h3>{student.name}</h3><p>{student.leadershipRole}</p></span></button><span className="student-workstream">{student.primaryWorkstream}</span><p className="student-focus-text">{student.currentFocus}</p><button className="text-button" onClick={onView}>View profile <ArrowRight size={14} /></button></article>;
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
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setMentorResponses(loadMentorResponses()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const matchesSearch = (student: Student) => {
    const studentDates = weeklyUpdates.filter((update) => update.studentId === student.id).map((update) => `${update.meetingDate} ${formatDate(update.meetingDate)}`).join(" ");
    return `${student.name} ${student.leadershipRole} ${student.primaryWorkstream} ${student.programAffiliation} ${studentDates}`.toLowerCase().includes(studentSearch.toLowerCase());
  };
  const attentionUpdates = weeklyUpdates.filter((update) => (update.questionForDrLina || update.supportNeeded || update.status === "blocked") && mentorResponses[update.id]?.resolutionStatus !== "resolved" && matchesSearch(studentFor(update))).sort((a, b) => (a.studentId === "sofia-nguyen" ? -1 : b.studentId === "sofia-nguyen" ? 1 : 0));
  const recentUpdates = weeklyUpdates.slice(0, 4).filter((update) => matchesSearch(studentFor(update)));
  const visibleStudents = students.filter(matchesSearch);
  const selectedUpdate = weeklyUpdates.find((update) => update.id === selectedUpdateId);
  const selectedResponse = selectedUpdate ? mentorResponses[selectedUpdate.id] ?? selectedUpdate.mentorResponse : undefined;
  const effectiveUpdate = selectedUpdate ? { ...selectedUpdate, status: responseStatus(selectedUpdate.status, selectedResponse), mentorResponse: selectedResponse } : undefined;

  function showUpdate(updateId: string) {
    setSelectedUpdateId(updateId);
    setActiveTab("response");
    window.setTimeout(() => document.getElementById("update-detail")?.focus(), 0);
  }

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : event.key === "Home" ? 0 : event.key === "End" ? 2 : -1;
    if (direction < 0) return;
    event.preventDefault();
    const nextIndex = direction === 2 ? 2 : direction === 0 ? 0 : (index + direction + 3) % 3;
    const nextTab = (["response", "recent", "students"] as HomeTab[])[nextIndex];
    setActiveTab(nextTab);
    tabRefs.current[nextIndex]?.focus();
  }

  function saveResponse(updateId: string, response: MentorResponse) {
    const next = { ...mentorResponses, [updateId]: response };
    setMentorResponses(next);
    saveMentorResponses(next);
  }

  return <main className="page-frame dashboard-page">
    <div className="page-intro dashboard-intro"><p className="eyebrow">SMART-MINDS Weekly Hub</p><h1>Good morning, Dr. Lina</h1><p className="meeting-line">Next meeting · Wednesday, September 16, 2026</p></div>

    <div className="hub-tabs" role="tablist" aria-label="Weekly hub views">
      {[{ id: "response" as const, label: "Needs attention" }, { id: "recent" as const, label: "Recent updates" }, { id: "students" as const, label: "All students" }].map((tab, index) => <button key={tab.id} ref={(element) => { tabRefs.current[index] = element; }} id={`tab-${tab.id}`} className={activeTab === tab.id ? "active" : ""} role="tab" aria-selected={activeTab === tab.id} aria-controls={`panel-${tab.id}`} tabIndex={activeTab === tab.id ? 0 : -1} onClick={() => setActiveTab(tab.id)} onKeyDown={(event) => handleTabKey(event, index)}>{tab.label}{tab.id === "response" && <span className="tab-count">{attentionUpdates.length}</span>}</button>)}
    </div>
    <label className="student-search"><Search size={16} /><span className="sr-only">Search students or dates</span><input type="search" value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Search students, workstreams, or dates" /></label>

    <section id="panel-response" className="hub-panel" role="tabpanel" aria-labelledby="tab-response" hidden={activeTab !== "response"} tabIndex={0}>
      <div className="summary-list">{attentionUpdates.length ? attentionUpdates.map((update) => <SummaryItem key={update.id} update={update} response={mentorResponses[update.id]} onView={() => showUpdate(update.id)} />) : <p className="empty-state">No student questions match your search.</p>}</div>
    </section>

    <section id="panel-recent" className="hub-panel" role="tabpanel" aria-labelledby="tab-recent" hidden={activeTab !== "recent"} tabIndex={0}>
      <div className="panel-intro"><div><p className="section-kicker">Recent updates</p><h2>What the team recently completed</h2></div><p>Latest Wednesday check-ins.</p></div>
      <div className="recent-list">{recentUpdates.length ? recentUpdates.map((update) => <RecentItem key={update.id} update={update} response={mentorResponses[update.id]} onView={() => showUpdate(update.id)} />) : <p className="empty-state">No recent updates match your search.</p>}</div>
    </section>

    <section id="panel-students" className="hub-panel" role="tabpanel" aria-labelledby="tab-students" hidden={activeTab !== "students"} tabIndex={0}>
      <div className="panel-intro"><div><p className="section-kicker">All students</p><h2>Six student leaders</h2></div><p>Every contribution has a place to grow.</p></div>
      <div className="all-students-grid">{visibleStudents.length ? visibleStudents.map((student) => <StudentItem key={student.id} student={student} onView={() => router.push(`/students/${student.id}`)} />) : <p className="empty-state">No students match your search.</p>}</div>
    </section>

    {effectiveUpdate && <section id="update-detail" className="update-detail" aria-labelledby="update-detail-heading" tabIndex={-1}>
      <div className="detail-heading"><div><p className="section-kicker">Update detail · {studentFor(effectiveUpdate).name}</p><h2 id="update-detail-heading">Wednesday, {formatDate(effectiveUpdate.meetingDate)}</h2></div><button className="icon-button" aria-label="Close update detail" onClick={() => setSelectedUpdateId(null)}><X size={18} /></button></div>
      <UpdateRecord update={effectiveUpdate} />
      <MentorResponseEditor key={effectiveUpdate.id} update={effectiveUpdate} existing={selectedResponse} onSave={(response) => saveResponse(effectiveUpdate.id, response)} />
    </section>}

    <p className="dashboard-note"><CircleHelp size={15} /> Questions and support needs are intentionally kept visible, not buried in a dashboard.</p>
  </main>;
}
