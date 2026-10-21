# SMART-MINDS Weekly Hub - current implementation

## Purpose

The Weekly Hub is a professor-facing workspace for Dr. Lina to review current meeting updates, browse the student directory, inspect student portfolios, view historical records, and convert pending meeting documents into organized Meeting Database rows. It uses real Google Sheets rows; it does not use Supabase, mock students, or fictional records at runtime.

## Runtime data flow

```text
Word / Google document upload -> Vercel extraction -> schema -> LLM -> normalization -> review
                                                        ↓
                                              Google Sheets API
                                                        ↓
                         Meeting Database -> Next.js API -> Next.js UI
                         Students roster --/
```

Google Sheets remains the source of truth. Vercel reads `Meeting Database` and `Students` directly through the Google Sheets API. `Meeting Database` is the only live update source; `Final Overall` is retained as an archive outside the app's live read path. Approved document-import rows are appended to `Meeting Database`. Rows are deduplicated only when a stable `Source record ID` is present; similar text is not treated as proof that two updates are duplicates.

Google Sheets remains the source of truth. The browser cache is only a short-lived last-known-good fallback and is never a write store.

## Routes

- `/` - Meeting Review, defaulting to the newest meeting date.
- `/students` - Canonical roster directory. Inactive roster rows remain visible and are marked inactive.
- `/students/[studentId]` - Portfolio-style contribution history for one roster student.
- `/records` - All historical and current records with filters.
- `/import` - Import Meeting Document: review-first DOCX importer for approved historical meeting documents.
- `/login` - Shared-password sign-in for protected app pages and data APIs.

There is no `/operations` route. Operational guidance belongs in this document and in the Google Sheet, not in an unused application page.

## Normalization rules

- Student identity comes only from the canonical roster returned by the API.
- A name not in that roster becomes a meeting-level record and is retained in the note as an unmatched source name.
- Blank or invalid statuses become `Needs review`; they never become `On track`.
- Questions and support requests can raise the display status to `Question` or `Needs help`; an explicit `Blocked` status remains blocked.
- Historical rows use `Week / meeting date` when `Timestamp` is blank.
- `General` maps to `Other`; `Tasks for Next Week` maps to `Operations`.
- Inactive roster students remain in the directory.

## Security controls

Production requires `DASHBOARD_ACCESS_PASSWORD`, `DASHBOARD_SESSION_SECRET`, `GOOGLE_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, and `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`. The middleware protects the dashboard, student pages, historical records, importer, and data APIs. Google credentials remain server-side and are never returned to the browser.

The shared-password login is limited to 5 requests per client and 50 requests globally per 15-minute window. AI imports use the same Redis-compatible store and are limited to 20 conversions per day overall and 10 per client. Production fails closed if the shared rate-limit store is unavailable or not configured.

The importer:

- accepts only `.docx` files with a ZIP/DOCX signature;
- limits uploads to 10 MB;
- limits extracted text to 120,000 characters;
- limits generated rows to 500;
- limits source links to 2,000 characters;
- requires an Upstash Redis-compatible rate-limit store in Vercel production;
- limits AI document conversions to 20 per day overall and 10 per day per client by default (`AI_IMPORT_DAILY_LIMIT` and `AI_IMPORT_USER_DAILY_LIMIT`);
- keeps the OpenAI key server-side; and
- requires review before writing to `Meeting Database`.

Security headers include `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and a restrictive `Permissions-Policy`.

## Google Apps Script historical helper

`google-apps-script/Code.gs` is the only Apps Script file retained. It is a generated helper for the one-time historical sheet seed workflow, not a second application database and not part of the Vercel runtime.

If its source-derived data changes, regenerate it with:

```bash
node scripts/generate-google-apps-script.mjs
```

Do not add the Apps Script bridge URL to the Vercel deployment. The live app uses the Google Sheets API directly.

## Development checks

```bash
npm run lint
npm test
npm run build
```

Tests cover status normalization, roster visibility, invalid-name handling, and timestamp fallback. Browser verification should cover `/`, `/login`, `/students`, `/students/[studentId]`, `/records`, and `/import` on desktop and a 320px-wide viewport.

## Professor workflow

The professor signs in and uses five product areas:

- `Meeting Review` - the current meeting view and primary working page.
- `Student Directory` - the canonical roster, including inactive students.
- `Student Portfolio` - opened by selecting a student from the directory.
- `Historical Records` - the complete organized Meeting Database archive.
- `Import Meeting Document` - the controlled document-import workflow.

When a pending Word meeting document exists, the professor opens `Import Meeting Document`, selects the document date and source link, reviews the LLM-generated rows, and approves the rows to append to `Meeting Database`. The next refresh of `Meeting Review` reads those rows and displays them. The importer is the only application path for adding document-derived rows.

There is no student submission page, no Google Form response integration, and no `Form Responses 1` dependency in the application. Students may continue using any separate shared meeting document process outside this app; this app only organizes the professor's reviewed records.

## Future enhancement process

For a future change, keep this order: clarify the professor-facing outcome, identify the source-of-truth sheet, update the typed schema and normalization rules, update the smallest relevant route/component, add or update regression tests, run lint and build, then verify the full path from source document to Meeting Database to Meeting Review. Avoid adding new forms, APIs, or pages unless they are necessary for the professor's review workflow.
