"use client";

import { ChevronDown, House, PenLine, Sprout, UserRound } from "lucide-react";
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
        { href: "/submit", label: "Submit Update", icon: PenLine },
        { href: "/students/sofia-nguyen", label: "My History", icon: UserRound },
      ]
    : [
        { href: "/", label: "Meeting Review", icon: House },
        { href: "/#student-directory", label: "Student Directory", icon: UserRound },
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
          {navigation.map(({ href, label, icon: Icon }) => {
            const content = <><Icon size={15} strokeWidth={1.9} /><span>{label}</span></>;
            return href.startsWith("/#")
              ? <a className="nav-link" href={href} key={href}>{content}</a>
              : <Link className={`nav-link ${currentView === href ? "active" : ""}`} href={href} key={href}>{content}</Link>;
          })}
        </nav>

        <label className="demo-switcher">
          <span>View demo as</span>
          <span className="select-wrap">
            <select aria-label="View demo as" value={sofiaView ? "/students/sofia-nguyen" : "/"} onChange={(event) => router.push(event.target.value)}>
              <option value="/">Dr. Lina</option>
              <option value="/students/sofia-nguyen">Sofia</option>
            </select>
            <ChevronDown size={14} aria-hidden="true" />
          </span>
        </label>
      </header>
      {children}
    </div>
  );
}
