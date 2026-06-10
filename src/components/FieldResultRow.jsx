import React, { useState } from "react";

const STATUS_LABELS = { pass: "PASS", warn: "REVIEW", fail: "FAIL", missing: "N/A" };
const STATUS_CLASS = { pass: "status-pass", warn: "status-warn", fail: "status-fail", missing: "status-missing" };

export default function FieldResultRow({ field }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`field-result-row ${field.status}`}>
      <div className="field-name">{field.label}</div>
      <div className="field-value">
        <span className="label">On Label</span>
        {field.extracted || <em style={{ color: "var(--gray-400)" }}>Not detected</em>}
      </div>
      <div className="field-value">
        <span className="label">Application</span>
        {field.key === "government_warning"
          ? <span style={{ fontSize: "0.8rem", color: "var(--gray-600)" }}>[Standard TTB warning text]</span>
          : field.submitted || <em style={{ color: "var(--gray-400)" }}>Not provided</em>
        }
      </div>
      <div style={{ textAlign: "right" }}>
        <span className={`field-status ${STATUS_CLASS[field.status]}`}>{STATUS_LABELS[field.status]}</span>
        {field.note && (
          <div style={{ marginTop: 4 }}>
            <button className="detail-toggle" onClick={() => setExpanded((e) => !e)}>
              {expanded ? "hide note" : "see note"}
            </button>
          </div>
        )}
      </div>
      {expanded && field.note && (
        <div className="notes-text" style={{ gridColumn: "1 / -1" }}>{field.note}</div>
      )}
    </div>
  );
}
