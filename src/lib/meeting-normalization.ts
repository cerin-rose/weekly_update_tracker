import type { UpdateStatus, Workstream } from "@/types";

export const CANONICAL_STUDENTS = [
  "Georgi", "Sarah", "Marissa", "Emma", "Gianna", "Zach", "Carolyn", "Ysabel", "Megan", "Serena",
  "Christos", "Christian", "Alyssa", "Katarina", "Isabella", "Max", "Amalia", "Joaquim", "Izzy", "Cerin",
] as const;

export const WORKSTREAMS: Workstream[] = [
  "Research", "Education", "Outreach", "Communications", "Fundraising", "Manuscript", "Social Media", "Operations", "Website", "Other",
];

export const STATUS_VALUES = ["On track", "Question", "Needs help", "Blocked"] as const;

const statusAliases: Record<string, UpdateStatus> = {
  "on track": "on-track",
  "on-track": "on-track",
  completed: "on-track",
  done: "on-track",
  "in progress": "on-track",
  planned: "on-track",
  update: "on-track",
  question: "question",
  "needs help": "needs-help",
  "needs-help": "needs-help",
  blocked: "blocked",
};

const workstreamAliases: Record<string, Workstream> = {
  general: "Other",
  "tasks for next week": "Operations",
  communications: "Communications",
  "social media": "Social Media",
};

function clean(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function key(value: string) {
  return value.toLowerCase().replace(/[\u2013\u2014]/g, "-").replace(/\s+/g, " ").trim();
}

export function canonicalStudentName(value: unknown) {
  const candidate = clean(value);
  return CANONICAL_STUDENTS.find((name) => name.toLowerCase() === candidate.toLowerCase()) || "";
}

export function normalizeProgram(value: unknown) {
  const candidate = clean(value).toUpperCase();
  if (candidate.includes("B-SMART") && candidate.includes("BMINDS")) return "SMART-MINDS";
  if (candidate.includes("B-SMART")) return "B-SMART";
  if (candidate.includes("BMINDS")) return "BMINDS";
  if (candidate.includes("SMART-MINDS")) return "SMART-MINDS";
  return "SMART-MINDS";
}

export function normalizeWorkstream(value: unknown) {
  const original = clean(value);
  if (!original) return { value: "Other" as Workstream, original: "" };
  if (WORKSTREAMS.includes(original as Workstream)) return { value: original as Workstream, original: "" };

  const normalized = key(original);
  if (workstreamAliases[normalized]) return { value: workstreamAliases[normalized], original: original };

  const match = WORKSTREAMS.find((candidate) => normalized.includes(candidate.toLowerCase()));
  if (match) return { value: match, original: original === match ? "" : original };
  return { value: "Other" as Workstream, original };
}

export function normalizeStatus(value: unknown) {
  const original = clean(value);
  if (!original) return { value: "" as UpdateStatus | "", original: "" };
  const normalized = statusAliases[key(original)];
  if (normalized) return { value: normalized, original: "" };
  return { value: "needs-review" as UpdateStatus, original };
}

export function displayStatus(value: unknown): UpdateStatus {
  return normalizeStatus(value).value || "needs-review";
}

export function validMeetingDate(value: unknown) {
  const candidate = clean(value);
  if (!candidate) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
    const isoDate = new Date(`${candidate}T12:00:00Z`);
    return Number.isNaN(isoDate.getTime()) || isoDate.toISOString().slice(0, 10) !== candidate ? "" : candidate;
  }
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

export function appendNormalizationNote(note: string, label: string, original: string) {
  return original ? [note, `${label}: ${original}`].filter(Boolean).join(" · ") : note;
}
