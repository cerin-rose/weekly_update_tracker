"use client";

import { House, Sprout } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const currentView = pathname;
  const navigation = [{ href: "/", label: "Meeting Review", icon: House }];

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
          {navigation.map(({ href, label, icon: Icon }) => <Link className={`nav-link ${currentView === href ? "active" : ""}`} href={href} key={href}><Icon size={17} />{label}</Link>)}
        </nav>

      </header>
      {children}
    </div>
  );
}
