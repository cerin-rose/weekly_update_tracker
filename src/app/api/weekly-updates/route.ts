import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const defaultAppsScriptUrl = "https://script.google.com/macros/s/AKfycbwfO5eg_rLZdOb8-Fugyhweh0mqE6hBzoiXfL-KAUePWeQSe8NIbMksoZm2ZEhrrxza/exec";

export async function GET() {
  const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL ?? defaultAppsScriptUrl;

  try {
    const response = await fetch(appsScriptUrl, { cache: "no-store" });
    if (!response.ok) return NextResponse.json({ rows: [] }, { status: response.status });

    const payload = await response.json() as { rows?: Array<Record<string, string>> };
    const rows = (payload.rows ?? []).map((row, index) => ({ ...row, __rowNumber: String(index + 2) }));
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("Unable to load Google Sheet weekly updates", error);
    return NextResponse.json({ rows: [] }, { status: 502 });
  }
}
