"use client";

import { ArrowRight, CalendarDays, History, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getStudent, weeklyUpdates } from "@/data/mock-data";
import { loadMentorResponses, loadStoredUpdates } from "@/lib/update-storage";
import type { MentorResponse, UpdateStatus, WeeklyUpdate } from "@/types";
import { StatusBadge } from "@/components/status-badge";
import { UpdateRecord } from "@/components/update-record";

export function StudentProfile() {
  const student = getStudent("sofia-nguyen");
  const [updates, setUpdates] = useState<WeeklyUpdate[]>(weeklyUpdates.filter((update) => update.studentId === student.id));
  const [mentorResponses, setMentorResponses] = useState<Record<string, MentorResponse>>({});

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setUpdates([...weeklyUpdates.filter((update) => update.studentId === student.id), ...loadStoredUpdates().filter((update) => update.studentId === student.id)]);
      setMentorResponses(loadMentorResponses());
    }, 0);
    return () => window.clearTimeout(timer);
  }, [student.id]);

  const resolvedUpdates = updates.map((update) => {
    const response = mentorResponses[update.id] ?? update.mentorResponse;
    const status: UpdateStatus = response?.resolutionStatus === "resolved" ? "on-track" : response?.resolutionStatus === "follow-up-needed" ? "needs-help" : update.status;
    return { ...update, status, mentorResponse: response };
  });
  const latest = resolvedUpdates[0];

  return <main className="page-frame profile-page">
    <div className="profile-hero"><span className="initials-avatar hero">{student.initials}</span><div className="profile-hero-copy"><p className="eyebrow">Student profile · {student.programAffiliation}</p><h1>{student.name}</h1><p>{student.leadershipRole} · {student.primaryWorkstream}</p></div><StatusBadge status={latest?.status ?? "on-track"} /></div>
    <div className="profile-grid">
     <aside className="profile-sidebar">
        <div className="profile-sidebar-block"><p className="section-kicker">Current focus</p><p>{student.currentFocus}</p></div>
        <div className="profile-sidebar-block"><p className="section-kicker">Workstream</p><strong>{student.primaryWorkstream}</strong><p>{student.programAffiliation} student leader</p></div>
        <Link className="profile-action" href="/submit">Submit a new update <ArrowRight size={15} /></Link>
      </aside>
       <section className="profile-history"><div className="history-heading"><div><p className="section-kicker">Contribution history</p><h2>Sofia’s weekly record</h2></div><span><History size={15} /> {resolvedUpdates.length} update{resolvedUpdates.length === 1 ? "" : "s"}</span></div>{resolvedUpdates.map((update) => <UpdateRecord key={update.id} update={update} />)}</section>
    </div>
    {latest?.mentorResponse && <div className="mentor-card"><MessageCircle size={17} /><div><p className="section-kicker">Mentor response</p><p>{latest.mentorResponse.message}</p></div></div>}
    <div className="profile-footnote"><CalendarDays size={14} /><span>Weekly updates are reviewed around the Wednesday meeting rhythm.</span></div>
  </main>;
}
