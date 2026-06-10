import React, { useState, useRef } from "react";
import { extractLabelFields, runVerification, fileToBase64 } from "../utils/verify.js";
import FieldResultRow from "./FieldResultRow.jsx";

const CONCURRENCY = 4;

export default function BatchVerify({ apiKey }) {
  const [items, setItems] = useState([]);
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  function addFiles(fileList) {
    const newItems = Array.from(fileList).filter((f) => f.type.startsWith("image/")).map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
      status: "queued",
      result: null,
      error: null,
    }));
    setItems((prev) => [...prev, ...newItems]);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (selected === id) setSelected(null);
  }

  async function processItem(item) {
    try {
      const b64 = await fileToBase64(item.file);
      const extracted = await extractLabelFields(b64, item.file.type, apiKey);
      const result = runVerification(extracted, {});
      return { ...item, status: "done", result };
    } catch (err) {
      return { ...item, status: "error", error: err.message || "Processing failed." };
    }
  }

  async function runBatch() {
    const queued = items.filter((i) => i.status === "queued");
    if (queued.length === 0) return;
    setRunning(true);
    setItems((prev) => prev.map((i) => (i.status === "queued" ? { ...i, status: "processing" } : i)));
    const toProcess = items.filter((i) => i.status === "queued" || i.status === "processing");
    for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
      const batch = toProcess.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map((item) => processItem(item)));
      setItems((prev) => prev.map((item) => results.find((r) => r.id === item.id) || item));
    }
    setRunning(false);
  }

  const queuedCount = items.filter((i) => i.status === "queued").length;
  const doneCount = items.filter((i) => i.status === "done").length;
  const failCount = items.filter((i) => i.status === "done" && i.result?.overallStatus === "fail").length;
  const warnCount = items.filter((i) => i.status === "done" && i.result?.overallStatus === "warn").length;
  const passCount = items.filter((i) => i.status === "done" && i.result?.overallStatus === "pass").length;
  const errorCount = items.filter((i) => i.status === "error").length;
  const processingCount = items.filter((i) => i.status === "processing").length;
  const progress = items.length > 0 ? Math.round((doneCount + errorCount) / items.length * 100) : 0;
  const selectedItem = items.find((i) => i.id === selected);

  return (
    <div>
      <div className="card">
        <div className="card-title">Batch Upload</div>
        <div className="card-subtitle">Upload multiple label images at once. Select any label in the grid to see its full results.</div>
        <div
          className={`upload-zone ${dragging ? "dragging" : ""}`}
          onClick={() => fileRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          style={{ padding: "24px" }}
        >
          <span className="upload-icon">📦</span>
          <h3>Drop label images here</h3>
          <p>Select multiple files at once — JPG, PNG, WebP</p>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={(e) => addFiles(e.target.files)} />
        </div>

        {items.length > 0 && (
          <>
            {(doneCount > 0 || errorCount > 0) && (
              <div className="stats-bar">
                <div className="stat-item"><span className="stat-number">{items.length}</span><span className="stat-label">Total</span></div>
                <div className="stat-item"><span className="stat-number" style={{ color: "var(--pass)" }}>{passCount}</span><span className="stat-label">Passed</span></div>
                <div className="stat-item"><span className="stat-number" style={{ color: "var(--warn)" }}>{warnCount}</span><span className="stat-label">Review</span></div>
                <div className="stat-item"><span className="stat-number" style={{ color: "var(--fail)" }}>{failCount}</span><span className="stat-label">Failed</span></div>
                {errorCount > 0 && (
                  <div className="stat-item"><span className="stat-number" style={{ color: "var(--gray-400)" }}>{errorCount}</span><span className="stat-label">Errors</span></div>
                )}
              </div>
            )}
            {running && (
              <div style={{ marginTop: 12, marginBottom: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--gray-600)", marginBottom: 6 }}>
                  <span>Processing {processingCount} label{processingCount !== 1 ? "s" : ""} simultaneously...</span>
                  <span>{doneCount + errorCount} of {items.length} complete</span>
                </div>
                <div className="progress-bar-wrap"><div className="progress-bar-fill" style={{ width: `${progress}%` }} /></div>
              </div>
            )}
            <div className="btn-row">
              {queuedCount > 0 && (
                <button className="btn-primary" onClick={runBatch} disabled={running}>
                  {running ? "Running..." : `Verify ${queuedCount} Label${queuedCount !== 1 ? "s" : ""}`}
                </button>
              )}
              <button className="btn-secondary" onClick={() => { setItems([]); setSelected(null); }} disabled={running}>Clear All</button>
            </div>
            <div className="batch-grid" style={{ marginTop: 20 }}>
              {items.map((item) => (
                <div
                  key={item.id}
                  className="batch-item"
                  style={{ cursor: "pointer", outline: selected === item.id ? "2px solid var(--navy)" : "none", outlineOffset: 2 }}
                  onClick={() => setSelected(selected === item.id ? null : item.id)}
                >
                  <div className="batch-item-header">
                    <span className="batch-item-name" title={item.file.name}>{item.file.name}</span>
                    <StatusBadge status={item.status} result={item.result} />
                    {!running && (
                      <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gray-400)", fontSize: "0.8rem", padding: "0 4px" }} onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}>x</button>
                    )}
                  </div>
                  <div className="batch-item-body">
                    <img src={item.preview} alt={item.file.name} />
                    <div className="batch-summary">
                      {item.status === "done" && item.result && (
                        item.result.overallStatus === "pass"
                          ? <span style={{ color: "var(--pass)" }}>All fields verified</span>
                          : item.result.fields.filter((f) => f.status !== "pass" && f.status !== "missing").map((f) => (
                              <span key={f.key} style={{ color: f.status === "fail" ? "var(--fail)" : "var(--warn)" }}>{f.label}: {f.status}</span>
                            ))
                      )}
                      {item.status === "error" && <span style={{ color: "var(--fail)" }}>Processing error</span>}
                      {item.status === "queued" && <span>Waiting to process</span>}
                      {item.status === "processing" && <span>Analyzing...</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {selectedItem && selectedItem.status === "done" && selectedItem.result && (
        <div className="card">
          <div className="result-header">
            <div>
              <div className="card-title">{selectedItem.file.name}</div>
              <div className="card-subtitle" style={{ marginBottom: 0 }}>Field-by-field results</div>
            </div>
            <span className={`result-verdict ${selectedItem.result.overallStatus}`}>
              {selectedItem.result.overallStatus === "pass" && "PASSED"}
              {selectedItem.result.overallStatus === "warn" && "REVIEW REQUIRED"}
              {selectedItem.result.overallStatus === "fail" && "DEFICIENCIES FOUND"}
            </span>
          </div>
          <div className="field-results">
            {selectedItem.result.fields.map((f) => (
              <FieldResultRow key={f.key} field={f} />
            ))}
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--gray-400)", marginTop: 16 }}>
            Note: In batch mode, application data fields are not pre-filled. Use the single label view to verify against specific application data.
          </p>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, result }) {
  if (status === "queued") return <span className="badge badge-processing">Queued</span>;
  if (status === "processing") return <span className="badge badge-processing">Processing</span>;
  if (status === "error") return <span className="badge badge-fail">Error</span>;
  if (status === "done" && result) {
    const cls = { pass: "badge-pass", warn: "badge-warn", fail: "badge-fail" }[result.overallStatus];
    const label = { pass: "Pass", warn: "Review", fail: "Fail" }[result.overallStatus];
    return <span className={`badge ${cls}`}>{label}</span>;
  }
  return null;
}
