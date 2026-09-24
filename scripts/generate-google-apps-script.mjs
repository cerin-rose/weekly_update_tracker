import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const seedPath = path.join(root, "supabase", "seed.sql");
const outputPath = path.join(root, "google-apps-script", "Code.gs");

const seed = fs.readFileSync(seedPath, "utf8");

function statementEnd(text, start) {
  let quoted = false;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (character === "'") {
      if (quoted && text[index + 1] === "'") {
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ";" && !quoted) {
      return index;
    }
  }
  throw new Error(`Could not find the end of the SQL statement starting at ${start}`);
}

function tupleContents(valuesText) {
  const tuples = [];
  let tupleStart = -1;
  let depth = 0;
  let quoted = false;

  for (let index = 0; index < valuesText.length; index += 1) {
    const character = valuesText[index];
    if (character === "'") {
      if (quoted && valuesText[index + 1] === "'") {
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (quoted) continue;
    if (character === "(" && depth === 0) tupleStart = index + 1;
    if (character === "(") depth += 1;
    if (character === ")") {
      depth -= 1;
      if (depth === 0 && tupleStart >= 0) {
        tuples.push(valuesText.slice(tupleStart, index));
        tupleStart = -1;
      }
    }
  }
  return tuples;
}

function splitFields(tuple) {
  const fields = [];
  let fieldStart = 0;
  let depth = 0;
  let quoted = false;

  for (let index = 0; index < tuple.length; index += 1) {
    const character = tuple[index];
    if (character === "'") {
      if (quoted && tuple[index + 1] === "'") {
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (quoted) continue;
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (character === "," && depth === 0) {
      fields.push(tuple.slice(fieldStart, index).trim());
      fieldStart = index + 1;
    }
  }
  fields.push(tuple.slice(fieldStart).trim());
  return fields;
}

function parseValue(value) {
  if (value.toLowerCase() === "null") return null;
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replaceAll("''", "'");
  }
  throw new Error(`Unsupported SQL value: ${value}`);
}

function parseSeed(text) {
  const tables = {};
  const insertPattern = /insert\s+into\s+public\.([a-z_]+)\s*\(([^)]*)\)\s*values\s*/gi;
  let match;

  while ((match = insertPattern.exec(text))) {
    const table = match[1];
    const columns = match[2].split(",").map((column) => column.trim());
    const end = statementEnd(text, insertPattern.lastIndex);
    const valuesText = text.slice(insertPattern.lastIndex, end);
    const rows = tupleContents(valuesText).map((tuple) => {
      const values = splitFields(tuple).map(parseValue);
      if (values.length !== columns.length) {
        throw new Error(`${table}: expected ${columns.length} values, received ${values.length}`);
      }
      return Object.fromEntries(columns.map((column, index) => [column, values[index]]));
    });
    tables[table] = [...(tables[table] ?? []), ...rows];
    insertPattern.lastIndex = end + 1;
  }

  return tables;
}

const tables = parseSeed(seed);
const counts = Object.fromEntries(Object.entries(tables).map(([table, rows]) => [table, rows.length]));

const generated = `// Generated from supabase/seed.sql. Run \"importHistoricalData\" once in Apps Script.\n// Do not edit DATA manually; rerun scripts/generate-google-apps-script.mjs when the source changes.\n\nconst SPREADSHEET_ID = \"1NZM8v_hWtAh54GDy2A1r4kGog3LJyYynwEJvGdMt3E0\";\nconst DATA = ${JSON.stringify(tables, null, 2)};\nconst COUNTS = ${JSON.stringify(counts, null, 2)};\n\nconst TABLES = [\n  [\"Students\", \"students\"],\n  [\"Roles\", \"roles\"],\n  [\"Student Roles\", \"student_roles\"],\n  [\"Meetings\", \"meetings\"],\n  [\"Projects\", \"projects\"],\n  [\"Project Members\", \"project_members\"],\n  [\"Weekly Updates\", \"student_updates\"],\n  [\"Tasks\", \"tasks\"],\n  [\"Events\", \"events\"],\n  [\"Event Participants\", \"event_participants\"],\n  [\"Resources\", \"resources\"],\n  [\"Survey Campaigns\", \"survey_campaigns\"],\n  [\"Survey Goals\", \"survey_goals\"],\n  [\"Outreach Contacts\", \"outreach_contacts\"],\n  [\"Outreach Interactions\", \"outreach_interactions\"],\n  [\"Manuscripts\", \"manuscripts\"],\n  [\"Manuscript Authors\", \"manuscript_authors\"],\n  [\"Fundraisers\", \"fundraisers\"],\n  [\"Social Media\", \"social_media_content\"]\n];\n\nfunction onOpen() {\n  SpreadsheetApp.getUi()\n    .createMenu(\"SMART-MINDS\")\n    .addItem(\"Import historical database\", \"importHistoricalData\")\n    .addItem(\"Show source counts\", \"showSourceCounts\")\n    .addToUi();\n}\n\nfunction spreadsheet() {\n  return SpreadsheetApp.openById(SPREADSHEET_ID);\n}\n\nfunction importHistoricalData() {\n  const book = spreadsheet();\n  TABLES.forEach(([sheetName, sourceTable]) => {\n    const rows = DATA[sourceTable] || [];\n    const sheet = book.getSheetByName(sheetName) || book.insertSheet(sheetName);\n    sheet.clear();\n    if (!rows.length) return;\n\n    const headers = Object.keys(rows[0]);\n    const values = [headers, ...rows.map((row) => headers.map((header) => row[header] ?? \"\"))];\n    sheet.getRange(1, 1, values.length, headers.length).setValues(values);\n    sheet.setFrozenRows(1);\n    sheet.getRange(1, 1, 1, headers.length).setFontWeight(\"bold\").setBackground(\"#dfe9de\");\n    sheet.autoResizeColumns(1, headers.length);\n  });\n\n  writeStudentsRoster(book);\n  writeWeeklyUpdates(book);\n  writeInstructions(book);\n  SpreadsheetApp.getUi().alert(\"Imported \" + TABLES.length + \" database tabs from the source seed.\");\n}\n\nfunction writeStudentsRoster(book) {\n  const sheet = book.getSheetByName(\"Students\");\n  const rolesById = Object.fromEntries(DATA.roles.map((role) => [role.id, role]));\n  const roleByStudentId = Object.fromEntries(DATA.student_roles.map((assignment) => [assignment.student_id, rolesById[assignment.role_id]]));\n  const headers = [\"Student ID\", \"Student Name\", \"Team / program\", \"Active\", \"Joined date\", \"Role\", \"Current focus\"];\n  const rows = DATA.students.map((student) => {\n    const role = roleByStudentId[student.id];\n    return [student.id, student.display_name, student.team_program, student.active ? \"Yes\" : \"No\", student.joined_date || \"\", role ? role.name : \"Student contributor\", \"\"];\n  });\n  sheet.clear();\n  sheet.getRange(1, 1, rows.length + 1, headers.length).setValues([headers, ...rows]);\n  sheet.setFrozenRows(1);\n  sheet.getRange(1, 1, 1, headers.length).setFontWeight(\"bold\").setBackground(\"#dfe9de\");\n  sheet.autoResizeColumns(1, headers.length);\n}\n\nfunction writeWeeklyUpdates(book) {\n  const sheet = book.getSheetByName(\"Weekly Updates\");\n  const students = Object.fromEntries(DATA.students.map((student) => [student.id, student.display_name]));\n  const meetings = Object.fromEntries(DATA.meetings.map((meeting) => [meeting.id, meeting.meeting_date]));\n  const headers = [\"Update ID\", \"Timestamp\", \"Student name\", \"Week / meeting date\", \"Workstream\", \"What did you complete this week?\", \"What are you currently working on?\", \"What are your next steps?\", \"What question do you have for Dr. Lina?\", \"What support do you need?\", \"Who did you collaborate with?\", \"Add any relevant links or file names\", \"Current status\", \"Project ID\", \"Source record ID\"];\n  const rows = DATA.student_updates.map((update) => {\n    const meetingDate = meetings[update.meeting_id] || \"\";\n    const text = update.update_text || \"\";\n    return [update.id, meetingDate ? meetingDate + \"T12:00:00.000Z\" : \"\", students[update.student_id] || update.student_id, meetingDate, update.category, update.activity_type === \"completed\" ? text : \"\", update.activity_type === \"working_on\" ? text : \"\", update.activity_type === \"next_steps\" ? text : \"\", update.activity_type === \"question\" ? text : \"\", update.activity_type === \"support\" ? text : \"\", \"\", \"\", update.status, update.project_id || \"\", update.source_record_id || \"\"];\n  });\n  sheet.clear();\n  sheet.getRange(1, 1, rows.length + 1, headers.length).setValues([headers, ...rows]);\n  sheet.setFrozenRows(1);\n  sheet.getRange(1, 1, 1, headers.length).setFontWeight(\"bold\").setBackground(\"#dfe9de\");\n  sheet.autoResizeColumns(1, headers.length);\n}\n\nfunction writeInstructions(book) {\n  const sheet = book.getSheetByName(\"README\") || book.insertSheet(\"README\", 0);\n  sheet.clear();\n  sheet.getRange(1, 1, 8, 2).setValues([\n    [\"SMART-MINDS database\", \"Historical source data imported from supabase/seed.sql\"],\n    [\"Workflow\", \"Students submit through the linked Google Form; the response tab remains separate.\"],\n    [\"App bridge\", \"Deploy this Apps Script as a web app and set GOOGLE_APPS_SCRIPT_URL in Vercel.\"],\n    [\"Historical updates\", \"Weekly Updates contains the normalized source records for all meetings.\"],\n    [\"Source meetings\", \"2026-08-19, 2026-08-26, 2026-09-02, 2026-09-09\"],\n    [\"Source counts\", JSON.stringify(COUNTS)],\n    [\"Form responses\", \"Do not rename or delete the Google Form response tab.\"],\n    [\"Last import\", new Date().toISOString()]\n  ]);\n  sheet.getRange(1, 1, 1, 2).setFontWeight(\"bold\").setBackground(\"#dfe9de\");\n  sheet.autoResizeColumns(1, 2);\n}\n\nfunction showSourceCounts() {\n  SpreadsheetApp.getUi().alert(JSON.stringify(COUNTS, null, 2));\n}\n\nfunction tableRows(sheetName) {\n  const sheet = spreadsheet().getSheetByName(sheetName);\n  if (!sheet || sheet.getLastRow() < 2) return [];\n  const values = sheet.getDataRange().getDisplayValues();\n  const headers = values.shift();\n  return values.filter((row) => row.some(Boolean)).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || \"\"])));\n}\n\nfunction doGet() {\n  const updates = tableRows(\"Weekly Updates\");\n  const students = tableRows(\"Students\");\n  return ContentService.createTextOutput(JSON.stringify({ students: students, updates: updates, rows: updates, counts: COUNTS })).setMimeType(ContentService.MimeType.JSON);\n}\n`;

const legacyDoGet = [
  "function doGet() {",
  "  const updates = tableRows(\"Weekly Updates\");",
  "  const students = tableRows(\"Students\");",
  "  return ContentService.createTextOutput(JSON.stringify({ students: students, updates: updates, rows: updates, counts: COUNTS })).setMimeType(ContentService.MimeType.JSON);",
  "}"
].join("\n");
const liveResponseDoGet = [
  "function formResponseRows() {",
  "  const names = [\"Form Responses 1\", \"Form Responses\"];",
  "  for (const name of names) {",
  "    const rows = tableRows(name);",
  "    if (rows.length) return rows;",
  "  }",
  "  return [];",
  "}",
  "",
  "function databaseRows() {",
  "  const finalRows = tableRows(\"Final Overall\");",
  "  if (finalRows.length) return finalRows;",
  "  const meetingRows = tableRows(\"Meeting Database\");",
  "  if (meetingRows.length) return meetingRows.concat(formResponseRows());",
  "  return tableRows(\"Weekly Updates\").concat(formResponseRows());",
  "}",
  "",
  "function fallbackStudents(rows) {",
  "  const rolesById = Object.fromEntries(DATA.roles.map((role) => [role.id, role]));",
  "  const rolesByStudentId = Object.fromEntries(DATA.student_roles.map((assignment) => [assignment.student_id, rolesById[assignment.role_id]]));",
  "  const sourceStudents = Object.fromEntries(DATA.students.map((student) => [student.display_name.toLowerCase(), student]));",
  "  const output = {};",
  "  rows.forEach((row) => {",
  "    const name = row[\"Student name\"] || row[\"Student Name\"];",
  "    if (!name || output[name.toLowerCase()]) return;",
  "    const sourceStudent = sourceStudents[name.toLowerCase()];",
  "    const role = sourceStudent ? rolesByStudentId[sourceStudent.id] : null;",
  "    output[name.toLowerCase()] = {",
  "      \"Student ID\": sourceStudent ? sourceStudent.id : \"sheet-student-\" + name.toLowerCase().replace(/[^a-z0-9]+/g, \"-\"),",
  "      \"Student Name\": name,",
  "      \"Team / program\": sourceStudent ? sourceStudent.team_program : (row[\"Team / program\"] || row.Program || \"SMART-MINDS\"),",
  "      Active: \"Yes\",",
  "      Role: role ? role.name : (row.Role || \"Student contributor\"),",
  "      \"Current focus\": \"\"",
  "    };",
  "  });",
  "  return Object.values(output);",
  "}",
  "",
  "function doGet() {",
  "  const updates = databaseRows();",
  "  const sheetStudents = tableRows(\"Students\");",
  "  const students = sheetStudents.length ? sheetStudents : fallbackStudents(updates);",
  "  return ContentService.createTextOutput(JSON.stringify({ students: students, updates: updates, rows: updates, counts: COUNTS })).setMimeType(ContentService.MimeType.JSON);",
  "}"
].join("\n");
const generatedWithLiveResponses = generated.replace(legacyDoGet, liveResponseDoGet);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, generatedWithLiveResponses);
console.log(`Generated ${outputPath}`);
console.log(JSON.stringify(counts, null, 2));
