# SMART-MINDS Weekly Hub

## Project Overview

SMART-MINDS Weekly Hub is a frontend-only weekly contribution and mentoring demo for Dr. Lina and six fictional student leaders. It allows Dr. Lina to review weekly submissions, identify missing updates, and respond to student questions. Sofia can submit updates and review her contribution history.

## Visual Design

### Colors

- Page background: warm off-white `#f6f5ef`
- Main surface: soft white `#fffefa`
- Sage surface: `#edf4ee`
- Soft neutral surface: `#f3f5ef`
- Primary forest green: `#214b3b`
- Dark forest text: `#18392e`
- Sage labels and icons: `#6d8a78`
- Main charcoal text: `#26342f`
- Secondary muted text: `#728079`
- Dividers and borders: `#dfe6de`
- Question and needs-help accent: warm amber `#a46f29` / `#fff4df`
- Blocked and support accent: muted coral `#b86d61` / soft coral background

### Branding and Layout

- The header logo uses a forest-green sprout icon.
- The wordmark reads `SMART-MINDS` with `Weekly Hub` below it.
- The interface uses a clean system sans-serif font.
- The layout uses generous whitespace, subtle dividers, restrained rounded corners, and minimal shadows.
- Labels use sentence case instead of excessive uppercase text.
- The design avoids gradients, charts, decorative dashboards, and unnecessary visual effects.

## Header and Navigation

The header includes:

- SMART-MINDS logo and Weekly Hub label
- Role-sensitive demo selector
- Primary navigation

### Dr. Lina View

- `Meeting Review`
- `Student Directory`

### Sofia View

- `Submit Update`
- `My History`

On mobile, the logo and demo selector appear in the first row. Navigation appears in a second row with all items reachable and no page-level horizontal overflow.

## Dr. Lina Meeting Review Page

The Home route is presented as `Wednesday Meeting Review`.

### Review Header

- Greeting: `Good morning, Dr. Lina`
- Page title: `Wednesday Meeting Review`
- Description explaining that contributions, questions, and support needs can be reviewed for the selected meeting

### Review Controls

- Meeting date selector with four Wednesday meeting dates
- Previous and next meeting arrow buttons
- Team filter: All teams, B-SMART, BMINDS, SMART-MINDS
- Workstream filter: Research, Education, Outreach, Communications, Fundraising, Manuscript, Social Media
- Student and contribution search field
- `Date range` button with From date, To date, Apply, and Clear controls

### Summary Information

The page displays:

- `4 of 6 submitted`
- Number of updates needing a response
- Number of missing updates

### Review Tabs

- `Needs response`
- `All updates`
- `Missing updates`
- `Student directory`

The tabs are keyboard navigable and horizontally scrollable on small screens.

### Update Records

Each review record shows:

- Student initials and name
- Student role
- Team and workstream
- Completed work
- Question or support request
- Response state
- Operational status
- Meeting date
- `View update` action

The Missing updates view shows students who did not submit for the selected meeting and their last submission date when available.

### Update Detail and Mentor Response

Selecting `View update` opens a detailed section containing:

- Completed
- Working on now
- Next steps
- Question for Dr. Lina
- Support needed
- Collaborators
- Resource links
- Submission date and time
- Mentor response editor
- Resolution status
- Optional follow-up date

Mentor responses are saved in browser localStorage and remain available after reload.

## Status Display Logic

The displayed operational status is calculated by the shared `getDisplayStatus` function. Stored student selections are preserved, but the interface displays status in this priority order:

1. `Blocked` when the stored status is blocked
2. `Needs help` when Support needed contains text
3. `Question` when Question for Dr. Lina contains text
4. `On track` when no active question or support request exists

Status colors and labels are used consistently on Meeting Review, Submit Update history, Student Profile, response calculations, and summary information.

## Submit Update Page

The Submit Update route includes:

- Title: `Submit your weekly update`
- Subtitle: `Share your progress before Wednesday’s meeting.`
- Sofia’s identity card with initials, role, team, and workstream
- Meeting date selector
- Workstream selector
- Completed work field
- Current work field
- Next steps field
- Status selector
- Question for Dr. Lina field
- Support needed field
- Optional Collaborators field
- Optional Resources field
- One clear `Submit update` button
- Recent updates history

On desktop, Question and Support needed appear side by side. On mobile, the form becomes one column with readable labels and large touch targets.

Submitted updates are saved to localStorage and appear in the dashboard and Sofia’s profile history.

## Student Profile / My History

The profile page includes:

- Full-width student identity header
- Student initials, name, role, team, and workstream
- Current focus panel
- `Submit a new update` action
- Date filters
- Workstream filter
- Status filter
- Expandable weekly contribution history

Expanded entries show the contribution sections as readable text inside one primary entry surface. Questions use amber, support requests use coral, and collaborators/resources appear as simple metadata.

## Technical Implementation

- Framework: Next.js App Router
- Language: TypeScript and TSX
- Styling: CSS in `src/app/globals.css`
- Icons: Lucide React
- Data: typed fictional data in `src/data/mock-data.ts`
- Persistence: browser localStorage only
- Shared status logic: `src/lib/display-status.ts`
- Update persistence: `src/lib/update-storage.ts`

## Version Roadmap

### 1. Demo Version - Current State

The current deployed demo is a frontend prototype designed to show the workflow and visual direction.

Implemented:

- Dr. Lina’s Meeting Review workspace
- Meeting date navigation
- Team, workstream, role, search, and date filters
- Needs response, All updates, Missing updates, and Student directory tabs
- Six fictional students and sample weekly updates
- Missing-update scenarios
- Student profile and contribution history
- Submit Update form for Sofia
- Mentor response and resolution workflow
- Shared operational status logic
- Responsive desktop and mobile layouts
- Browser localStorage for submissions and mentor responses

Technical limitation:

- Vercel currently serves the Next.js frontend, but there is no application server or shared database.
- localStorage only saves data in the current browser. Different students and Dr. Lina would not see the same updates across devices.
- The student data is fictional and the demo is not ready for confidential information.

### 2. MVP - Minimum Usable Pilot

The MVP should support a small approved pilot with real users and a limited amount of real data.

Add:

- Approved B-SMART copy, team names, meeting schedule, and workstreams
- A real student identity and role selection flow
- Server-side API routes for creating, reading, editing, and responding to updates
- A small database for students, weekly updates, mentor responses, statuses, and meeting dates
- Basic authentication for students and Dr. Lina
- Permission rules so students only see their own history and Dr. Lina sees the approved review workspace
- Server-side validation for required fields and status logic
- Shared data across browsers and devices instead of localStorage-only behavior
- Submission confirmation and basic error messages
- Basic email or in-app notification when an update is submitted or answered
- Final accessibility and mobile testing with approved content

Recommended MVP deployment approach:

- Keep the existing Next.js application and Vercel project.
- Add Next.js Route Handlers under `src/app/api/` for the server endpoints.
- Connect those routes to an approved hosted PostgreSQL database.
- Keep secrets in Vercel environment variables, never in source files.

### 3. Real-World Production Version

The production version should be designed for reliable ongoing use by student leaders and mentors.

#### Server and Data Layer

- Production API/server layer using Next.js Route Handlers or a separate approved backend service
- PostgreSQL database with migrations and backups
- Database tables for users, roles, teams, meetings, updates, responses, follow-ups, and audit events
- Server-side status derivation so the client cannot override operational status
- Input validation, rate limiting, error handling, and structured server logs
- Draft saving, editing windows, deletion rules, and data-retention rules

#### Authentication and Permissions

- Secure sign-in for students, mentors, and administrators
- Role-based access control
- Student access limited to their own submissions and history
- Mentor access limited to approved teams and meetings
- Administrator controls for users, teams, meetings, and content
- Secure session management and protected API routes

#### Workflow Features

- Email notifications for new submissions, mentor responses, and follow-up dates
- Response history and audit trail
- Reminder system for missing updates
- Export or print view for approved reports
- Search and filtering across historical meetings
- Clear loading, empty, error, and success states

#### Privacy and Operations

- Privacy review before using real student information
- No medical, research-participant, or confidential information without approved safeguards
- Secure environment variables and database credentials
- Automated backups and recovery plan
- Monitoring for uptime, failed requests, and database errors
- Accessibility review with keyboard and screen-reader testing
- Content review process for status labels, instructions, and mentor guidance

#### Production Launch Checklist

- Approve all content and replace fictional data.
- Configure authentication, database, server routes, and Vercel environment variables.
- Run migrations and seed only approved non-sensitive data.
- Test permissions with student, mentor, and administrator accounts.
- Test mobile, desktop, keyboard, screen reader, and browser-console behavior.
- Verify backups, error handling, notifications, and audit records.
- Run `npm run lint` and `npm run build`.
- Deploy through the existing Vercel project and monitor the first release.

## Workflow Pipeline

The SMART-MINDS Weekly Hub follows this workflow:

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
Dr. Lina responds to questions or support requests
        |
        v
Student views the response in My History
        |
        v
Update is resolved or followed up
```

In the current demo, validation and persistence happen in the browser using typed mock data and localStorage. In the MVP and production versions, these steps will be handled by protected server routes and a shared database.

## System Architecture

### Current Demo Architecture

```text
Student or mentor browser
          |
          v
Next.js frontend on Vercel
          |
          +--> Mock TypeScript data
          |
          +--> Browser localStorage
```

The current deployment demonstrates the interface and workflow. Because data is stored in localStorage, it is available only in the browser where it was created.

### MVP and Production Architecture

```text
Student or mentor browser
          |
          v
Next.js frontend on Vercel
          |
          v
Authentication and protected API routes
          |
          v
PostgreSQL database
          |
          +--> Email or in-app notifications
          |
          +--> Audit logs and monitoring
          |
          +--> Backups and recovery
```

The server layer will validate requests, enforce permissions, calculate operational status, and connect the application to shared database records. Vercel can host the Next.js frontend and serverless Route Handlers, while the database should use an approved hosted PostgreSQL provider.

## Deployment Pipeline

```text
Code changes
     |
     v
GitHub repository
     |
     v
Lint and production build
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

For the current demo, deployment consists of building the Next.js application and publishing it through Vercel. For the production version, the pipeline must also apply database migrations, configure environment variables, run automated tests, verify permissions, and monitor the deployed application.
