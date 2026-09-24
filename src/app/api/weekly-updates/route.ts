import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

const cacheHeaders = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};

const defaultAppsScriptUrl = "https://script.google.com/macros/s/AKfycby72N0LTNQ8-f5sCguzf0BvbvW87ngwG5wdy8XaNhaZUl5AFKnn_-oVfwYhM5gpbT-t/exec";

function sourceCandidates() {
  return [...new Set([process.env.GOOGLE_APPS_SCRIPT_URL, defaultAppsScriptUrl].filter(Boolean))] as string[];
}

export async function GET() {
  const failures: string[] = [];

  for (const appsScriptUrl of sourceCandidates()) {
    try {
      const response = await fetch(appsScriptUrl, { cache: "no-store", signal: AbortSignal.timeout(25000), headers: { Accept: "application/json" } });
      if (!response.ok) {
        failures.push(`${response.status}`);
        continue;
      }

      const payload = await response.json() as { rows?: Array<Record<string, unknown>>; updates?: Array<Record<string, unknown>>; students?: Array<Record<string, unknown>> };
      const rows = (payload.updates?.length ? payload.updates : payload.rows ?? []).map((row, index) => ({ ...row, __rowNumber: String(index + 2) }));
      const students = (payload.students ?? []).map((row, index) => ({ ...row, __rowNumber: String(index + 2) }));
      if (!rows.length && !students.length) {
        failures.push("empty source");
        continue;
      }
      return NextResponse.json({ rows, students, source: "Google Sheets" }, { headers: cacheHeaders });
    } catch (error) {
      failures.push(error instanceof Error ? error.message : "request failed");
    }
  }

  console.error("Unable to load Google Sheet weekly updates", failures);
  return NextResponse.json({
    rows: [],
    students: [],
    error: "The Google Sheets source is temporarily unavailable. Please retry in a moment.",
  }, { status: 502, headers: { "Cache-Control": "no-store" } });
}
