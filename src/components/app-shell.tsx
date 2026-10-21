"use client";

import { FileSpreadsheet, History, House, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const navigation = [
    { href: "/", label: "Meeting Review", icon: House },
    { href: "/students", label: "Student Directory", icon: Users },
    { href: "/records", label: "Historical Records", icon: History },
    { href: "/import", label: "Import meeting document", icon: FileSpreadsheet },
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="wordmark" href="/" aria-label="SMART-MINDS Weekly Hub home">
          <span className="wordmark-icon" aria-hidden="true">SM</span>
          <span>
            <strong>SMART-MINDS</strong>
            <small>Weekly Hub</small>
          </span>
        </Link>

        <nav className="topnav" aria-label="Main navigation">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
            return <Link className={`nav-link ${active ? "active" : ""}`} href={href} key={href} aria-current={active ? "page" : undefined}><Icon size={15} aria-hidden="true" />{label}</Link>;
          })}
        </nav>

      </header>
      {children}
    </div>
  );
}
