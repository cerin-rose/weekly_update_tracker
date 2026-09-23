# SMART-MINDS Weekly Hub

## Project Purpose

SMART-MINDS Weekly Hub is an internal weekly documentation and meeting-review system for the SMART-MINDS student leadership team. Students currently update a shared Google Doc during the meeting workflow; the Hub presents the organized Meeting Database archive as a current-week table, historical Records view, and student portfolio.

## Stack

- Next.js with App Router
- TypeScript
- CSS modules are not used; shared presentation lives in `src/app/globals.css`
- Lucide React
- Google Sheets through `/api/weekly-updates`
- The app is read-only for source records; students do not need to complete a second form in the current workflow

## Visual Rules

- Keep the interface calm, warm, academic, trustworthy, health-oriented, and human.
- Use a warm off-white canvas, deep forest green primary color, muted sage surfaces, soft amber for questions, muted coral only for blocked items, and charcoal text.
- Use one modern sans-serif font, 12-16px corner radii, restrained shadows, generous whitespace, and clear typography.
- Do not add gradients, glassmorphism, huge headings, excessive cards or badges, KPI tiles, charts, decorative dashboards, sidebars, generic AI imagery, crowded filter bars, or corporate admin-template styling.

## Scope Restrictions

- The home page is a one-row-per-update review table with filters for meeting, team, workstream, search, discussion items, meeting-level rows, and missing updates.
- Keep `/submit` and source-student profiles aligned with the established review workflow, but do not expand either into a new product area unless a later prompt explicitly asks for it.
- Do not add research-participant data, medical information, or confidential content. Source-authorized student leadership records may be used through the configured database; authentication and access controls are required before production use.
- Keep architecture understandable to a student developer. Create reusable components only when they reduce duplication.

## Data Rules

- Google Sheets and the Apps Script bridge are the only source of student and update records.
- Do not add fictional students, mock updates, demo selectors, or Supabase runtime reads.
- Keep meeting-level rows with blank student names available as meeting-level records.
- Use only canonical student names returned by the roster/API.
- Preserve source record IDs, dates, tasks, questions, links, and attribution information.
- Keep questions and support needs as student-entered discussion context; do not add mentor-response fields to the student workflow.
- Use simple progress language for source documents where available: Done, In progress, and Blocked. Preserve the source value when it uses the existing Current status vocabulary.
- Use the real source student directory as the profile and submit-flow source.
- Keep all student and weekly update fields typed through `src/types/index.ts`.
- Use only the supplied SMART-MINDS source content. Never add research-participant details or invent missing identity fields.

## Testing Expectations

- Run `npm run lint` and `npm run build` before stopping.
- Check `/`, `/submit`, `/operations`, a roster-backed `/students/[studentId]`, and mobile navigation after UI changes.
- Resolve lint, TypeScript, and build errors before reporting completion.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
