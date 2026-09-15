import type { UpdateStatus } from "@/types";

const statusDetails: Record<UpdateStatus, { label: string; className: string }> = {
  "on-track": { label: "On track", className: "status-on-track" },
  question: { label: "Question", className: "status-question" },
  "needs-help": { label: "Needs help", className: "status-needs-help" },
  blocked: { label: "Blocked", className: "status-blocked" },
};

export function StatusBadge({ status }: { status: UpdateStatus }) {
  const detail = statusDetails[status];

  return <span className={`status-badge ${detail.className}`}><span className="status-dot" aria-hidden="true" />{detail.label}</span>;
}
