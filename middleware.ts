import { NextResponse, type NextRequest } from "next/server";
import { authCookieName, authConfigured, hasValidSession, isProtectedPath } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  if (!isProtectedPath(request.nextUrl.pathname)) return NextResponse.next();

  if (!authConfigured()) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Dashboard access is not configured on the server." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "configuration");
    return NextResponse.redirect(loginUrl);
  }

  if (await hasValidSession(request.cookies.get(authCookieName)?.value)) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|login).*)"],
};
