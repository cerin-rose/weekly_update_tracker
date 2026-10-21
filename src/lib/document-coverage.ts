import { CANONICAL_STUDENTS } from "@/lib/meeting-normalization";

export type SourceBlock = {
  id: string;
  section: string;
  owner: string;
  text: string;
};

export type CoverageRow = {
  sourceBlockIds?: string[];
};

export type ImportCoverage = {
  totalBlocks: number;
  coveredBlocks: number;
  missingBlocks: SourceBlock[];
  unknownBlockIds: string[];
  sectionsFound: string[];
  sectionsCovered: string[];
  peopleFound: string[];
  peopleCovered: string[];
  complete: boolean;
};

const SECTION_NAMES = new Set([
  "Outreach",
  "Education",
  "Social Media",
  "Research",
  "Manuscript",
  "Fundraising",
  "Other",
]);

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function exactStudentHeading(value: string) {
  const candidate = clean(value).replace(/:$/, "");
  return CANONICAL_STUDENTS.find((name) => name.toLowerCase() === candidate.toLowerCase()) || "";
}

function isDocumentMetadata(value: string) {
  return /^https?:\/\//i.test(value) || /^SMART-MINDS Master Calendar/i.test(value) || /^\d{1,2}\/\d{1,2}\s+Meeting Agenda$/i.test(value);
}

export function buildSourceBlocks(paragraphs: string[]): SourceBlock[] {
  let section = "General";
  let owner = "";
  let sequence = 0;

  return paragraphs.flatMap((paragraph) => {
    const value = clean(paragraph);
    if (!value || isDocumentMetadata(value)) return [];

    if (SECTION_NAMES.has(value.replace(/:$/, ""))) {
      section = value.replace(/:$/, "");
      owner = "";
      return [];
    }

    const student = exactStudentHeading(value);
    if (student && /:$/.test(value)) {
      owner = student;
      return [];
    }

    sequence += 1;
    return [{ id: `SRC-${String(sequence).padStart(3, "0")}`, section, owner, text: value }];
  });
}

export function coverageReport(blocks: SourceBlock[], rows: CoverageRow[]): ImportCoverage {
  const blockIds = new Set(blocks.map((block) => block.id));
  const coveredIds = new Set(rows.flatMap((row) => row.sourceBlockIds || []).filter((id) => blockIds.has(id)));
  const allReportedIds = new Set(rows.flatMap((row) => row.sourceBlockIds || []));
  const missingBlocks = blocks.filter((block) => !coveredIds.has(block.id));
  const sectionsFound = [...new Set(blocks.map((block) => block.section))];
  const sectionsCovered = sectionsFound.filter((section) => blocks.some((block) => block.section === section && coveredIds.has(block.id)));
  const peopleFound = [...new Set(blocks.map((block) => block.owner).filter(Boolean))];
  const peopleCovered = peopleFound.filter((person) => blocks.some((block) => block.owner === person && coveredIds.has(block.id)));
  const unknownBlockIds = [...allReportedIds].filter((id) => !blockIds.has(id));

  return {
    totalBlocks: blocks.length,
    coveredBlocks: coveredIds.size,
    missingBlocks,
    unknownBlockIds,
    sectionsFound,
    sectionsCovered,
    peopleFound,
    peopleCovered,
    complete: missingBlocks.length === 0 && unknownBlockIds.length === 0,
  };
}
