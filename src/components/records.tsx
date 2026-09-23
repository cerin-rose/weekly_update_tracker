"use client";

import { ExternalLink, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getDisplayStatus } from "@/lib/display-status";
import { loadGoogleSheetState } from "@/lib/google-sheets";
import type { ProgramAffiliation, Student, UpdateStatus, WeeklyUpdate, Workstream } from "@/types";
import { StatusBadge } from "@/components/status-badge";
import { UpdateRecord } from "@/components/update-record";

type TeamFilter = "All teams" | ProgramAffiliation;
type WorkstreamFilter = "All workstreams" | Workstream;
type StatusFilter = "All statuses" | UpdateStatus;

const teams: TeamFilter[] = ["All teams", "B-SMART", "BMINDS", "SMART-MINDS"];
const workstreams: WorkstreamFilter[] = ["All workstreams", "Research", "Education", "Outreach", "Communications", "Fundraising", "Manuscript", "Social Media", "Operations", "Website", "Other"];
const statuses: StatusFilter[] = ["All statuses", "on-track", "question", "needs-help", "blocked"];

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function statusLabel(status: StatusFilter) {
  return status === "All statuses" ? status : { "on-track": "On track", question: "Question", "needs-help": "Needs help", blocked: "Blocked" }[status];
}

function RecordEntry({ update, student, onStudent }: { update: WeeklyUpdate; student?: Student; onStudent: (studentId: string) => void }) {
  return <article className={`record-entry ${update.recordType !== "student" ? "record-entry-meeting" : ""}`}>
    <header className="record-entry-header"><div><p className="eyebrow">{formatDate(update.meetingDate)} · {update.recordType === "meeting" ? "Meeting-level" : update.recordType === "unassigned" ? "Unassigned source record" : "Student update"}</p><h2>{student ? <button className="record-student-link" type="button" onClick={() => onStudent(student.id)}>{student.name}<ExternalLink size={14} /></button> : update.studentName || "Meeting-level record"}</h2><p className="record-entry-meta">{student ? `${student.programAffiliation} · ${student.leadershipRole}` : update.sourceSection || "Shared meeting content"}</p></div><div className="record-entry-status"><StatusBadge status={getDisplayStatus(update)} /><span>{update.workstream}</span></div></header>
    <UpdateRecord update={update} />
  </article>;
}

export function Records() {
  const router = useRouter();
  const [updates, setUpdates] = useState<WeeklyUpdate[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [meetingDate, setMeetingDate] = useState("all");
  const [team, setTeam] = useState<TeamFilter>("All teams");
  const [workstream, setWorkstream] = useState<WorkstreamFilter>("All workstreams");
  const [status, setStatus] = useState<StatusFilter>("All statuses");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const remote = await loadGoogleSheetState();
      setUpdates(remote.updates);
      setStudents(remote.students);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "The Google Sheets source could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refreshData(), 0);
    return () => window.clearTimeout(initialRefresh);
  }, [refreshData]);

  const dates = useMemo(() => [...new Set(updates.map((update) => update.meetingDate).filter(Boolean))].sort((a, b) => b.localeCompare(a)), [updates]);
  const studentFor = (update: WeeklyUpdate) => update.studentId ? students.find((student) => student.id === update.studentId) : undefined;
  const filteredUpdates = updates.filter((update) => {
    const student = studentFor(update);
    const searchable = [update.studentName, update.workstream, update.completed, update.workingOn, update.nextSteps, update.questionForDrLina, update.supportNeeded, update.task, update.sourceRecordId].join(" ").toLowerCase();
    return (meetingDate === "all" || update.meetingDate === meetingDate) && (team === "All teams" || student?.programAffiliation === team) && (workstream === "All workstreams" || update.workstream === workstream) && (status === "All statuses" || getDisplayStatus(update) === status) && (!search.trim() || searchable.includes(search.trim().toLowerCase()));
  });

  return <main className="page-frame records-page">
    <header className="page-header"><div><p className="eyebrow">Permanent history</p><h1>Records</h1><p className="page-description">Every student contribution and meeting-level record preserved from Google Sheets.</p></div><div className="source-status"><span className={`source-dot ${loading ? "is-loading" : error ? "is-error" : ""}`} />{loading ? "Loading records" : error ? "Source unavailable" : `${filteredUpdates.length} records shown`}</div></header>
    {error && <div className="notice notice-error" role="alert"><div><strong>Records could not be loaded.</strong><p>{error}</p></div><button className="button button-secondary" type="button" onClick={() => void refreshData()}><RefreshCw size={15} /> Retry</button></div>}
    <section className="records-filters" aria-label="Record filters"><label><span>Search</span><span className="input-with-icon"><Search size={16} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Student, task, question, or source ID" /></span></label><label><span>Meeting date</span><select value={meetingDate} onChange={(event) => setMeetingDate(event.target.value)}><option value="all">All dates</option>{dates.map((date) => <option key={date} value={date}>{formatDate(date)}</option>)}</select></label><label><span>Team</span><select value={team} onChange={(event) => setTeam(event.target.value as TeamFilter)}>{teams.map((option) => <option key={option}>{option}</option>)}</select></label><label><span>Workstream</span><select value={workstream} onChange={(event) => setWorkstream(event.target.value as WorkstreamFilter)}>{workstreams.map((option) => <option key={option}>{option}</option>)}</select></label><label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>{statuses.map((option) => <option key={option} value={option}>{statusLabel(option)}</option>)}</select></label></section>
    <p className="records-note">{loading ? "Reading the Google Sheets source…" : `${filteredUpdates.length} of ${updates.length} source records match the current filters.`}</p>
    <section className="records-list">{loading ? <p className="loading-state">Loading historical records…</p> : filteredUpdates.length ? filteredUpdates.map((update) => <RecordEntry key={update.id} update={update} student={studentFor(update)} onStudent={(studentId) => router.push(`/students/${studentId}`)} />) : <p className="empty-state">No records match these filters.</p>}</section>
  </main>;
}
