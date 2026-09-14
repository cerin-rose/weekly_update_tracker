import type { ReactNode } from "react";

interface PageShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function PageShell({ eyebrow, title, description, children }: PageShellProps) {
  return (
    <main className="page-frame">
      <div className="page-intro">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {children}
    </main>
  );
}
