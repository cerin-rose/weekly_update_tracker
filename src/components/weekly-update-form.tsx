"use client";

import { FormEvent, useEffect, useState } from "react";
import { loadStoredUpdates, saveStoredUpdates } from "@/lib/update-storage";
import { getDisplayStatus } from "@/lib/display-status";
import { hasSupabaseConfig, loadDatabaseState, saveRemoteWeeklyUpdate, subscribeToDatabase } from "@/lib/supabase";
import type { Student, UpdateStatus, WeeklyUpdate, Workstream } from "@/types";
import { StatusBadge } from "@/components/status-badge";
import { UpdateRecord } from "@/components/update-record";

const fields = { meetingDate: "", workstream: "Education" as Workstream, completed: "", workingOn: "", nextSteps: "", questionForDrLina: "", supportNeeded: "", collaborators: "", resourceLinks: "", status: "on-track" as UpdateStatus };

export function WeeklyUpdateForm() {
  const [form, setForm] = useState(fields);
  const [students, setStudents] = useState<Student[]>([]);
  const [meetingDates, setMeetingDates] = useState<string[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [updates, setUpdates] = useState<WeeklyUpdate[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function refreshData() {
      if (hasSupabaseConfig) {
        try {
          const remote = await loadDatabaseState();
          if (!cancelled && remote) {
            setStudents(remote.students);
            setMeetingDates(remote.meetings.map((meeting) => meeting.meeting_date).sort((a, b) => b.localeCompare(a)));
            setSelectedStudentId((current) => current || remote.students[0]?.id || "");
            setForm((current) => ({ ...current, meetingDate: current.meetingDate || remote.meetings[0]?.meeting_date || "" }));
            setUpdates(remote.updates);
          }
        } catch (loadError) {
          console.error("Unable to load Supabase submission history", loadError);
        }
        return;
      }

      setStudents([]);
      setMeetingDates([]);
      setUpdates([]);
    }

    void refreshData();
    if (!hasSupabaseConfig) return;
    const unsubscribe = subscribeToDatabase(() => void refreshData());
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const student = students.find((candidate) => candidate.id === selectedStudentId);
  const studentUpdates = updates.filter((update) => update.studentId === selectedStudentId);

  function setField(field: keyof typeof fields, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setSubmitted(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    if (!student) {
      setError("Select a student before submitting an update.");
      setSaving(false);
      return;
    }
    const update: WeeklyUpdate = {
      id: `update-${Date.now()}`,
      studentId: student.id,
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
    try {
      if (hasSupabaseConfig) {
        await saveRemoteWeeklyUpdate(update);
      } else {
        const existingStored = loadStoredUpdates().filter((item) => item.id !== update.id);
        saveStoredUpdates([update, ...existingStored]);
      }
      setUpdates((current) => [update, ...current]);
      setForm(fields);
      setSubmitted(true);
    } catch (submitError) {
      console.error("Unable to save update", submitError);
      setError("The update could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return <main className="page-frame submit-page">
     <div className="page-intro"><h1>Submit weekly update</h1><p className="page-description">Share what moved forward before Wednesday’s meeting.</p></div>
      <div className="student-context"><span className="initials-avatar">{student?.initials ?? "SM"}</span><div><label className="form-field" htmlFor="student-select"><span>Student</span><select id="student-select" value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)} required><option value="">Select a student</option>{students.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select></label><p>{student?.leadershipRole ?? "Choose a source student"} · {student?.programAffiliation ?? "SMART-MINDS"}</p></div><span className="context-date">{form.meetingDate || "Select meeting"}</span></div>
    {submitted && <div className="success-banner"><div><strong>Update submitted</strong><p>Your weekly record has been updated.</p></div></div>}
    <form id="update-form" className="update-form" onSubmit={submit}>
      <div className="form-heading"><h2>What moved forward?</h2><span className="required-note">* Required</span></div>
      <div className="form-grid">
         <label className="form-field" htmlFor="update-date"><span>Meeting date *</span><select id="update-date" required value={form.meetingDate} onChange={(event) => setField("meetingDate", event.target.value)}><option value="">Select a meeting</option>{meetingDates.map((date) => <option key={date} value={date}>{new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}</option>)}</select></label>
        <label className="form-field" htmlFor="update-workstream"><span>Workstream *</span><select id="update-workstream" required value={form.workstream} onChange={(event) => setForm((current) => ({ ...current, workstream: event.target.value as Workstream }))}><option>Education</option><option>Research</option><option>Outreach</option><option>Communications</option><option>Fundraising</option><option>Manuscript</option><option>Social Media</option><option>Operations</option><option>Website</option><option>Other</option></select></label>
        <label className="form-field full" htmlFor="update-completed"><span>What did you complete this week? *</span><textarea id="update-completed" required value={form.completed} onChange={(event) => setField("completed", event.target.value)} placeholder="Share what you finished, created, researched, tested, or updated." /></label>
        <label className="form-field full" htmlFor="update-working"><span>What are you currently working on? *</span><textarea id="update-working" required value={form.workingOn} onChange={(event) => setField("workingOn", event.target.value)} placeholder="Name the work that is in motion right now." /></label>
        <label className="form-field full" htmlFor="update-next"><span>What will you do next? *</span><textarea id="update-next" required value={form.nextSteps} onChange={(event) => setField("nextSteps", event.target.value)} placeholder="What will you move forward before the next meeting?" /></label>
        <label className="form-field status-field" htmlFor="update-status"><span>Status</span><select id="update-status" value={form.status} onChange={(event) => setField("status", event.target.value)}><option value="on-track">On track</option><option value="question">I have a question</option><option value="needs-help">I need help</option><option value="blocked">I am blocked</option></select></label>
        <label className="form-field" htmlFor="update-question"><span>Question for Dr. Lina</span><textarea id="update-question" className="short" value={form.questionForDrLina} onChange={(event) => setField("questionForDrLina", event.target.value)} placeholder="What would you like to discuss on Wednesday?" /></label>
        <label className="form-field" htmlFor="update-support"><span>Support needed</span><textarea id="update-support" className="short" value={form.supportNeeded} onChange={(event) => setField("supportNeeded", event.target.value)} placeholder="Name a decision, resource, connection, or feedback that would help." /></label>
      </div>
      <details className="optional-fields"><summary>Additional context <span>Optional</span></summary><div className="optional-fields-grid"><label className="form-field" htmlFor="update-collaborators"><span>Collaborators</span><input id="update-collaborators" value={form.collaborators} onChange={(event) => setField("collaborators", event.target.value)} placeholder="Names separated by commas" /></label><label className="form-field" htmlFor="update-resources"><span>Resources</span><input id="update-resources" value={form.resourceLinks} onChange={(event) => setField("resourceLinks", event.target.value)} placeholder="Links or resource names" /></label></div></details>
       <div className="form-footer"><button className="primary-button" type="submit" disabled={saving}>{saving ? "Saving..." : "Submit update"}</button></div>
       <p className="save-message" role="alert">{error}</p>
    </form>
      <section className="recent-section"><div className="records-heading"><h2>Recent updates</h2><span>{studentUpdates.length} entries</span></div>{studentUpdates.map((update) => <UpdateRecord key={update.id} update={{ ...update, status: getDisplayStatus(update) }} compact />)}</section>
  </main>;
}
