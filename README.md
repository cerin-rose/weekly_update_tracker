# SMART-MINDS Weekly Hub

SMART-MINDS Weekly Hub is a Next.js weekly documentation and mentoring workspace for Dr. Lina Begdache and the SMART-MINDS student leadership team. Students submit through Google Forms, responses are stored in Google Sheets, and the Vercel app reads the sheet through an Apps Script bridge.

## Start the demo

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

- `/` - Dr. Lina’s Meeting Review workspace
- `/submit` - Sends students to the Google Form weekly update intake
- `/students/[studentId]` - Source-student contribution history
- `/operations` - Google Sheet task-database setup guidance

## Validate

```bash
npm run lint
npm run build
```

## Scope

This deployment is Dr. Lina’s review workspace. Google Sheets is the authoritative source, and new Google Form submissions are read through the Apps Script bridge at `/api/weekly-updates`. Students enter updates through the Google Form at `/submit`.

## Google Form Setup

The Apps Script web app reads the linked response Sheet and returns JSON rows. Vercel can override the built-in Apps Script URL with `GOOGLE_APPS_SCRIPT_URL` if the deployment URL changes. Keep the Apps Script deployment available to the Vercel server and do not expose private spreadsheet edit access.

## Development note

The black floating `N` visible in some development screenshots is the Next.js development tools portal injected by `next dev`; it is not application UI. It is absent when the production build is served with `next start`, and the final screenshots were captured from that production server.
