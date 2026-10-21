"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(searchParams.get("error") === "configuration" ? "Dashboard access is not configured yet. Set the two auth environment variables in Vercel." : "");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to sign in.");
      router.replace(searchParams.get("next") || "/");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="login-page"><section className="login-panel" aria-labelledby="login-title"><p className="eyebrow">SMART-MINDS Weekly Hub</p><h1 id="login-title">Sign in to the weekly review</h1><p>Use the shared team password to view student updates and meeting records.</p><form onSubmit={submit}><label htmlFor="dashboard-password">Password</label><input id="dashboard-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /><button className="button button-primary" type="submit" disabled={loading}>{loading ? "Checking..." : "Continue"}</button></form>{error && <p className="login-error" role="alert">{error}</p>}</section></main>;
}

export default function LoginPage() {
  return <Suspense fallback={<main className="login-page"><p className="loading-state">Loading sign-in...</p></main>}><LoginForm /></Suspense>;
}
