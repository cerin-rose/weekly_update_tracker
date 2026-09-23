# SMART-MINDS Weekly Hub

## Project Purpose

This is a small approval demo for Dr. Lina Begdache. SMART-MINDS Weekly Hub is an internal weekly documentation and mentoring system for B-SMART and BMINDS student leaders. Students will record weekly contributions before Wednesday meetings, and Dr. Lina will review progress, questions, next steps, and support needs.

## Stack

- Next.js with App Router
- TypeScript
- CSS modules are not used; shared presentation lives in `src/app/globals.css`
- Lucide React
- Google Sheets through `/api/weekly-updates`
- localStorage only for mentor responses that are intentionally local to the review browser

## Visual Rules

- Keep the interface calm, warm, academic, trustworthy, health-oriented, and human.
- Use a warm off-white canvas, deep forest green primary color, muted sage surfaces, soft amber for questions, muted coral only for blocked items, and charcoal text.
- Use one modern sans-serif font, 12-16px corner radii, restrained shadows, generous whitespace, and clear typography.
- Do not add gradients, glassmorphism, huge headings, excessive cards or badges, KPI tiles, charts, decorative dashboards, sidebars, generic AI imagery, crowded filter bars, or corporate admin-template styling.

## Scope Restrictions

- Dr. Lina’s Home is now a functional approval-demo review experience with three tabs, inline update details, and local mentor responses.
- Keep `/submit` and source-student profiles aligned with the established review workflow, but do not expand either into a new product area unless a later prompt explicitly asks for it.
- Do not add research-participant data, medical information, or confidential content. Source-authorized student leadership records may be used through the configured database; authentication and access controls are required before production use.
- Keep architecture understandable to a student developer. Create reusable components only when they reduce duplication.

## Data Rules

- Google Sheets and the Apps Script bridge are the only source of student and update records.
- Do not add fictional students, mock updates, demo selectors, or Supabase runtime reads.
- Keep meeting-level rows with blank student names available as meeting-level records.
- Use only canonical student names returned by the roster/API.
- Preserve source record IDs, dates, tasks, questions, links, and attribution information.
- Use the real source student directory as the profile and submit-flow source.
- Keep all student and weekly update fields typed through `src/types/index.ts`.
- Use only the supplied SMART-MINDS source content. Never add research-participant details or invent missing identity fields.

## Testing Expectations

- Run `npm run lint` and `npm run build` before stopping.
- Check `/`, `/submit`, `/operations`, a roster-backed `/students/[studentId]`, and mobile navigation after UI changes.
- Resolve lint, TypeScript, and build errors before reporting completion.
