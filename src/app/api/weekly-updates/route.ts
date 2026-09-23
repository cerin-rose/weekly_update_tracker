import { NextResponse } from "next/server";

export const revalidate = 300;

const CACHE_SECONDS = 300;
const defaultAppsScriptUrl = "https://script.google.com/macros/s/AKfycbzHGDHa-MHtsn5hk_R9sqqKkAcApRHEdZCvu3NHRsWDuZw-eu1o0SrsBjIzw9p9KKk/exec";

export async function GET() {
  const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL ?? defaultAppsScriptUrl;

  try {
    const response = await fetch(appsScriptUrl, {
      next: { revalidate: CACHE_SECONDS },
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return NextResponse.json({ rows: [] }, { status: response.status });
    }

    const payload = await response.json() as {
      rows?: Array<Record<string, string>>;
      updates?: Array<Record<string, string>>;
      students?: Array<Record<string, string>>;
    };

    const rows = (payload.updates ?? payload.rows ?? []).map((row, index) => ({
      ...row,
      __rowNumber: String(index + 2),
    }));
    const students = (payload.students ?? []).map((row, index) => ({
      ...row,
      __rowNumber: String(index + 2),
    }));

    return NextResponse.json(
      { rows, students },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=600`,
        },
      },
    );
  } catch (error) {
    console.error("Unable to load Google Sheet weekly updates", error);
    return NextResponse.json({ rows: [] }, { status: 502 });
  }
}
