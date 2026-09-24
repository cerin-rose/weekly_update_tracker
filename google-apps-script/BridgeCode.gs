const SPREADSHEET_ID = "1NZM8v_hWtAh54GDy2A1r4kGog3LJyYynwEJvGdMt3E0";
const CANONICAL_STUDENTS = {
  Georgi: "SMART-MINDS",
  Sarah: "BMINDS",
  Marissa: "BMINDS",
  Emma: "B-SMART",
  Gianna: "B-SMART",
  Zach: "SMART-MINDS",
  Carolyn: "SMART-MINDS",
  Ysabel: "B-SMART",
  Megan: "B-SMART",
  Serena: "B-SMART",
  Christos: "SMART-MINDS",
  Christian: "B-SMART",
  Alyssa: "B-SMART",
  Katarina: "SMART-MINDS",
  Isabella: "SMART-MINDS",
  Max: "BMINDS",
  Amalia: "BMINDS",
  Joaquim: "BMINDS",
  Izzy: "B-SMART",
  Cerin: "SMART-MINDS"
};

function doGet() {
  const finalRows = readSheet("Final Overall");
  const meetingRows = readSheet("Meeting Database");
  const formRows = readSheet("Form Responses 1");
  const sourceRows = finalRows.length ? finalRows : meetingRows;
  const updates = sourceRows.length
    ? sourceRows.filter(keepRow)
    : formRows.filter(hasFormContent);
  const students = readSheet("Students").length
    ? readSheet("Students")
    : buildStudents(updates);

  return ContentService
    .createTextOutput(JSON.stringify({ updates, rows: updates, students }))
    .setMimeType(ContentService.MimeType.JSON);
}

function spreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function readSheet(sheetName) {
  const sheet = spreadsheet().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];

  const values = sheet.getDataRange().getDisplayValues();
  const headers = values.shift();
  return values
    .filter((row) => row.some(Boolean))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])));
}

function getValue(row, names) {
  const wanted = Array.isArray(names) ? names : [names];
  for (const name of wanted) {
    const matchingHeader = Object.keys(row).find((header) => header.toLowerCase() === name.toLowerCase());
    if (matchingHeader && String(row[matchingHeader]).trim()) return String(row[matchingHeader]).trim();
  }
  return "";
}

function keepRow(row) {
  if (getValue(row, "Source record ID")) return true;
  return hasFormContent(row);
}

function hasFormContent(row) {
  const fields = [
    "Student name",
    "Workstream",
    "What did you complete this week?",
    "What are you currently working on?",
    "What are your next steps?",
    "What is still pending or needs follow-up?",
    "What question do you have for Dr. Lina?",
    "What support do you need?",
    "Who did you collaborate with?",
    "Add any relevant links or file names"
  ];
  return fields.some((field) => getValue(row, field));
}

function normalizeProgram(value) {
  const program = value.toUpperCase();
  if (program.includes("B-SMART") && program.includes("BMINDS")) return "SMART-MINDS";
  if (program.includes("B-SMART")) return "B-SMART";
  if (program.includes("BMINDS")) return "BMINDS";
  if (program.includes("SMART-MINDS")) return "SMART-MINDS";
  return "SMART-MINDS";
}

function studentId(name) {
  return "sheet-student-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function buildStudents(rows) {
  const students = {};
  const canonicalNames = Object.keys(CANONICAL_STUDENTS);
  rows.forEach((row) => {
    const name = getValue(row, ["Student name", "Student Name", "Name"]);
    const canonicalName = canonicalNames.find(
      (candidate) => candidate.toLowerCase() === name.toLowerCase()
    );
    if (!canonicalName || students[canonicalName.toLowerCase()]) return;
    students[canonicalName.toLowerCase()] = {
      "Student ID": studentId(canonicalName),
      "Student Name": canonicalName,
      "Team / program": CANONICAL_STUDENTS[canonicalName],
      Active: "Yes",
      Role: getValue(row, "Role") || "Student contributor",
      "Current focus": getValue(row, ["What are your next steps?", "Next Steps", "Task"])
    };
  });
  canonicalNames.forEach((canonicalName) => {
    if (students[canonicalName.toLowerCase()]) return;
    students[canonicalName.toLowerCase()] = {
      "Student ID": studentId(canonicalName),
      "Student Name": canonicalName,
      "Team / program": CANONICAL_STUDENTS[canonicalName],
      Active: "Yes",
      Role: "Student contributor",
      "Current focus": ""
    };
  });
  return canonicalNames.map((name) => students[name.toLowerCase()]);
}
