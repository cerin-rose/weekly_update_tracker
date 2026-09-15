# SMART-MINDS Weekly Hub

## Project Overview

SMART-MINDS Weekly Hub is a frontend prototype for weekly contribution tracking and mentoring. It gives Dr. Lina a focused way to review student updates, identify questions or blockers, and respond. Students can submit weekly updates and review their contribution history.

The current demo uses six fictional student leaders, typed mock data, and browser localStorage. It is deployed through Vercel as a workflow and visual prototype.

## Visual Design

### Colors

- Page background: warm ivory `#f7f4ee`
- Main surface: soft white `#fffdf8`
- Primary forest green: `#214b3b`
- Dark forest text: `#17372b`
- Main text: `#292d2b`
- Neutral supporting text: `#706d66`
- Sage: `#708576`
- Sage surface: `#e9efe8`
- Dividers: `#e4dfd5`
- Question accent: amber `#9a6828` / `#fff5df`
- Blocked and support accent: coral `#ae6258` / `#fff0ec`

### Branding and Layout

- The SMART-MINDS wordmark uses a small forest-green sprout mark as the visual signature.
- Navigation uses simple text links with a thin forest-green active underline.
- The interface uses a system sans-serif typeface with a restrained editorial scale.
- Page titles, names, decisions, and actions use dark forest green for clear hierarchy.
- Supporting information uses warm neutral gray rather than repeated pale green surfaces.
- Open layouts, whitespace, and subtle dividers provide most of the structure.
- Small controls use approximately 6-8px radii. Larger grouped surfaces use approximately 12-14px radii.
- The design avoids gradients, glassmorphism, decorative dashboards, excessive shadows, and unnecessary icons.

## Header and Navigation

The shared header includes:

- SMART-MINDS wordmark and Weekly Hub label
- Text-based primary navigation
- Compact `Demo view` selector

### Dr. Lina View

- `Meeting review`
- `Student directory`

### Sofia View

- `Submit update`
- `My history`

Student Directory is a global destination rather than a repeated tab inside Meeting Review. On mobile, the wordmark and demo selector remain in the first row and navigation moves to a second horizontally accessible row.

## Meeting Review

The Home route has one primary purpose: identify which student updates need attention, open an update, and respond.

### Review Header

- Page title: `Wednesday Review`
- Subtle meeting metadata such as `Sep 16 · BMINDS`
- Short description of the review task

### Meeting Toolbar

The toolbar keeps related controls in one compact line:

- Previous and next meeting buttons
- Meeting date selector
- Team selector
- Workstream selector
- Optional date range control

The demo opens on the BMINDS team for the Sep 16, 2026 meeting, showing the intended review context.

### Search and Contextual Counts

- Search is a compact utility control aligned to the right.
- Counts appear as one contextual line rather than equal KPI cards.
- The initial BMINDS view displays `2/2 submitted · 1 needs response · 0 missing`.

### Review Tabs

- `Needs response`
- `All updates`
- `Missing`

Tabs are simple text controls with a thin active underline. They remain keyboard navigable and horizontally accessible on small screens.

### Review Records

Each record prioritizes the student and the meaningful update content:

- Student initials and name
- Role, team, and workstream as quiet metadata below the name
- Completed work
- Question or support request
- Response state
- Operational status
- Meeting date
- Short `View update` action

Rows use subtle dividers instead of individual cards. The Missing view shows students who did not submit for the selected meeting and their most recent submission date when available.

## Student Directory

Student Directory is opened from the global navigation. Its purpose is to find a student, understand their role and current focus, and open their history.

Each directory row shows:

- Student name and initials
- Role, program, and workstream in one metadata line
- Current focus as the central content
- Compact status
- `View history` action

The directory uses open rows and a small role filter rather than a grid of profile cards.

## Update Detail and Mentor Response

Selecting `View update` opens an inline detail section containing:

- Completed work
- Working on now
- Next steps
- Question for Dr. Lina
- Support needed
- Collaborators and resources
- Submission date and time
- Mentor response editor
- Resolution status
- Optional follow-up date

The detail view uses editorial sections and amber or coral side accents for questions and support needs. Mentor responses are currently saved in browser localStorage.

## Status Logic

The shared `getDisplayStatus` function calculates the operational status in this order:

1. `Blocked` when the stored status is blocked
2. `Needs help` when Support needed contains text
3. `Question` when Question for Dr. Lina contains text
4. `On track` when no active question or support request exists

Status is communicated through a labeled dot and text, not color alone. The same logic is used across Meeting Review, update history, student profiles, response calculations, and contextual counts.

## Submit Update

The Submit Update route has one primary purpose: help a student complete and submit the weekly record.

Implemented elements:

- Page title: `Submit weekly update`
- Short instruction: `Share what moved forward before Wednesday’s meeting.`
- Sofia’s identity row with role, team, and workstream
- Meeting date selector
- Workstream selector
- Completed work field
- Current work field
- Next steps field
- Status selector
- Question for Dr. Lina field
- Support needed field
- Collapsed `Additional context` section for optional collaborators and resources
- One primary `Submit update` action
- Recent updates history

The form uses clear labels, moderate input heights, visible focus states, and a single-column layout on mobile. Submitted updates are saved to localStorage and appear in the review workspace and Sofia’s history.

## Student Profile and My History

The profile route has one primary purpose: help a student understand their current focus and review prior contributions.

Implemented elements:

- Student initials and name
- Role, program, and workstream in one metadata line
- Current status
- Current focus section
- `Submit update` action
- Weekly record list
- Collapsed history filters revealed through `Filter history`
- Expandable contribution records
- Mentor responses when available

Expanded records show completed work, current work, next steps, questions, support needs, collaborators, resources, and status. History rows use separators and whitespace instead of repeated cards.

## Technical Implementation

- Framework: Next.js App Router
- Language: TypeScript and TSX
- Styling: CSS in `src/app/globals.css`
- Icons: Lucide React used only for meaningful controls and the brand mark
- Data: typed fictional data in `src/data/mock-data.ts`
- Persistence: browser localStorage only
- Shared status logic: `src/lib/display-status.ts`
- Update persistence: `src/lib/update-storage.ts`
- Hosting: Vercel

## Version Roadmap

### 1. Demo Version - Current State

The current deployed version demonstrates the interface, information hierarchy, and core workflow.

Implemented:

- Calm SMART-MINDS editorial visual system
- Dr. Lina’s Meeting Review workspace
- Meeting, team, workstream, search, and date range controls
- Needs response, All updates, and Missing views
- Global Student Directory destination
- Six fictional students and sample weekly updates
- Student profiles and contribution history
- Sofia’s Submit Update flow
- Mentor response and resolution workflow
- Shared status calculation
- Responsive desktop, tablet, and mobile layouts
- Browser localStorage for demo persistence

Current limitation:

- Vercel hosts the Next.js frontend, but the demo has no shared application server or database.
- localStorage data is limited to the browser where it was created.
- Different students and Dr. Lina cannot currently share live records across devices.
- Only fictional data should be used in this version.

### 2. MVP - Minimum Usable Pilot

The MVP should support a small approved pilot with real users and limited real data.

Add:

- Approved program copy, teams, workstreams, meeting schedule, and deadlines
- Student and mentor authentication
- Server-side create, read, edit, and response operations
- Shared database records for users, meetings, updates, responses, and statuses
- Role-based permissions
- Server-side validation and status calculation
- Cross-device data access
- Submission confirmation and basic error states
- Basic notifications for submissions and mentor responses
- Accessibility testing with approved content

### Recommended MVP Architecture

```text
Student or mentor browser
          |
          v
Next.js application on Vercel
          |
          v
Next.js Route Handlers under src/app/api/
          |
          v
Supabase Auth and PostgreSQL
          |
          +--> Row Level Security for permissions
          +--> Database backups
          +--> Optional notification service
```

Vercel can continue hosting both the Next.js frontend and serverless Route Handlers. Supabase is recommended for the MVP because it provides managed PostgreSQL, authentication, Row Level Security, and backups without requiring a separate rented server to be maintained.

Keep all Supabase credentials and other secrets in Vercel environment variables. Do not write credentials into the repository.

### 3. Real-World Production Version

The production version should support reliable ongoing use and approved student information.

#### Server and Data Layer

- Protected server/API layer using Next.js Route Handlers or a separate backend
- Managed PostgreSQL with migrations, backups, and recovery procedures
- Tables for users, roles, teams, meetings, updates, responses, follow-ups, and audit events
- Server-side status derivation
- Input validation, rate limiting, structured logs, and error handling
- Draft saving, editing rules, deletion rules, and data-retention policies

#### Authentication and Permissions

- Secure sign-in for students, mentors, and administrators
- Role-based access control
- Student access limited to their own updates and history
- Mentor access limited to approved teams and meetings
- Administrator controls for users, teams, meetings, and content
- Protected API routes and secure session handling

#### Workflow and Operations

- Notifications for submissions, mentor responses, reminders, and follow-up dates
- Response history and audit trail
- Missing-update reminders
- Approved export or print views
- Loading, empty, error, and success states
- Uptime, server-error, and database monitoring
- Automated backups and tested recovery

#### Privacy and Security

- Privacy review before adding real student information
- No medical, research-participant, or confidential information without approved safeguards
- Secure environment variables and database credentials
- Documented retention, deletion, and access policies
- Accessibility testing with keyboard and screen readers

### Coolify Alternative

Coolify on a rented VPS is appropriate when self-hosting and infrastructure control are explicit requirements. It requires additional responsibility for firewall rules, operating system updates, SSL, monitoring, backups, migrations, and incident recovery.

If Coolify is selected, keep the application and database separated:

```text
Users
  |
  v
Coolify VPS
  |
  +--> Next.js application and API
  |
  v
Managed PostgreSQL provider
```

Do not run the production application and database together on one inexpensive VPS unless a tested backup and recovery process is already in place. For this project, Vercel plus Supabase is the recommended first production path.

## Workflow Pipeline

```text
Student prepares update
        |
        v
Student submits weekly contribution
        |
        v
Update is validated and saved
        |
        v
Dr. Lina reviews the selected meeting
        |
        v
Dr. Lina responds to questions or support needs
        |
        v
Student views the response in My History
        |
        v
Update is resolved or followed up
```

In the demo, validation and persistence happen in the browser. In the MVP and production versions, protected server routes and a shared database handle these steps.

## Deployment Pipeline

```text
Code changes
     |
     v
GitHub repository
     |
     v
Lint, tests, and production build
     |
     v
Vercel deployment
     |
     v
Production website
     |
     v
Monitoring and maintenance
```

The current demo is built and deployed through Vercel. A production pipeline must also apply database migrations, configure environment variables, run automated tests, verify permissions, confirm backups, and monitor the deployed application.

## Production Launch Checklist

- Approve all content and replace fictional data.
- Configure authentication, database, server routes, and Vercel environment variables.
- Apply database migrations and seed only approved non-sensitive data.
- Test student, mentor, and administrator permissions.
- Test desktop, tablet, mobile, keyboard, screen reader, and browser-console behavior.
- Verify validation, notifications, backups, recovery, and audit records.
- Run `npm run lint` and `npm run build`.
- Deploy through the existing Vercel project and monitor the first release.
