import { randomUUID } from "node:crypto";
import JSZip from "jszip";
import mammoth from "mammoth";
import { NextResponse } from "next/server";
import {
  CANONICAL_STUDENTS,
  STATUS_VALUES,
  WORKSTREAMS,
  appendNormalizationNote,
  canonicalStudentName,
  normalizeProgram,
  normalizeStatus,
  normalizeWorkstream,
  validMeetingDate,
} from "@/lib/meeting-normalization";
import { buildSourceBlocks, coverageReport, type SourceBlock } from "@/lib/document-coverage";
import { appendMeetingRows } from "@/lib/google-sheets-server";
import { consumeAiImportQuota } from "@/lib/ai-rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_DOCUMENT_CHARACTERS = 120_000;
const MAX_IMPORT_ROWS = 500;
const MAX_SOURCE_LINK_LENGTH = 2_000;

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
  "Source block IDs": string[];
};

function responseError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return Boolean(origin) && origin === new URL(request.url).origin;
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
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) throw new Error("The uploaded file is not a valid DOCX archive.");
  const rawText = (await mammoth.extractRawText({ buffer })).value.trim();
  let formattedText = rawText;
  let paragraphs = rawText.split(/\n+/).map((paragraph) => paragraph.trim()).filter(Boolean);

  try {
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");
    if (documentXml) {
      const formattedParagraphs = [...documentXml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map((match) => {
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
      if (formattedParagraphs.length) {
        paragraphs = formattedParagraphs;
        formattedText = formattedParagraphs.join("\n\n");
      }
    }
  } catch (error) {
    console.warn("Could not inspect DOCX formatting; continuing with extracted text", error);
  }

  if (!formattedText) throw new Error("The Word document did not contain readable text.");
  if (formattedText.length > MAX_DOCUMENT_CHARACTERS) throw new Error("The Word document is too large to review safely. Split it into smaller meeting documents.");
  return { rawText, formattedText, paragraphs };
}

function normalizeRows(value: unknown, meetingDate: string, sourceLink: string, fileName: string): ImportRow[] {
  if (!Array.isArray(value)) return [];
  if (value.length > MAX_IMPORT_ROWS) throw new Error(`The document produced more than ${MAX_IMPORT_ROWS} rows. Review the source document and split it before importing.`);

  return value.map((candidate) => {
    const row = (candidate && typeof candidate === "object" ? candidate : {}) as Record<string, unknown>;
    const studentName = text(row["Student name"] || row.studentName);
    const workstream = normalizeWorkstream(row.Workstream || row.category);
    const task = text(row.Task || row.task || row["Task / What they are working on"]);
    const notes = text(row["Meeting notes"] || row.notes);
    const feedback = text(row["Dr. Begdache feedback"] || row.feedback);
    const sourceRecordId = text(row["Source record ID"]) || `IMP-${meetingDate.replaceAll("-", "")}-${randomUUID().slice(0, 8)}`;
    const sourceSection = text(row["Source section"] || row.section);
    const sourceBlockIds = Array.isArray(row["Source block IDs"])
      ? row["Source block IDs"].map(text).filter(Boolean)
      : text(row["Source block IDs"] || row.sourceBlockIds).split(/[\s,]+/).filter(Boolean);
    const status = normalizeStatus(row["Current status"] || row.status);
    const meetingNotes = appendNormalizationNote(
      [notes, feedback ? `Dr. Begdache feedback: ${feedback}` : ""].filter(Boolean).join(" "),
      "Original status",
      status.original,
    );

    return {
      "Student name": canonicalStudentName(studentName),
      "Team / program": normalizeProgram(row["Team / program"] || row.program),
      Role: text(row.Role) || "Student contributor",
      "Meeting title": text(row["Meeting title"]) || fileName.replace(/\.[^.]+$/, ""),
      "Week / meeting date": meetingDate,
      Workstream: workstream.value,
      "What did you complete this week?": text(row["What did you complete this week?"] || row.completed),
      "What are you currently working on?": text(row["What are you currently working on?"] || row.workingOn),
      "What are your next steps?": text(row["What are your next steps?"] || row.nextSteps) || task,
      "What question do you have for Dr. Lina?": text(row["What question do you have for Dr. Lina?"] || row.question),
      "What support do you need?": text(row["What support do you need?"] || row.support),
      "Who did you collaborate with?": text(row["Who did you collaborate with?"] || row.collaborators),
      "Add any relevant links or file names": text(row["Add any relevant links or file names"] || row.links) || sourceLink,
      "Current status": status.value && status.value !== "needs-review" ? ({ "on-track": "On track", question: "Question", "needs-help": "Needs help", blocked: "Blocked" } as Record<string, string>)[status.value] || "" : "",
      Project: text(row.Project),
      Task: task,
      "Task status": text(row["Task status"] || row.taskStatus),
      Event: text(row.Event || row.deadline),
      "Meeting notes": meetingNotes,
      "Source record ID": sourceRecordId,
      "Source document": sourceLink,
      "Source section": sourceSection || "Not specified",
      "Dr. Begdache feedback": feedback,
      "Source block IDs": sourceBlockIds,
    };
  }).filter((row) => row.Task || row["Meeting notes"] || row["What are you currently working on?"] || row["What did you complete this week?"] || row["What are your next steps?"] || row["What question do you have for Dr. Lina?"] || row["What support do you need?"] || row["Who did you collaborate with?"] || row["Add any relevant links or file names"] || row.Event || row["Dr. Begdache feedback"] || row["Student name"] || row["Source block IDs"].length);
}

function systemPrompt() {
  return `You convert SMART-MINDS meeting Word documents into structured Meeting Database rows.

Return only JSON matching the supplied schema. Make one row for each meaningful person-specific task, current work item, completed item, follow-up, meeting, deadline, question, resource, or meeting-level action. Do not combine unrelated tasks.

Rules:
- Every supplied Source block ID must appear in at least one output row's Source block IDs array. If a block is context-only, create a meeting-level row with its text in Meeting notes rather than omitting it.
- Do not invent Source block IDs. If multiple blocks belong to one task, include every applicable ID in that row.
- Use the selected meeting date for every row.
- Use only these canonical student names: ${CANONICAL_STUDENTS.join(", ")}. If a person is not clearly identified, leave Student name blank and make it meeting-level.
- Never infer a student from a name appearing inside another person's activity text.
- Use the section heading or explicit nearby ownership. A row can be meeting-level when it applies to Everyone or the whole team.
- Use Workstream values only from: ${WORKSTREAMS.join(", ")}. Use Other when it cannot be determined.
- Use Current status values only from: ${STATUS_VALUES.join(", ")}. Do not invent completion.
- Text marked [RED TEXT: ...] comes from red Word text. In these documents red Dr. Begdache text is feedback. Put it in Dr. Begdache feedback, and include any new action in Task when the feedback assigns one.
- Keep the source section, task details, deadlines/meetings, notes, collaborators, questions, support needs, and resource links. Use — when a field is genuinely absent.
- Prefer concise, faithful wording; do not summarize away names, deadlines, URLs, or important context.`;
}

async function generateRowsForBlocks(blocks: SourceBlock[], meetingDate: string, sourceLink: string, fileName: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured on the server yet.");

  const sourceText = blocks.map((block) => `[${block.id}] Section: ${block.section}; Owner context: ${block.owner || "Meeting-level"}\n${block.text}`).join("\n\n");

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
                    "What did you complete this week?": { type: "string" }, "What are you currently working on?": { type: "string" }, "What are your next steps?": { type: "string" }, "What question do you have for Dr. Lina?": { type: "string" }, "What support do you need?": { type: "string" }, "Who did you collaborate with?": { type: "string" }, "Add any relevant links or file names": { type: "string" }, "Current status": { type: "string" }, Project: { type: "string" }, Task: { type: "string" }, "Task status": { type: "string" }, Event: { type: "string" }, "Meeting notes": { type: "string" }, "Source section": { type: "string" }, "Dr. Begdache feedback": { type: "string" }, "Source block IDs": { type: "array", items: { type: "string" } }
                  },
                  required: ["Student name", "Team / program", "Role", "Meeting title", "Workstream", "What did you complete this week?", "What are you currently working on?", "What are your next steps?", "What question do you have for Dr. Lina?", "What support do you need?", "Who did you collaborate with?", "Add any relevant links or file names", "Current status", "Project", "Task", "Task status", "Event", "Meeting notes", "Source section", "Dr. Begdache feedback", "Source block IDs"]
                }
              }
            },
            required: ["rows"]
          }
        }
      },
      messages: [
        { role: "system", content: systemPrompt() },
        { role: "user", content: `Selected meeting date: ${meetingDate}\nSource document link: ${sourceLink}\nFile name: ${fileName}\n\nSource blocks to convert:\n${sourceText}` }
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

async function generateRows(blocks: SourceBlock[], meetingDate: string, sourceLink: string, fileName: string) {
  const sections = [...new Set(blocks.map((block) => block.section))];
  const sectionRows = await Promise.all(sections.map((section) => generateRowsForBlocks(
    blocks.filter((block) => block.section === section),
    meetingDate,
    sourceLink,
    fileName,
  )));
  return sectionRows.flat();
}

async function saveRows(rows: ImportRow[]) {
  return appendMeetingRows(rows);
}

export async function POST(request: Request) {
  try {
    if (!isSameOrigin(request)) return responseError("This write request must come from the SMART-MINDS app.", 403);
    if (request.headers.get("content-type")?.includes("application/json")) {
      const body = await request.json() as { action?: string; rows?: unknown[]; coverage?: { complete?: boolean } };
      if (body.action !== "save" || !Array.isArray(body.rows) || !body.rows.length) return responseError("Choose at least one reviewed row to save.");
      if (!body.coverage?.complete) return responseError("The import is incomplete. Review the unmatched source blocks before saving.");
      const validatedRows = body.rows.flatMap((row) => {
        const candidate = row && typeof row === "object" ? row as Record<string, unknown> : {};
        const date = validMeetingDate(candidate["Week / meeting date"]);
        const source = text(candidate["Source document"] || candidate["Add any relevant links or file names"]);
        if (!date || !source) return [];
        return normalizeRows([candidate], date, source, text(candidate["Meeting title"]) || "Imported meeting rows");
      });
      if (!validatedRows.length || validatedRows.length !== body.rows.length) return responseError("One or more rows failed validation. Review the rows again before saving.");
      const result = await saveRows(validatedRows);
      return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
    }

    const form = await request.formData();
    const file = form.get("file");
    const meetingDate = text(form.get("meetingDate"));
    const sourceLink = text(form.get("sourceLink"));
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".docx")) return responseError("Select a .docx Word document.");
    if (file.size > MAX_UPLOAD_BYTES) return responseError("The Word document is larger than 10 MB.");
    if (!validMeetingDate(meetingDate)) return responseError("Choose a valid meeting or week date.");
    if (!sourceLink || sourceLink.length > MAX_SOURCE_LINK_LENGTH || !/^https?:\/\//i.test(sourceLink)) return responseError("Add a valid Google Drive or source document link.");
    const buffer = Buffer.from(await file.arrayBuffer());
    const extracted = await extractDocument(buffer);
    const quota = await consumeAiImportQuota(request);
    if (!quota.allowed) return NextResponse.json({ error: quota.message }, { status: quota.status, headers: { "Cache-Control": "no-store", ...(quota.retryAfterSeconds ? { "Retry-After": String(quota.retryAfterSeconds) } : {}) } });
    const sourceBlocks = buildSourceBlocks(extracted.paragraphs);
    const rows = await generateRows(sourceBlocks, meetingDate, sourceLink, file.name);
    const coverage = coverageReport(sourceBlocks, rows.map((row) => ({ sourceBlockIds: row["Source block IDs"] })));
    if (!rows.length) return responseError("No meaningful meeting rows were found in the document.");
    return NextResponse.json({ ok: true, fileName: file.name, meetingDate, sourceLink, extractedCharacterCount: extracted.rawText.length, rows, coverage }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Document import failed", error);
    return responseError(error instanceof Error ? error.message : "Document import failed.", 500);
  }
}
