import { CircleAlert, CircleCheck, CircleHelp, OctagonAlert } from "lucide-react";
import type { UpdateStatus } from "@/types";

const statusDetails: Record<UpdateStatus, { label: string; className: string; Icon: typeof CircleCheck }> = {
  "on-track": { label: "On track", className: "status-on-track", Icon: CircleCheck },
  question: { label: "Question", className: "status-question", Icon: CircleHelp },
  "needs-help": { label: "Needs help", className: "status-needs-help", Icon: CircleAlert },
  blocked: { label: "Blocked", className: "status-blocked", Icon: OctagonAlert },
};

export function StatusBadge({ status }: { status: UpdateStatus }) {
  const detail = statusDetails[status];
  const Icon = detail.Icon;

  return <span className={`status-badge ${detail.className}`}><Icon size={14} />{detail.label}</span>;
}
