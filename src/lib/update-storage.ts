import type { MentorResponse, WeeklyUpdate } from "@/types";

export const UPDATE_STORAGE_KEY = "smart-minds-weekly-updates-v1";
export const MENTOR_RESPONSE_STORAGE_KEY = "smart-minds-mentor-responses-v1";

export function loadStoredUpdates(): WeeklyUpdate[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(UPDATE_STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as WeeklyUpdate[]) : [];
  } catch {
    return [];
  }
}

export function saveStoredUpdates(updates: WeeklyUpdate[]) {
  window.localStorage.setItem(UPDATE_STORAGE_KEY, JSON.stringify(updates));
}

export function loadMentorResponses(): Record<string, MentorResponse> {
  if (typeof window === "undefined") return {};

  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(MENTOR_RESPONSE_STORAGE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, MentorResponse>) : {};
  } catch {
    return {};
  }
}

export function saveMentorResponses(responses: Record<string, MentorResponse>) {
  window.localStorage.setItem(MENTOR_RESPONSE_STORAGE_KEY, JSON.stringify(responses));
}
