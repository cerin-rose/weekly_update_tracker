"use client";

import { AlertCircle, CheckCircle2, LoaderCircle } from "lucide-react";
import { useMemo, useState } from "react";

type ImportRow = Record<string, string> & {
  "Student name": string;
  Workstream: string;
  Task: string;
  "Current status": string;
  Event: string;
  "Meeting notes": string;
  "Dr. Begdache feedback": string;
  "Source document": string;
};

function sourceUrl(row: ImportRow) {
  return row["Source document"] || row["Add any relevant links or file names"] || "";
}

function sourceLabel(row: ImportRow) {
  return sourceUrl(row) ? "Open source ↗" : "-";
}

export function DocumentImport() {
  const [file, setFile] = useState<File | null>(null);
  const [meetingDate, setMeetingDate] = useState("");
  const [sourceLink, setSourceLink] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedCount = selected.size;
  const allSelected = rows.length > 0 && selectedCount === rows.length;
  const sourceHost = useMemo(() => {
    try { return new URL(sourceLink).hostname; } catch { return ""; }
  }, [sourceLink]);

  async function previewDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!file) return setError("Choose a Word document first.");
    if (!meetingDate) return setError("Choose the meeting or week date.");
    if (!sourceLink.trim()) return setError("Add the Drive or source document link so it is saved with every row.");

    const form = new FormData();
    form.set("file", file);
    form.set("meetingDate", meetingDate);
    form.set("sourceLink", sourceLink.trim());
    setLoading(true);
    try {
      const response = await fetch("/api/import-document", { method: "POST", body: form });
      const payload = await response.json() as { rows?: ImportRow[]; error?: string };
      if (!response.ok || !payload.rows?.length) throw new Error(payload.error || "No rows were created from this document.");
      setRows(payload.rows);
      setSelected(new Set(payload.rows.map((_, index) => index)));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "The document could not be converted.");
    } finally {
      setLoading(false);
    }
  }

  function toggleRow(index: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((_, index) => index)));
  }

  async function saveRows() {
    const rowsToSave = rows.filter((_, index) => selected.has(index));
    if (!rowsToSave.length) return setError("Select at least one reviewed row to save.");
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const response = await fetch("/api/import-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", rows: rowsToSave })
      });
      const payload = await response.json() as { ok?: boolean; count?: number; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "The rows could not be saved.");
      setSuccess(`${payload.count ?? rowsToSave.length} rows saved to Meeting Database. They will appear in Meeting Review after the next refresh.`);
      setRows([]);
      setSelected(new Set());
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The rows could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return <main className="page-frame import-page">
    <header className="import-titlebar">
      <h1>Meeting Database</h1>
      <span>Import meeting document</span>
    </header>

    {error && <div className="notice notice-error" role="alert"><AlertCircle size={18} /><div><strong>Import needs attention</strong><p>{error}</p></div></div>}
    {success && <div className="notice notice-success" role="status"><CheckCircle2 size={18} /><div><strong>Saved</strong><p>{success}</p></div></div>}

    <section className="import-form-panel" aria-labelledby="import-form-heading">
      <div className="sheet-toolbar">
        <div><strong id="import-form-heading">Import rows</strong><span>Choose the document, date, and source link</span></div>
      </div>
      <div className="import-section-label"><span>Source details</span><small>These values are copied to every imported row</small></div>
      <form className="import-form" onSubmit={previewDocument}>
        <label className="import-file-field"><span>Word document</span><span className="file-picker"><strong>{file?.name || "Choose a .docx file"}</strong><input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => setFile(event.target.files?.[0] || null)} /></span></label>
        <label><span>Meeting date</span><input type="date" value={meetingDate} onChange={(event) => setMeetingDate(event.target.value)} required /></label>
        <label className="import-link-field"><span>Source document URL</span><input type="url" value={sourceLink} onChange={(event) => setSourceLink(event.target.value)} placeholder="https://docs.google.com/document/..." required />{sourceHost && <small>{sourceHost}</small>}</label>
        <div className="import-actions"><button className="button button-primary" type="submit" disabled={loading}>{loading ? <><LoaderCircle className="spin-icon" size={15} /> Reading...</> : "Preview rows"}</button></div>
      </form>
    </section>

    {rows.length > 0 && <section className="import-preview" aria-labelledby="import-preview-heading">
      <div className="sheet-toolbar import-preview-heading"><div><strong id="import-preview-heading">Review rows</strong><span>{selectedCount} of {rows.length} selected</span></div><div className="import-preview-actions"><button className="button button-primary" type="button" onClick={() => void saveRows()} disabled={saving}>{saving ? <><LoaderCircle className="spin-icon" size={15} /> Saving...</> : "Save selected rows"}</button></div></div>
      <p className="import-help">Check ownership, workstream, status, deadline, feedback, and source. Uncheck anything that needs correction before saving.</p>
      <div className="review-list import-review-list"><div className="review-table-wrap"><table className="review-table meeting-view-table import-table"><caption className="sr-only">Rows generated from the Word document</caption><thead><tr><th scope="col"><input type="checkbox" aria-label="Select all rows" checked={allSelected} onChange={toggleAll} /></th><th scope="col">Category</th><th scope="col">Person</th><th scope="col">Task / What they are working on</th><th scope="col">Status</th><th scope="col">Deadline / Meeting</th><th scope="col">Notes</th><th scope="col">Dr. Begdache feedback</th><th scope="col">Source</th></tr></thead><tbody>{rows.map((row, index) => { const link = sourceUrl(row); return <tr key={`${row["Source record ID"] || index}`} className={!row["Student name"] ? "review-row-meeting" : undefined}><td><input type="checkbox" aria-label={`Select row ${index + 1}`} checked={selected.has(index)} onChange={() => toggleRow(index)} /></td><td className="review-cell-workstream">{row.Workstream || "Other"}</td><td>{row["Student name"] || <span className="meeting-level-label">Meeting-level</span>}</td><td><strong className="meeting-task">{row.Task || row["What are your next steps?"] || row["What are you currently working on?"] || "-"}</strong></td><td>{row["Current status"] || "On track"}</td><td>{row.Event || "-"}</td><td>{row["Meeting notes"] || "-"}</td><td className="review-cell-feedback">{row["Dr. Begdache feedback"] || "-"}</td><td>{link ? <a className="table-source" href={link} target="_blank" rel="noreferrer">{sourceLabel(row)}</a> : "-"}</td></tr>; })}</tbody></table></div></div>
    </section>}
  </main>;
}
