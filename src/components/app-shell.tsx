"use client";

import { ChevronDown, House, PenLine, Sprout, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

const navigation = [
  { href: "/", label: "Dr. Lina’s Home", icon: House },
  { href: "/submit", label: "Submit Update", icon: PenLine },
  { href: "/students/sofia-nguyen", label: "Student Profile", icon: UserRound },
];

function viewFromPath(pathname: string) {
  if (pathname === "/submit") return "/submit";
  if (pathname.startsWith("/students")) return "/students/sofia-nguyen";
  return "/";
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const currentView = viewFromPath(pathname);

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
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link className={`nav-link ${currentView === href ? "active" : ""}`} href={href} key={href}>
              <Icon size={15} strokeWidth={1.9} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <label className="demo-switcher">
          <span>View demo as</span>
          <span className="select-wrap">
            <select value={currentView === "/students/sofia-nguyen" ? "/students/sofia-nguyen" : currentView} onChange={(event) => router.push(event.target.value)}>
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
