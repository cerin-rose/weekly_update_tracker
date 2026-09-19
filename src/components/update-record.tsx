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

interface UpdateRecordProps {
  update: WeeklyUpdate;
  compact?: boolean;
}

export function UpdateRecord({ update, compact = false }: UpdateRecordProps) {
  return (
    <article className={`update-record ${compact ? "compact" : ""}`}>
      <div className="record-topline">
        <div>
          <p className="record-date">{updateDate(update.meetingDate)} · Wednesday meeting</p>
          <h3>{compact ? "Weekly check-in" : "Contribution update"}</h3>
          {!compact && <p className="record-submitted">Submitted {submittedDate(update.submittedAt)}</p>}
        </div>
         <StatusBadge status={getDisplayStatus(update)} />
      </div>

      <div className="update-sections">
        <section className="update-section">
          <h4>Summary</h4>
          <p>{update.completed}</p>
        </section>
        <section className="update-section">
          <h4>Working on now</h4>
          <p>{update.workingOn}</p>
        </section>
        <section className="update-section">
          <h4>Next steps</h4>
          <p>{update.nextSteps}</p>
        </section>
        {(update.questionForDrLina || !compact) && <section className="update-section callout-question">
          <h4>Question for Dr. Lina</h4>
          <p>{update.questionForDrLina || "No question submitted"}</p>
        </section>}
        {(update.supportNeeded || !compact) && <section className="update-section callout-support">
          <h4>Support needed</h4>
          <p>{update.supportNeeded || "No support requested"}</p>
        </section>}
      </div>

      <div className="record-footer">
        <span className="collaborator-line"><strong>Collaborators</strong> {update.collaborators.length ? update.collaborators.join(" · ") : "Working independently"}</span>
        {update.resourceLinks.length > 0 && <span className="resource-line"><strong>Resources</strong> {update.resourceLinks.join(" · ")}</span>}
      </div>
      {update.mentorResponse && <div className="mentor-response"><strong>Dr. Lina’s response · {resolutionLabel(update.mentorResponse.resolutionStatus)}</strong><span>{update.mentorResponse.message}</span>{update.mentorResponse.followUpDate && <small>Follow-up: {update.mentorResponse.followUpDate}</small>}</div>}
    </article>
  );
}
