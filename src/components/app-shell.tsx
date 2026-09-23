"use client";

import { House } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const currentView = pathname;
  const navigation = [
    { href: "/", label: "Meeting Review", icon: House },
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <nav className="topnav" aria-label="Main navigation">
          {navigation.map(({ href, label, icon: Icon }) => {
            return href.startsWith("/#")
              ? <a className="nav-link" href={href} key={href}><Icon size={17} />{label}</a>
              : <Link className={`nav-link ${currentView === href ? "active" : ""}`} href={href} key={href}><Icon size={17} />{label}</Link>;
          })}
        </nav>

      </header>
      {children}
    </div>
  );
}
