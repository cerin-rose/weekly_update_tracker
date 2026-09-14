"use client";

import { Check, Link2, Plus, Send, Users } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { students, weeklyUpdates } from "@/data/mock-data";
import { loadStoredUpdates, saveStoredUpdates } from "@/lib/update-storage";
import type { UpdateStatus, WeeklyUpdate, Workstream } from "@/types";
import { StatusBadge } from "@/components/status-badge";
import { UpdateRecord } from "@/components/update-record";

const sofia = students[0];
const fields = { completed: "", workingOn: "", nextSteps: "", questionForDrLina: "", supportNeeded: "", collaborators: "", resourceLinks: "", status: "on-track" as UpdateStatus };

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
      meetingDate: "2026-09-09",
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
    <div className="page-intro"><p className="eyebrow">Student contribution · Before Wednesday</p><h1>Make the week visible.</h1><p className="page-description">A short check-in keeps your contribution history useful and gives Dr. Lina a clear place to respond.</p></div>
    <div className="student-context"><span className="initials-avatar">{sofia.initials}</span><div><p className="section-kicker">Submitting as</p><h2>{sofia.name}</h2><p>{sofia.leadershipRole} · {sofia.programAffiliation}</p></div><span className="context-date">Wednesday, Sep 9</span></div>
    {submitted && <div className="success-banner"><span><Check size={16} /></span><div><strong>Update submitted</strong><p>Your check-in is now part of the shared weekly record.</p></div></div>}
    <form className="update-form" onSubmit={submit}>
      <div className="form-heading"><div><p className="section-kicker">Weekly check-in</p><h2>What moved forward?</h2></div><span className="required-note">Required fields marked *</span></div>
      <div className="form-grid">
        <label className="form-field full"><span>What did you complete this week? *</span><textarea required value={form.completed} onChange={(event) => setField("completed", event.target.value)} placeholder="Share what you finished, created, researched, tested, or updated." /></label>
        <label className="form-field full"><span>What are you currently working on? *</span><textarea required value={form.workingOn} onChange={(event) => setField("workingOn", event.target.value)} placeholder="Name the work that is in motion right now." /></label>
        <label className="form-field full"><span>What will you do next? *</span><textarea required value={form.nextSteps} onChange={(event) => setField("nextSteps", event.target.value)} placeholder="What will you move forward before the next meeting?" /></label>
        <label className="form-field"><span>Workstream *</span><select required defaultValue="Education"><option>Education</option><option>Research</option><option>Outreach</option><option>Communications</option><option>Fundraising</option><option>Manuscripts</option><option>Social Media</option></select></label>
        <label className="form-field"><span>Status</span><select value={form.status} onChange={(event) => setField("status", event.target.value)}><option value="on-track">On track</option><option value="question">I have a question</option><option value="needs-help">I need help</option><option value="blocked">I am blocked</option></select></label>
        <label className="form-field full"><span>Question for Dr. Lina</span><textarea className="short" value={form.questionForDrLina} onChange={(event) => setField("questionForDrLina", event.target.value)} placeholder="What would you like to discuss on Wednesday?" /></label>
        <label className="form-field full"><span>Support needed</span><textarea className="short" value={form.supportNeeded} onChange={(event) => setField("supportNeeded", event.target.value)} placeholder="Name a decision, resource, connection, or feedback that would help." /></label>
        <label className="form-field"><span><Users size={14} /> Collaborators <em>Optional</em></span><input value={form.collaborators} onChange={(event) => setField("collaborators", event.target.value)} placeholder="Names separated by commas" /></label>
        <label className="form-field"><span><Link2 size={14} /> Resources <em>Optional</em></span><input value={form.resourceLinks} onChange={(event) => setField("resourceLinks", event.target.value)} placeholder="Links or resource names" /></label>
      </div>
      <div className="form-footer"><button className="add-button" type="button"><Plus size={15} /> Add another resource</button><button className="primary-button" type="submit"><Send size={15} /> Submit update</button></div>
    </form>
    <section className="recent-section"><div className="records-heading"><div><p className="section-kicker">Your history</p><h2>Recent updates</h2></div><StatusBadge status="on-track" /></div>{updates.map((update) => <UpdateRecord key={update.id} update={update} compact />)}</section>
  </main>;
}
