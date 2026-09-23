import type { WeeklyUpdate } from "@/types";
import { getDisplayStatus } from "@/lib/display-status";
import { StatusBadge } from "@/components/status-badge";

function updateDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function submittedDate(date: string) {
  return new Date(date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function resolutionLabel(status: "open" | "follow-up-needed" | "resolved") {
  return { open: "Open", "follow-up-needed": "Follow-up needed", resolved: "Resolved" }[status];
}

function detailValue(value: string, fallback = "Not provided") {
  return value.trim() || fallback;
}

function ResourceValue({ value }: { value: string }) {
  const isUrl = /^https?:\/\//i.test(value);
  return isUrl ? <a href={value} target="_blank" rel="noreferrer">{value}<span aria-hidden="true"> ↗</span></a> : <span>{value}</span>;
}

interface UpdateRecordProps {
  update: WeeklyUpdate;
  compact?: boolean;
}

export function UpdateRecord({ update, compact = false }: UpdateRecordProps) {
  const sourceItems = [update.sourceRecordId, update.sourceDocument, update.sourceSection].filter(Boolean);
  return <article className={`update-record ${compact ? "compact" : ""}`}>
    <div className="record-heading"><div><p className="record-context">{updateDate(update.meetingDate)} · {update.recordType === "meeting" ? "Meeting-level record" : "Weekly contribution"}</p><h3>{update.recordType === "meeting" ? "Meeting notes and shared work" : "Contribution details"}</h3>{!compact && <p className="record-submitted">Recorded {submittedDate(update.submittedAt)}</p>}</div><StatusBadge status={getDisplayStatus(update)} /></div>

    <div className="record-grid">
      <section className="record-field"><h4>Completed this week</h4><p>{detailValue(update.completed)}</p></section>
      <section className="record-field"><h4>Currently working on</h4><p>{detailValue(update.workingOn)}</p></section>
      <section className="record-field"><h4>Next steps</h4><p>{detailValue(update.nextSteps)}</p></section>
      <section className="record-field record-question"><h4>Question for Dr. Lina</h4><p>{detailValue(update.questionForDrLina, "No question submitted")}</p></section>
      <section className="record-field record-support"><h4>Support needed</h4><p>{detailValue(update.supportNeeded, "No support requested")}</p></section>
      {update.task && <section className="record-field record-task"><h4>Task</h4><p>{update.task}</p><small>{update.taskStatus || "Task status not provided"}</small></section>}
    </div>

    <div className="record-metadata"><div><strong>Collaborators</strong><span>{update.collaborators.length ? update.collaborators.join(" · ") : "Working independently"}</span></div>{update.project && <div><strong>Project</strong><span>{update.project}</span></div>}{update.event && <div><strong>Event</strong><span>{update.event}</span></div>}{update.mentorResponse && <div><strong>Dr. Lina’s response</strong><span>{update.mentorResponse.message} · {resolutionLabel(update.mentorResponse.resolutionStatus)}</span></div>}</div>

    {(sourceItems.length > 0 || update.resourceLinks.length > 0 || update.attributionEvidence || update.attributionNote) && <footer className="record-source"><strong>Source information</strong>{sourceItems.length > 0 && <span>{sourceItems.join(" · ")}</span>}{update.resourceLinks.length > 0 && <span className="record-links">{update.resourceLinks.map((resource, index) => <ResourceValue key={`${resource}-${index}`} value={resource} />)}</span>}{update.attributionEvidence && <span>Evidence: {update.attributionEvidence}</span>}{update.attributionNote && <span>Note: {update.attributionNote}</span>}</footer>}
  </article>;
}
