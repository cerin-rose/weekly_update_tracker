"use client";

import { Sprout } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const currentView = pathname === "/operations" ? "/operations" : pathname === "/submit" ? "/submit" : "/";
  const navigation = [
    { href: "/", label: "Meeting review" },
    { href: "/#student-directory", label: "Student directory" },
    { href: "/operations", label: "Operations" },
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="wordmark" href="/" aria-label="SMART-MINDS Weekly Hub home">
          <span className="wordmark-icon"><Sprout size={18} strokeWidth={2.2} /></span>
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

      </header>
      {children}
    </div>
  );
}
