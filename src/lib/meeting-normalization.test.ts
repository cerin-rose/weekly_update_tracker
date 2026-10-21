import { describe, expect, it } from "vitest";
import { getDisplayStatus } from "@/lib/display-status";
import { buildSourceBlocks, coverageReport } from "@/lib/document-coverage";
import { studentsFromRosterRows, updatesFromRows } from "@/lib/google-sheets";
import { normalizeProgram, normalizeStatus, normalizeWorkstream, validMeetingDate } from "@/lib/meeting-normalization";
import { consumeRateLimit } from "@/lib/rate-limit";

describe("meeting data normalization", () => {
  it("does not turn a blank or invalid status into on-track", () => {
    expect(normalizeStatus("").value).toBe("");
    expect(getDisplayStatus({ status: "needs-review", questionForDrLina: "", supportNeeded: "" })).toBe("needs-review");
    expect(getDisplayStatus({ status: "on-track", questionForDrLina: "", supportNeeded: "" })).toBe("on-track");
  });

  it("normalizes program and workstream aliases without inventing values", () => {
    expect(normalizeProgram("B-SMART / BMINDS")).toBe("SMART-MINDS");
    expect(normalizeWorkstream("General").value).toBe("Other");
    expect(normalizeWorkstream("Tasks for Next Week").value).toBe("Operations");
  });

  it("keeps inactive roster students available", () => {
    const students = studentsFromRosterRows([{ "Student Name": "Sarah", Active: "No", Program: "BMINDS" }]);
    expect(students).toHaveLength(1);
    expect(students[0].active).toBe(false);
  });

  it("turns non-roster names into meeting-level records", () => {
    const students = studentsFromRosterRows([{ "Student Name": "Sarah", Active: "Yes", Program: "BMINDS" }]);
    const [update] = updatesFromRows([{ "Student Name": "Someone Else", "Week / meeting date": "2026-09-23", Task: "Shared agenda item", "Current status": "" }], students);
    expect(update.recordType).toBe("meeting");
    expect(update.studentName).toBe("");
    expect(update.meetingNotes).toContain("Unmatched source name: Someone Else");
    expect(update.status).toBe("needs-review");
  });

  it("uses the meeting date when a historical timestamp is missing", () => {
    const [update] = updatesFromRows([{ "Student Name": "Sarah", "Week / meeting date": "2026-09-23", Task: "Survey" }], studentsFromRosterRows([{ "Student Name": "Sarah", Active: "Yes", Program: "BMINDS" }]));
    expect(validMeetingDate(update.meetingDate)).toBe("2026-09-23");
    expect(update.submittedAt).toBe("2026-09-23T12:00:00.000Z");
  });

  it("enforces shared and per-client request limits", async () => {
    const namespace = `test-${Date.now()}-${Math.random()}`;
    const options = { namespace, globalLimit: 10, subjectLimit: 2, windowSeconds: 900 };
    const request = () => new Request("https://example.test/api", { headers: { "x-forwarded-for": "203.0.113.10" } });

    expect((await consumeRateLimit(request(), options)).allowed).toBe(true);
    expect((await consumeRateLimit(request(), options)).allowed).toBe(true);
    const blocked = await consumeRateLimit(request(), options);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) expect(blocked.status).toBe(429);
  });

  it("fails closed in production when the shared limiter is not configured", async () => {
    const previousVercel = process.env.VERCEL;
    const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
    const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.VERCEL = "1";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    try {
      const result = await consumeRateLimit(new Request("https://example.test/api"), { namespace: "production-test", globalLimit: 1, subjectLimit: 1, windowSeconds: 900 });
      expect(result.allowed).toBe(false);
      if (!result.allowed) expect(result.status).toBe(503);
    } finally {
      if (previousVercel === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = previousVercel;
      if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
      else process.env.UPSTASH_REDIS_REST_URL = previousUrl;
      if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
      else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
    }
  });

  it("inventories document sections and student ownership before conversion", () => {
    const blocks = buildSourceBlocks([
      "10/21 Meeting Agenda",
      "Outreach",
      "Izzy:",
      "Finalized the script for PA show 3",
      "Research",
      "Sarah:",
      "Created the intern application Google Form",
    ]);

    expect(blocks.map((block) => [block.section, block.owner, block.text])).toEqual([
      ["Outreach", "Izzy", "Finalized the script for PA show 3"],
      ["Research", "Sarah", "Created the intern application Google Form"],
    ]);
  });

  it("reports unmatched source blocks instead of treating partial output as complete", () => {
    const blocks = buildSourceBlocks(["Outreach", "Izzy:", "Script", "Email reminder"]);
    const report = coverageReport(blocks, [{ sourceBlockIds: [blocks[0].id] }]);

    expect(report.complete).toBe(false);
    expect(report.coveredBlocks).toBe(1);
    expect(report.missingBlocks.map((block) => block.text)).toEqual(["Email reminder"]);
  });
});
