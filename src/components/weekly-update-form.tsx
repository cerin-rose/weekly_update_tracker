"use client";

import { Check, Link2, Send, Users } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { meetingDates, students, weeklyUpdates } from "@/data/mock-data";
import { loadStoredUpdates, saveStoredUpdates } from "@/lib/update-storage";
import { getDisplayStatus } from "@/lib/display-status";
import type { UpdateStatus, WeeklyUpdate, Workstream } from "@/types";
import { StatusBadge } from "@/components/status-badge";
import { UpdateRecord } from "@/components/update-record";

const sofia = students[0];
const fields = { meetingDate: meetingDates[0], workstream: "Education" as Workstream, completed: "", workingOn: "", nextSteps: "", questionForDrLina: "", supportNeeded: "", collaborators: "", resourceLinks: "", status: "on-track" as UpdateStatus };

export function WeeklyUpdateForm() {
  const [form, setForm] = useState(fields);
  const [updates, setUpdates] = useState<WeeklyUpdate[]>(weeklyUpdates.filter((update) => update.studentId === sofia.id));
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setUpdates([...weeklyUpdates.filter((update) => update.studentId === sofia.id), ...loadStoredUpdates().filter((update) => update.studentId === sofia.id)]), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function setField(field: keyof typeof fields, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setSubmitted(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const update: WeeklyUpdate = {
      id: `update-${Date.now()}`,
      studentId: sofia.id,
      meetingDate: form.meetingDate,
      workstream: form.workstream,
      completed: form.completed,
      workingOn: form.workingOn,
      nextSteps: form.nextSteps,
      questionForDrLina: form.questionForDrLina,
      supportNeeded: form.supportNeeded,
      collaborators: form.collaborators.split(",").map((name) => name.trim()).filter(Boolean),
      resourceLinks: form.resourceLinks.split(",").map((link) => link.trim()).filter(Boolean),
      status: form.status,
      submittedAt: new Date().toISOString(),
    };
    const existingStored = loadStoredUpdates().filter((item) => item.id !== update.id);
    saveStoredUpdates([update, ...existingStored]);
    setUpdates((current) => [update, ...current]);
    setForm(fields);
    setSubmitted(true);
  }

  return <main className="page-frame submit-page">
     <div className="page-intro"><p className="eyebrow">Weekly check-in</p><h1>Submit your weekly update</h1><p className="page-description">Share your progress before Wednesday’s meeting.</p></div>
     <div className="student-context"><span className="initials-avatar">{sofia.initials}</span><div><p className="section-kicker">Submitting as</p><h2>{sofia.name}</h2><p>{sofia.leadershipRole} · {sofia.programAffiliation} · {sofia.primaryWorkstream}</p></div><span className="context-date">Wednesday, Sep 16</span></div>
    {submitted && <div className="success-banner"><span><Check size={16} /></span><div><strong>Update submitted</strong><p>Your check-in is now part of the shared weekly record.</p></div></div>}
    <form id="update-form" className="update-form" onSubmit={submit}>
      <div className="form-heading"><div><p className="section-kicker">Weekly check-in</p><h2>What moved forward?</h2></div><span className="required-note">Required fields marked *</span></div>
      <div className="form-grid">
        <label className="form-field" htmlFor="update-date"><span>Wednesday meeting date *</span><select id="update-date" required value={form.meetingDate} onChange={(event) => setField("meetingDate", event.target.value)}>{meetingDates.map((date) => <option key={date} value={date}>{new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}</option>)}</select></label>
        <label className="form-field" htmlFor="update-workstream"><span>Workstream *</span><select id="update-workstream" required value={form.workstream} onChange={(event) => setForm((current) => ({ ...current, workstream: event.target.value as Workstream }))}><option>Education</option><option>Research</option><option>Outreach</option><option>Communications</option><option>Fundraising</option><option>Manuscript</option><option>Social Media</option></select></label>
        <label className="form-field full" htmlFor="update-completed"><span>What did you complete this week? *</span><textarea id="update-completed" required value={form.completed} onChange={(event) => setField("completed", event.target.value)} placeholder="Share what you finished, created, researched, tested, or updated." /></label>
        <label className="form-field full" htmlFor="update-working"><span>What are you currently working on? *</span><textarea id="update-working" required value={form.workingOn} onChange={(event) => setField("workingOn", event.target.value)} placeholder="Name the work that is in motion right now." /></label>
        <label className="form-field full" htmlFor="update-next"><span>What will you do next? *</span><textarea id="update-next" required value={form.nextSteps} onChange={(event) => setField("nextSteps", event.target.value)} placeholder="What will you move forward before the next meeting?" /></label>
        <label className="form-field status-field" htmlFor="update-status"><span>Status</span><select id="update-status" value={form.status} onChange={(event) => setField("status", event.target.value)}><option value="on-track">On track</option><option value="question">I have a question</option><option value="needs-help">I need help</option><option value="blocked">I am blocked</option></select></label>
        <label className="form-field" htmlFor="update-question"><span>Question for Dr. Lina</span><textarea id="update-question" className="short" value={form.questionForDrLina} onChange={(event) => setField("questionForDrLina", event.target.value)} placeholder="What would you like to discuss on Wednesday?" /></label>
        <label className="form-field" htmlFor="update-support"><span>Support needed</span><textarea id="update-support" className="short" value={form.supportNeeded} onChange={(event) => setField("supportNeeded", event.target.value)} placeholder="Name a decision, resource, connection, or feedback that would help." /></label>
        <label className="form-field" htmlFor="update-collaborators"><span><Users size={14} /> Collaborators <em>Optional</em></span><input id="update-collaborators" value={form.collaborators} onChange={(event) => setField("collaborators", event.target.value)} placeholder="Names separated by commas" /></label>
        <label className="form-field" htmlFor="update-resources"><span><Link2 size={14} /> Resources <em>Optional</em></span><input id="update-resources" value={form.resourceLinks} onChange={(event) => setField("resourceLinks", event.target.value)} placeholder="Links or resource names" /></label>
      </div>
       <div className="form-footer"><button className="primary-button" type="submit"><Send size={15} /> Submit update</button></div>
    </form>
     <section className="recent-section"><div className="records-heading"><div><p className="section-kicker">Your history</p><h2>Recent updates</h2></div>{updates[0] && <StatusBadge status={getDisplayStatus(updates[0])} />}</div>{updates.map((update) => <UpdateRecord key={update.id} update={{ ...update, status: getDisplayStatus(update) }} compact />)}</section>
  </main>;
}
