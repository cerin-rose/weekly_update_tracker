# SMART-MINDS Weekly Hub

Frontend-only weekly documentation and mentoring demo for Dr. Lina Begdache. The project uses typed fictional data and localStorage to demonstrate meeting review, student submissions, contribution history, and mentor responses.

## Start the demo

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

- `/` - Dr. Lina’s Meeting Review workspace
- `/submit` - Sofia’s Submit Update flow
- `/students/sofia-nguyen` - Sofia’s contribution history
- `/students/[studentId]` - Fictional student profile routes

## Validate

```bash
npm run lint
npm run build
```

## Scope

This is frontend-only and uses typed mock data. There is no database, authentication, external API, AI feature, or paid service. Submitted updates and mentor responses persist in the browser through localStorage.

## Screenshots

Final screenshots are in `screenshots/smart-minds-final-polish/`.

## Development note

The black floating `N` visible in some development screenshots is the Next.js development tools portal injected by `next dev`; it is not application UI. It is absent when the production build is served with `next start`, and the final screenshots were captured from that production server.
