export const authCookieName = "smart-minds-session";

const encoder = new TextEncoder();

function authConfigured() {
  return Boolean(process.env.DASHBOARD_ACCESS_PASSWORD && process.env.DASHBOARD_SESSION_SECRET);
}

export async function createSessionToken() {
  const secret = process.env.DASHBOARD_SESSION_SECRET;
  if (!secret) return "";
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode("smart-minds-dashboard-session-v1"));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hasValidSession(value: string | undefined) {
  if (!authConfigured() || !value) return false;
  const expected = await createSessionToken();
  return expected.length > 0 && value === expected;
}

export function isProtectedPath(pathname: string) {
  return pathname === "/" || pathname.startsWith("/students") || pathname.startsWith("/records") || pathname.startsWith("/import") || pathname === "/api/weekly-updates" || pathname === "/api/import-document";
}

export { authConfigured };
