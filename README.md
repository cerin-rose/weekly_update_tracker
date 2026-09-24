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

## Import the historical database

`google-apps-script/Code.gs` is generated from the source-derived `supabase/seed.sql`; it does not make Supabase part of the runtime. To populate the linked Google Sheet:

1. Open the Sheet and select `Extensions` → `Apps Script`.
2. Replace the Apps Script editor contents with `google-apps-script/Code.gs`.
3. Save, select `importHistoricalData`, and run it once. Approve the spreadsheet permission prompt.
4. Deploy `doGet` as a web app with access set to the Vercel server's required access level.
5. Set the deployment URL as `GOOGLE_APPS_SCRIPT_URL` in Vercel if it differs from the built-in URL.

The importer creates normalized tabs for the 20 students, 19 roles, 4 meetings, 88 updates, 45 tasks, 14 projects, 7 events, 26 resources, 20 outreach contacts, 19 outreach interactions, 4 manuscripts, 2 fundraisers, and 15 social-media records. It preserves the Google Form response tab and includes new rows from `Form Responses 1` or `Form Responses` in the bridge response.

If the source seed changes, regenerate the Apps Script with `node scripts/generate-google-apps-script.mjs` before replacing the Apps Script editor contents.

## Development note

The black floating `N` visible in some development screenshots is the Next.js development tools portal injected by `next dev`; it is not application UI. It is absent when the production build is served with `next start`, and the final screenshots were captured from that production server.
