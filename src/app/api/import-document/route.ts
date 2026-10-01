import { randomUUID } from "node:crypto";
import JSZip from "jszip";
import mammoth from "mammoth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const bridgeUrl = "https://script.google.com/macros/s/AKfycby72N0LTNQ8-f5sCguzf0BvbvW87ngwG5wdy8XaNhaZUl5AFKnn_-oVfwYhM5gpbT-t/exec";
const canonicalStudents = ["Georgi", "Sarah", "Marissa", "Emma", "Gianna", "Zach", "Carolyn", "Ysabel", "Megan", "Serena", "Christos", "Christian", "Alyssa", "Katarina", "Isabella", "Max", "Amalia", "Joaquim", "Izzy", "Cerin"];
const allowedStatuses = ["On track", "Question", "Needs help", "Blocked"];
const allowedWorkstreams = ["Research", "Education", "Outreach", "Communications", "Fundraising", "Manuscript", "Social Media", "Operations", "Website", "Other"];

type ImportRow = {
  "Student name": string;
  "Team / program": string;
  Role: string;
  "Meeting title": string;
  "Week / meeting date": string;
  Workstream: string;
  "What did you complete this week?": string;
  "What are you currently working on?": string;
  "What are your next steps?": string;
  "What question do you have for Dr. Lina?": string;
  "What support do you need?": string;
  "Who did you collaborate with?": string;
  "Add any relevant links or file names": string;
  "Current status": string;
  Project: string;
  Task: string;
  "Task status": string;
  Event: string;
  "Meeting notes": string;
  "Source record ID": string;
  "Source document": string;
  "Source section": string;
  "Dr. Begdache feedback": string;
};

function responseError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

function text(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function decodeXml(value: string) {
  return value
    .replace(/<w:tab\s*\/?>(?:<\/w:tab>)?/gi, "\t")
    .replace(/<w:br\s*\/?>(?:<\/w:br>)?/gi, "\n")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCharCode(parseInt(code, 16)))
    .replace(/<[^>]+>/g, "");
}

async function extractDocument(buffer: Buffer) {
  const rawText = (await mammoth.extractRawText({ buffer })).value.trim();
  let formattedText = rawText;

  try {
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");
    if (documentXml) {
      const paragraphs = [...documentXml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map((match) => {
        const paragraph = match[0];
        const runs = [...paragraph.matchAll(/<w:r\b[\s\S]*?<\/w:r>/g)].map((runMatch) => {
          const run = runMatch[0];
          const runText = decodeXml([...run.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)].map((part) => part[1]).join(""));
          if (!runText) return "";
          const isRed = /<w:color\b[^>]*(?:w:val\s*=\s*["']?(?:FF0000|red)["']?|w:themeColor\s*=\s*["']?accent2["']?)/i.test(run);
          return isRed ? `[RED TEXT: ${runText}]` : runText;
        }).join("");
        return runs.trim();
      }).filter(Boolean);
      if (paragraphs.length) formattedText = paragraphs.join("\n\n");
    }
  } catch (error) {
    console.warn("Could not inspect DOCX formatting; continuing with extracted text", error);
  }

  if (!formattedText) throw new Error("The Word document did not contain readable text.");
  return { rawText, formattedText };
}

function normalizeRows(value: unknown, meetingDate: string, sourceLink: string, fileName: string): ImportRow[] {
  if (!Array.isArray(value)) return [];

  return value.map((candidate) => {
    const row = (candidate && typeof candidate === "object" ? candidate : {}) as Record<string, unknown>;
    const studentName = text(row["Student name"] || row.studentName);
    const workstream = text(row.Workstream || row.category);
    const task = text(row.Task || row.task || row["Task / What they are working on"]);
    const notes = text(row["Meeting notes"] || row.notes);
    const feedback = text(row["Dr. Begdache feedback"] || row.feedback);
    const sourceRecordId = text(row["Source record ID"]) || `IMP-${meetingDate.replaceAll("-", "")}-${randomUUID().slice(0, 8)}`;
    const sourceSection = text(row["Source section"] || row.section);
    const meetingNotes = [notes, feedback ? `Dr. Begdache feedback: ${feedback}` : ""].filter(Boolean).join(" ");

    return {
      "Student name": canonicalStudents.find((name) => name.toLowerCase() === studentName.toLowerCase()) || "",
      "Team / program": text(row["Team / program"] || row.program) || "SMART-MINDS",
      Role: text(row.Role) || "Student contributor",
      "Meeting title": text(row["Meeting title"]) || fileName.replace(/\.[^.]+$/, ""),
      "Week / meeting date": meetingDate,
      Workstream: allowedWorkstreams.includes(workstream) ? workstream : "Other",
      "What did you complete this week?": text(row["What did you complete this week?"] || row.completed),
      "What are you currently working on?": text(row["What are you currently working on?"] || row.workingOn),
      "What are your next steps?": text(row["What are your next steps?"] || row.nextSteps) || task,
      "What question do you have for Dr. Lina?": text(row["What question do you have for Dr. Lina?"] || row.question),
      "What support do you need?": text(row["What support do you need?"] || row.support),
      "Who did you collaborate with?": text(row["Who did you collaborate with?"] || row.collaborators),
      "Add any relevant links or file names": text(row["Add any relevant links or file names"] || row.links) || sourceLink,
      "Current status": allowedStatuses.includes(text(row["Current status"] || row.status)) ? text(row["Current status"] || row.status) : "On track",
      Project: text(row.Project),
      Task: task,
      "Task status": text(row["Task status"] || row.taskStatus),
      Event: text(row.Event || row.deadline),
      "Meeting notes": meetingNotes,
      "Source record ID": sourceRecordId,
      "Source document": sourceLink,
      "Source section": sourceSection || "Not specified",
      "Dr. Begdache feedback": feedback,
    };
  }).filter((row) => row.Task || row["Meeting notes"] || row["What are you currently working on?"] || row["What did you complete this week?"] || row["What are your next steps?"] || row["Student name"]);
}

function systemPrompt() {
  return `You convert SMART-MINDS meeting Word documents into structured Meeting Database rows.

Return only JSON matching the supplied schema. Make one row for each meaningful person-specific task, current work item, completed item, follow-up, meeting, deadline, question, resource, or meeting-level action. Do not combine unrelated tasks.

Rules:
- Use the selected meeting date for every row.
- Use only these canonical student names: ${canonicalStudents.join(", ")}. If a person is not clearly identified, leave Student name blank and make it meeting-level.
- Never infer a student from a name appearing inside another person's activity text.
- Use the section heading or explicit nearby ownership. A row can be meeting-level when it applies to Everyone or the whole team.
- Use Workstream values only from: ${allowedWorkstreams.join(", ")}. Use Other when it cannot be determined.
- Use Current status values only from: ${allowedStatuses.join(", ")}. Do not invent completion.
- Text marked [RED TEXT: ...] comes from red Word text. In these documents red Dr. Begdache text is feedback. Put it in Dr. Begdache feedback, and include any new action in Task when the feedback assigns one.
- Keep the source section, task details, deadlines/meetings, notes, collaborators, questions, support needs, and resource links. Use — when a field is genuinely absent.
- Prefer concise, faithful wording; do not summarize away names, deadlines, URLs, or important context.`;
}

async function generateRows(textForModel: string, meetingDate: string, sourceLink: string, fileName: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured on the server yet.");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.1,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "meeting_database_import",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              rows: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    "Student name": { type: "string" }, "Team / program": { type: "string" }, Role: { type: "string" }, "Meeting title": { type: "string" }, Workstream: { type: "string" },
                    "What did you complete this week?": { type: "string" }, "What are you currently working on?": { type: "string" }, "What are your next steps?": { type: "string" }, "What question do you have for Dr. Lina?": { type: "string" }, "What support do you need?": { type: "string" }, "Who did you collaborate with?": { type: "string" }, "Add any relevant links or file names": { type: "string" }, "Current status": { type: "string" }, Project: { type: "string" }, Task: { type: "string" }, "Task status": { type: "string" }, Event: { type: "string" }, "Meeting notes": { type: "string" }, "Source section": { type: "string" }, "Dr. Begdache feedback": { type: "string" }
                  },
                  required: ["Student name", "Team / program", "Role", "Meeting title", "Workstream", "What did you complete this week?", "What are you currently working on?", "What are your next steps?", "What question do you have for Dr. Lina?", "What support do you need?", "Who did you collaborate with?", "Add any relevant links or file names", "Current status", "Project", "Task", "Task status", "Event", "Meeting notes", "Source section", "Dr. Begdache feedback"]
                }
              }
            },
            required: ["rows"]
          }
        }
      },
      messages: [
        { role: "system", content: systemPrompt() },
        { role: "user", content: `Selected meeting date: ${meetingDate}\nSource document link: ${sourceLink}\nFile name: ${fileName}\n\nDocument text:\n${textForModel}` }
      ]
    })
  });

  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message || `OpenAI returned ${response.status}.`);
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("The language model returned no structured rows.");

  let parsed: unknown;
  try { parsed = JSON.parse(content); } catch { throw new Error("The language model returned invalid structured data."); }
  return normalizeRows((parsed as { rows?: unknown }).rows, meetingDate, sourceLink, fileName);
}

async function saveRows(rows: ImportRow[]) {
  const writeToken = process.env.GOOGLE_APPS_SCRIPT_WRITE_TOKEN;
  if (!writeToken) throw new Error("GOOGLE_APPS_SCRIPT_WRITE_TOKEN is not configured on the server yet.");
  const requestBody = JSON.stringify({ action: "appendMeetingRows", token: writeToken, rows });
  const requestOptions: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: requestBody,
    redirect: "manual",
  };
  let response = await fetch(process.env.GOOGLE_APPS_SCRIPT_URL || bridgeUrl, requestOptions);
  const redirectLocation = response.headers.get("location");
  if (response.status >= 300 && response.status < 400 && redirectLocation) {
    response = await fetch(redirectLocation, requestOptions);
  }
  const payload = await response.json().catch(() => ({})) as { error?: string; ok?: boolean; count?: number };
  if (!response.ok || !payload.ok) throw new Error(payload.error || `The Google Sheets bridge returned ${response.status}.`);
  return payload;
}

export async function POST(request: Request) {
  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      const body = await request.json() as { action?: string; rows?: ImportRow[] };
      if (body.action !== "save" || !Array.isArray(body.rows) || !body.rows.length) return responseError("Choose at least one reviewed row to save.");
      const result = await saveRows(body.rows);
      return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
    }

    const form = await request.formData();
    const file = form.get("file");
    const meetingDate = text(form.get("meetingDate"));
    const sourceLink = text(form.get("sourceLink"));
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".docx")) return responseError("Select a .docx Word document.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(meetingDate)) return responseError("Choose the meeting or week date.");
    if (!sourceLink || !/^https?:\/\//i.test(sourceLink)) return responseError("Add the Google Drive or source document link.");
    const buffer = Buffer.from(await file.arrayBuffer());
    const extracted = await extractDocument(buffer);
    const rows = await generateRows(extracted.formattedText, meetingDate, sourceLink, file.name);
    if (!rows.length) return responseError("No meaningful meeting rows were found in the document.");
    return NextResponse.json({ ok: true, fileName: file.name, meetingDate, sourceLink, extractedCharacterCount: extracted.rawText.length, rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Document import failed", error);
    return responseError(error instanceof Error ? error.message : "Document import failed.", 500);
  }
}
