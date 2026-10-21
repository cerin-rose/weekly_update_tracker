import { NextResponse } from "next/server";
import { authCookieName, authConfigured, createSessionToken } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!authConfigured()) return NextResponse.json({ error: "Dashboard access is not configured. Add both auth environment variables first." }, { status: 503 });

  const rateLimit = await consumeRateLimit(request, {
    namespace: "login",
    globalLimit: 50,
    subjectLimit: 5,
    windowSeconds: 15 * 60,
  });
  if (!rateLimit.allowed) {
    const headers = rateLimit.retryAfterSeconds ? { "Retry-After": String(rateLimit.retryAfterSeconds) } : undefined;
    return NextResponse.json({ error: rateLimit.message }, { status: rateLimit.status, headers });
  }

  const body = await request.json().catch(() => ({})) as { password?: unknown };
  if (String(body.password || "") !== process.env.DASHBOARD_ACCESS_PASSWORD) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({ name: authCookieName, value: await createSessionToken(), httpOnly: true, secure: new URL(request.url).protocol === "https:", sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 });
  return response;
}
