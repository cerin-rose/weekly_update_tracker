import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const bridgeUrl = "https://script.google.com/macros/s/AKfycby72N0LTNQ8-f5sCguzf0BvbvW87ngwG5wdy8XaNhaZUl5AFKnn_-oVfwYhM5gpbT-t/exec";
const allowedStatuses = ["On track", "Question", "Needs help", "Blocked"] as const;

type UpdateRequest = {
  sourceRecordId?: unknown;
  task?: unknown;
  status?: unknown;
  notes?: unknown;
  feedback?: unknown;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

async function updateMeetingRow(body: UpdateRequest) {
  const token = process.env.GOOGLE_APPS_SCRIPT_WRITE_TOKEN;
  if (!token) throw new Error("Autosave is not configured on the server yet.");

  const sourceRecordId = text(body.sourceRecordId);
  if (!sourceRecordId) throw new Error("This record has no source record ID and cannot be updated safely.");

  const updates: Record<string, string> = {};
  if (body.task !== undefined) updates.task = text(body.task);
  if (body.notes !== undefined) updates.notes = text(body.notes);
  if (body.feedback !== undefined) updates.feedback = text(body.feedback);
  if (body.status !== undefined) {
    const status = text(body.status);
    if (!allowedStatuses.includes(status as typeof allowedStatuses[number])) throw new Error("Choose a valid status.");
    updates.status = status;
  }
  if (!Object.keys(updates).length) throw new Error("No changes were supplied.");

  const response = await fetch(process.env.GOOGLE_APPS_SCRIPT_URL || bridgeUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ action: "updateMeetingRow", token, sourceRecordId, updates }),
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  });
  const payload = await response.json().catch(() => ({})) as { ok?: boolean; error?: string };
  if (!response.ok || !payload.ok) throw new Error(payload.error || `The Google Sheets bridge returned ${response.status}.`);
  return payload;
}

export async function POST(request: Request) {
  try {
    const result = await updateMeetingRow(await request.json() as UpdateRequest);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "The update could not be saved.", 500);
  }
}
