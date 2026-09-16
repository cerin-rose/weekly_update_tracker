# SMART-MINDS Weekly Hub

SMART-MINDS Weekly Hub is a Next.js weekly documentation and mentoring workspace for Dr. Lina Begdache and the SMART-MINDS student leadership team. It uses Supabase/PostgreSQL for shared records and realtime updates.

## Start the demo

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

- `/` - Dr. Lina’s Meeting Review workspace
- `/submit` - Source-student Submit Update flow
- `/students/[studentId]` - Source-student contribution history
- `/operations` - Task board, projects, outreach, surveys, and calendar

## Validate

```bash
npm run lint
npm run build
```

## Scope

Supabase is the authoritative data source. If it is not configured, the app shows an unavailable-data state rather than sample records.

## Supabase Setup

1. Create a Supabase project.
2. Open the Supabase SQL Editor and run `supabase/migrations/20260916000000_initial_schema.sql`.
3. Populate the private Supabase project from the authorized local source import workflow. Do not commit the real-data importer or source records to this public repository.
4. Copy `.env.example` to `.env.local` and add the project URL and publishable key.
5. Add the same public variables to the Vercel project before deploying.

The migration creates normalized tables for students, roles, meetings, student updates, tasks, projects, events, resources, surveys, outreach, manuscripts, fundraisers, and social-media content. The current database policies still need to be replaced with authenticated, role-specific policies before production use.

## Development note

The black floating `N` visible in some development screenshots is the Next.js development tools portal injected by `next dev`; it is not application UI. It is absent when the production build is served with `next start`, and the final screenshots were captured from that production server.
