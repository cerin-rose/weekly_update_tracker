import { NextResponse } from "next/server";

export const revalidate = 60;

const defaultAppsScriptUrl = "https://script.google.com/macros/s/AKfycby72N0LTNQ8-f5sCguzf0BvbvW87ngwG5wdy8XaNhaZUl5AFKnn_-oVfwYhM5gpbT-t/exec";
const cacheHeaders = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" };

export async function GET() {
  const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL ?? defaultAppsScriptUrl;

  try {
    const response = await fetch(appsScriptUrl, { next: { revalidate: 60 }, headers: { Accept: "application/json" } });
    if (!response.ok) {
      return NextResponse.json({ rows: [], students: [], error: `Google Sheets source returned ${response.status}.` }, { status: response.status, headers: { "Cache-Control": "no-store" } });
    }

    const payload = await response.json() as { rows?: Array<Record<string, unknown>>; updates?: Array<Record<string, unknown>>; students?: Array<Record<string, unknown>> };
    const rows = (payload.updates?.length ? payload.updates : payload.rows ?? []).map((row, index) => ({ ...row, __rowNumber: String(index + 2) }));
    const students = (payload.students ?? []).map((row, index) => ({ ...row, __rowNumber: String(index + 2) }));
    return NextResponse.json({ rows, students, source: "Google Sheets" }, { headers: cacheHeaders });
  } catch (error) {
    console.error("Unable to load Google Sheet weekly updates", error);
    return NextResponse.json({ rows: [], students: [], error: "The Google Sheets source could not be reached." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
