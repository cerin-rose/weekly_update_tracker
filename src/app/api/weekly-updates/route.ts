import { NextResponse } from "next/server";
import { readGoogleSheetState } from "@/lib/google-sheets-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

const cacheHeaders = { "Cache-Control": "private, no-store" };

export async function GET() {
  try {
    const payload = await readGoogleSheetState();
    if (!payload.updates.length && !payload.students.length) {
      return NextResponse.json({ rows: [], students: [], error: "The Google Sheets source returned no records." }, { status: 502, headers: cacheHeaders });
    }
    return NextResponse.json({ rows: payload.updates, students: payload.students, source: "Meeting Database", lastUpdatedAt: new Date().toISOString() }, { headers: cacheHeaders });
  } catch (error) {
    console.error("Unable to load Google Sheet weekly updates", error);
    return NextResponse.json({
      rows: [],
      students: [],
      error: error instanceof Error ? error.message : "The Google Sheets source is temporarily unavailable. Please retry in a moment.",
    }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
