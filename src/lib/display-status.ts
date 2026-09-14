import type { WeeklyUpdate } from "@/types";

export function getDisplayStatus(update: Pick<WeeklyUpdate, "status" | "questionForDrLina" | "supportNeeded">) {
  if (update.status === "blocked") return "blocked" as const;
  if (update.supportNeeded.trim()) return "needs-help" as const;
  if (update.questionForDrLina.trim()) return "question" as const;
  return "on-track" as const;
}
