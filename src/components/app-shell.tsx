"use client";

import { Sprout } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const sofiaView = pathname === "/submit" || pathname.startsWith("/students");
  const currentView = sofiaView ? (pathname === "/submit" ? "/submit" : "/students/sofia-nguyen") : "/";
  const navigation = sofiaView
    ? [
        { href: "/submit", label: "Submit update" },
        { href: "/students/sofia-nguyen", label: "My history" },
      ]
    : [
        { href: "/", label: "Meeting review" },
        { href: "/#student-directory", label: "Student directory" },
      ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="wordmark" href="/" aria-label="SMART-MINDS Weekly Hub home">
          <span className="wordmark-icon"><Sprout size={17} strokeWidth={2.1} /></span>
          <span>
            <strong>SMART-MINDS</strong>
            <small>Weekly Hub</small>
          </span>
        </Link>

        <nav className="topnav" aria-label="Main navigation">
          {navigation.map(({ href, label }) => {
            return href.startsWith("/#")
              ? <a className="nav-link" href={href} key={href}>{label}</a>
              : <Link className={`nav-link ${currentView === href ? "active" : ""}`} href={href} key={href}>{label}</Link>;
          })}
        </nav>

        <label className="demo-switcher">
          <span>Demo view</span>
          <select aria-label="Demo view" value={sofiaView ? "/students/sofia-nguyen" : "/"} onChange={(event) => router.push(event.target.value)}>
            <option value="/">Dr. Lina</option>
            <option value="/students/sofia-nguyen">Sofia</option>
          </select>
        </label>
      </header>
      {children}
    </div>
  );
}
