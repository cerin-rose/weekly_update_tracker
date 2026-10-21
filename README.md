# SMART-MINDS Weekly Hub

SMART-MINDS Weekly Hub is a professor-facing Next.js review workspace for Dr. Lina Begdache. Meeting documents are uploaded to the Vercel importer, converted into reviewed rows, and saved directly to the Meeting Database in Google Sheets.

## Start the demo

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

- `/` - Dr. Lina’s Meeting Review workspace
- `/login` - Shared-password gate for the review workspace
- `/students` - Canonical student directory, including inactive roster rows
- `/students/[studentId]` - Source-student contribution history
- `/records` - Historical records view
- `/import` - Imports a reviewed meeting document into Meeting Database rows

## Validate

```bash
npm run lint
npm test
npm run build
```

## Scope

This deployment is Dr. Lina’s review workspace. Google Sheets is the only runtime data source. Vercel reads and writes the sheet through the Google Sheets API; Apps Script is not part of the runtime path. The app does not use Supabase at runtime.

## Access control

Student records and the data API are protected by a shared-password session in production. Set `DASHBOARD_ACCESS_PASSWORD` and `DASHBOARD_SESSION_SECRET` in Vercel before deploying. Local development remains open when those variables are absent. There is no student submission page in this application.

## Google Sheets API Setup

Create a Google Cloud service account, enable the Google Sheets API, and share the spreadsheet with the service account email. Set these server-only Vercel variables:

- `GOOGLE_SPREADSHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

The private key must never be exposed to the browser or committed to the repository. In Vercel, represent private-key line breaks as `\\n`; the server restores them before authenticating. The app reads `Meeting Database` and `Students`. `Meeting Database` is the only live update source; `Final Overall` is retained as an archive outside the app's live read path. Approved imports are written to `Meeting Database`.

## Import the historical database

`google-apps-script/Code.gs` is generated from the project’s historical seed data; that build-time source does not become part of the runtime. To populate the linked Google Sheet:

1. Open the Sheet and select `Extensions` → `Apps Script`.
2. Replace the Apps Script editor contents with `google-apps-script/Code.gs`.
3. Save, select `importHistoricalData`, and run it once. Approve the spreadsheet permission prompt.
4. Set the Google Sheets API variables in Vercel and deploy the app.

The importer does not depend on the Apps Script project. The generated script remains available only for the one-time historical seed workflow described above.

If the source seed changes, regenerate the Apps Script with `node scripts/generate-google-apps-script.mjs` before replacing the Apps Script editor contents.

## Word document importer

The `Import Meeting Document` page is a review-first importer. It reads a `.docx`, uses the configured language model to create rows matching Meeting Review, shows a selectable preview, and only then appends approved rows to `Meeting Database`.

To enable it:

1. Configure the Google Sheets API variables above.
2. Add `OPENAI_API_KEY` to Vercel. Optionally set `OPENAI_MODEL`; the default is `gpt-4o-mini`.
3. Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to Vercel. The importer fails closed without them in production.
4. Optionally set `AI_IMPORT_DAILY_LIMIT` and `AI_IMPORT_USER_DAILY_LIMIT`; the defaults are 20 total conversions and 10 per client per day.
5. Redeploy Vercel. The app keeps both the Google credential and OpenAI key on the server; neither is sent to the browser.

The same Redis-compatible store limits login attempts to 5 per client and 50 globally per 15-minute window. The rate-limit code uses standard Redis commands and does not add a proprietary runtime dependency.

The source Drive/Docs URL and selected meeting date are stored on every imported row. Red Word text is marked during extraction so the model can place Dr. Begdache feedback in the feedback field. If the required server settings are absent, the page shows a configuration error instead of pretending that rows were saved.

## Development note

The app intentionally keeps the meeting table read-only. Editing/autosave code is not part of the review workflow; changes belong in Google Sheets or through the reviewed document importer.

## Professor workflow and future enhancements

The intended workflow is deliberately small:

1. The professor signs in.
2. `Meeting Review` shows the organized Meeting Database for the selected meeting.
3. `Student Directory` lists the roster; selecting a student opens their portfolio history.
4. `Historical Records` provides the complete archive.
5. `Import Meeting Document` is used only when a pending meeting document needs to be converted. The LLM creates structured rows, the professor reviews them, and approved rows are appended to `Meeting Database`. They then appear in Meeting Review.

`Final Overall` is retained as an archive outside the app's live read path. `Meeting Database` is the only live update source, and `Students` is the roster source. `Form Responses 1`, `/submit`, and student self-service submission are intentionally outside this application.

For future enhancements, first define the professor workflow and the exact source-of-truth sheet, then add one change at a time: update the data schema, update the normalization layer, update the relevant page, add a regression test, run lint/build, and verify the complete import-to-review path. Do not add a new source, form, or page unless it supports the professor review workflow.
