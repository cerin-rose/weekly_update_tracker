"use client";

import { ArrowLeft, ArrowRight, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getDisplayStatus } from "@/lib/display-status";
import { loadGoogleSheetState } from "@/lib/google-sheets";
import type { ProgramAffiliation, Student, UpdateStatus, WeeklyUpdate, Workstream } from "@/types";
import { StatusBadge } from "@/components/status-badge";

type TeamFilter = "All teams" | ProgramAffiliation;
type WorkstreamFilter = "All workstreams" | Workstream;

const workstreamOptions: WorkstreamFilter[] = ["All workstreams", "Research", "Education", "Outreach", "Communications", "Fundraising", "Manuscript", "Social Media", "Operations", "Website", "Other"];
const teamOptions: TeamFilter[] = ["All teams", "B-SMART", "BMINDS", "SMART-MINDS"];
const statusPriority: Record<UpdateStatus, number> = { blocked: 4, "needs-help": 3, question: 2, "on-track": 1 };

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function studentFor(update: WeeklyUpdate, students: Student[]) {
  return update.studentId ? students.find((student) => student.id === update.studentId) : undefined;
}

function uniqueText(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].join(" · ");
}

interface StudentMeetingSummary {
  student: Student;
  workstreams: string;
  completed: string;
  workingOn: string;
  nextSteps: string;
  questionSupport: string;
  status: UpdateStatus;
}

function summarizeStudent(student: Student, updates: WeeklyUpdate[]): StudentMeetingSummary {
  const statuses = updates.map((update) => getDisplayStatus(update)).sort((a, b) => statusPriority[b] - statusPriority[a]);
  return {
    student,
    workstreams: uniqueText(updates.map((update) => update.workstream)),
    completed: uniqueText(updates.map((update) => update.completed)),
    workingOn: uniqueText(updates.map((update) => update.workingOn)),
    nextSteps: uniqueText(updates.flatMap((update) => [update.nextSteps, update.task ? `Task: ${update.task}` : ""])),
    questionSupport: uniqueText(updates.flatMap((update) => [update.questionForDrLina, update.supportNeeded])),
    status: statuses[0] ?? "on-track",
  };
}

function StudentMeetingRow({ summary, onViewStudent }: { summary: StudentMeetingSummary; onViewStudent: (studentId: string) => void }) {
  const { student } = summary;
  return <tr>
    <td className="review-cell-owner"><span className="review-owner"><span className="owner-mark">{student.initials}</span><span><strong><button className="student-name-link" type="button" onClick={() => onViewStudent(student.id)}>{student.name}</button></strong><small>{student.leadershipRole}</small></span></span></td>
    <td>{student.programAffiliation}</td>
    <td className="review-cell-workstream">{summary.workstreams || student.primaryWorkstream}</td>
    <td>{summary.completed || "—"}</td>
    <td>{summary.workingOn || "—"}</td>
    <td>{summary.nextSteps || "—"}</td>
    <td className={summary.questionSupport ? "review-cell-attention" : undefined}>{summary.questionSupport || "—"}</td>
    <td><StatusBadge status={summary.status} /></td>
  </tr>;
}

export function Dashboard() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [updates, setUpdates] = useState<WeeklyUpdate[]>([]);
  const [availableMeetingDates, setAvailableMeetingDates] = useState<string[]>([]);
  const [meetingDate, setMeetingDate] = useState("all");
  const [team, setTeam] = useState<TeamFilter>("All teams");
  const [workstream, setWorkstream] = useState<WorkstreamFilter>("All workstreams");
  const [studentSearch, setStudentSearch] = useState("");
  const [showDirectory, setShowDirectory] = useState(false);
  const [role, setRole] = useState("All roles");
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
    function syncHashView() { setShowDirectory(window.location.hash === "#student-directory"); }
    syncHashView();
    window.addEventListener("hashchange", syncHashView);
    return () => window.removeEventListener("hashchange", syncHashView);
  }, []);

  const studentForId = (studentId: string | null) => studentId ? students.find((student) => student.id === studentId) : undefined;
  const normalizedSearch = studentSearch.trim().toLowerCase();
  const matchesUpdate = (update: WeeklyUpdate) => {
    const student = studentForId(update.studentId);
    const searchText = [update.studentName, update.workstream, update.completed, update.workingOn, update.nextSteps, update.questionForDrLina, update.supportNeeded, update.collaborators.join(" "), update.task, update.taskStatus, update.project, update.event, update.sourceRecordId, update.sourceDocument, update.sourceSection].join(" ").toLowerCase();
    return (meetingDate === "all" || update.meetingDate === meetingDate) && (team === "All teams" || student?.programAffiliation === team) && (workstream === "All workstreams" || update.workstream === workstream) && (!normalizedSearch || searchText.includes(normalizedSearch));
  };

  const studentSummaries = [...new Map(updates.filter((update) => update.recordType === "student" && matchesUpdate(update) && update.studentId).map((update) => {
    const student = studentFor(update, students);
    return student ? [student.id, student] as const : null;
  }).filter((entry): entry is readonly [string, Student] => Boolean(entry)).map(([studentId, student]) => [studentId, summarizeStudent(student, updates.filter((update) => update.recordType === "student" && update.studentId === studentId && matchesUpdate(update)))] as const)).values()];

  const roles = ["All roles", ...Array.from(new Set(students.map((student) => student.leadershipRole)))];
  const scopedStudents = students.filter((student) => (team === "All teams" || student.programAffiliation === team) && (workstream === "All workstreams" || student.primaryWorkstream === workstream) && (role === "All roles" || student.leadershipRole === role) && (!normalizedSearch || `${student.name} ${student.currentFocus} ${student.primaryWorkstream} ${student.programAffiliation} ${student.leadershipRole}`.toLowerCase().includes(normalizedSearch)));
  const latestUpdateFor = (studentId: string) => updates.filter((update) => update.studentId === studentId).sort((a, b) => b.meetingDate.localeCompare(a.meetingDate))[0];

  function moveMeeting(direction: -1 | 1) {
    const index = availableMeetingDates.indexOf(meetingDate);
    const next = availableMeetingDates[index + direction];
    if (next) setMeetingDate(next);
  }

  return <main className="page-frame dashboard-page">
    <header className="page-header dashboard-header">
      <h1>{showDirectory ? "Student directory" : "Weekly contributions"}</h1>
    </header>

    {error && <div className="notice notice-error" role="alert"><div><strong>We couldn’t load the updates.</strong><p>{error}</p></div><button className="button button-secondary" type="button" onClick={() => void refreshData()}><RefreshCw size={15} /> Retry</button></div>}

    {showDirectory ? <section className="directory-section" aria-labelledby="directory-heading">
      <div className="section-heading directory-heading"><div><p className="eyebrow">Roster</p><h2 id="directory-heading">Students</h2></div><span className="result-count">{loading ? "Loading…" : `${scopedStudents.length} students`}</span></div>
      <div className="directory-filters"><label><span>Search</span><span className="input-with-icon"><Search size={16} /><input type="search" value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Search students or focus" /></span></label><label><span>Team</span><select value={team} onChange={(event) => setTeam(event.target.value as TeamFilter)}>{teamOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label><span>Workstream</span><select value={workstream} onChange={(event) => setWorkstream(event.target.value as WorkstreamFilter)}>{workstreamOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label><span>Role</span><select value={role} onChange={(event) => setRole(event.target.value)}>{roles.map((option) => <option key={option}>{option}</option>)}</select></label></div>
      <div className="directory-list">{loading ? <p className="loading-state">Loading students…</p> : scopedStudents.length ? scopedStudents.map((student) => { const latest = latestUpdateFor(student.id); return <article className="directory-row" key={student.id}><div className="directory-student"><span className="owner-mark">{student.initials}</span><div><strong>{student.name}</strong><small>{student.programAffiliation} · {student.leadershipRole}</small></div></div><p><span className="field-label">Current focus</span>{student.currentFocus}</p><div><span className="field-label">Latest status</span>{latest ? <StatusBadge status={getDisplayStatus(latest)} /> : <span className="muted">No update yet</span>}</div><button className="button button-secondary" type="button" onClick={() => router.push(`/students/${student.id}`)}>View history <ArrowRight size={15} /></button></article>; }) : <p className="empty-state">No students match these filters.</p>}</div>
    </section> : <>
      <section className="filter-panel" aria-label="Meeting filters"><div className="meeting-picker"><button className="icon-button" aria-label="Previous meeting" disabled={!availableMeetingDates.length || availableMeetingDates.indexOf(meetingDate) === availableMeetingDates.length - 1} onClick={() => moveMeeting(1)}><ArrowLeft size={16} /></button><label><span>Meeting</span><select value={meetingDate} onChange={(event) => setMeetingDate(event.target.value)}>{availableMeetingDates.map((date) => <option key={date} value={date}>{formatDate(date)}</option>)}<option value="all">All meetings</option></select></label><button className="icon-button" aria-label="Next meeting" disabled={!availableMeetingDates.length || meetingDate === availableMeetingDates[0]} onClick={() => moveMeeting(-1)}><ArrowRight size={16} /></button></div><label><span>Team</span><select value={team} onChange={(event) => setTeam(event.target.value as TeamFilter)}>{teamOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label><span>Workstream</span><select value={workstream} onChange={(event) => setWorkstream(event.target.value as WorkstreamFilter)}>{workstreamOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label className="filter-search"><span>Search</span><span className="input-with-icon"><Search size={16} /><input type="search" value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Search students" /></span></label></section>
      <section className="review-list" aria-label="Students in selected meeting">
        {loading ? <div className="loading-state">Loading students…</div> : studentSummaries.length ? <div className="review-table-wrap"><table className="review-table"><caption className="sr-only">Students and their updates for the selected meeting</caption><thead><tr><th scope="col">Student</th><th scope="col">Team / program</th><th scope="col">Workstream</th><th scope="col">Completed</th><th scope="col">Currently working on</th><th scope="col">Next steps</th><th scope="col">Question / support</th><th scope="col">Status</th></tr></thead><tbody>{studentSummaries.map((summary) => <StudentMeetingRow key={summary.student.id} summary={summary} onViewStudent={(studentId) => router.push(`/students/${studentId}`)} />)}</tbody></table></div> : <div className="empty-state">No students have updates for this meeting.</div>}
      </section>
    </>}
  </main>;
}
