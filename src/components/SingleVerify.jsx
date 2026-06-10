import React, { useState, useRef } from "react";
import { extractLabelFields, runVerification, fileToBase64 } from "../utils/verify.js";
import FieldResultRow from "./FieldResultRow.jsx";

const EMPTY_FORM = { brand_name: "", class_type: "", alcohol_content: "", net_contents: "", bottler_producer: "", country_of_origin: "" };
const VERDICT_LABEL = { pass: "APPROVED FOR REVIEW", warn: "AGENT REVIEW REQUIRED", fail: "DEFICIENCIES FOUND" };

export default function SingleVerify({ apiKey }) {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [dragging, setDragging] = useState(false);
  const [elapsed, setElapsed] = useState(null);
  const fileRef = useRef();

  function handleFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setResult(null);
    setStatus("idle");
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  function handleFormChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleVerify() {
    if (!imageFile) return;
    setStatus("loading");
    setErrorMsg("");
    setResult(null);
    const t0 = Date.now();
    try {
      const b64 = await fileToBase64(imageFile);
      const extracted = await extractLabelFields(b64, imageFile.type, apiKey);
      const verification = runVerification(extracted, form);
      setElapsed(((Date.now() - t0) / 1000).toFixed(1));
      setResult(verification);
      setStatus("done");
    } catch (err) {
      setErrorMsg(err.message || "Verification failed. Please try again.");
      setStatus("error");
    }
  }

  function handleReset() {
    setImageFile(null);
    setImagePreview(null);
    setForm(EMPTY_FORM);
    setResult(null);
    setStatus("idle");
    setErrorMsg("");
  }

  return (
    <div>
      <div className="two-col">
        <div>
          <div className="card">
            <div className="card-title">Label Image</div>
            <div className="card-subtitle">Upload the label artwork from the application.</div>
            {!imagePreview ? (
              <div
                className={`upload-zone ${dragging ? "dragging" : ""}`}
                onClick={() => fileRef.current.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
              >
                <span className="upload-icon">🏷️</span>
                <h3>Drop label image here</h3>
                <p>or click to browse — JPG, PNG, WebP accepted</p>
                <input ref={fileRef} type="file" accept="image/*" onChange={(e) => handleFile(e.target.files[0])} />
              </div>
            ) : (
              <div className="image-preview-wrap">
                <img src={imagePreview} alt="Label preview" className="image-preview" />
                <button className="remove-btn" onClick={() => { setImageFile(null); setImagePreview(null); setResult(null); setStatus("idle"); }}>x</button>
              </div>
            )}
          </div>
        </div>
        <div>
          <div className="card">
            <div className="card-title">Application Data</div>
            <div className="card-subtitle">Enter the fields from the applicant's submission. Leave blank any fields not provided.</div>
            <div className="field-group">
              <div>
                <label className="field-label">Brand Name</label>
                <input className="field-input" name="brand_name" value={form.brand_name} onChange={handleFormChange} placeholder="e.g., OLD TOM DISTILLERY" />
              </div>
              <div>
                <label className="field-label">Class / Type</label>
                <input className="field-input" name="class_type" value={form.class_type} onChange={handleFormChange} placeholder="e.g., Kentucky Straight Bourbon Whiskey" />
              </div>
              <div>
                <label className="field-label">Alcohol Content</label>
                <input className="field-input" name="alcohol_content" value={form.alcohol_content} onChange={handleFormChange} placeholder="e.g., 45% Alc./Vol. (90 Proof)" />
              </div>
              <div>
                <label className="field-label">Net Contents</label>
                <input className="field-input" name="net_contents" value={form.net_contents} onChange={handleFormChange} placeholder="e.g., 750 mL" />
              </div>
              <div className="field-full">
                <label className="field-label">Bottler / Producer</label>
                <input className="field-input" name="bottler_producer" value={form.bottler_producer} onChange={handleFormChange} placeholder="Name and address" />
              </div>
              <div className="field-full">
                <label className="field-label">Country of Origin <span style={{ fontWeight: 400, color: "var(--gray-400)" }}>— imports only</span></label>
                <input className="field-input" name="country_of_origin" value={form.country_of_origin} onChange={handleFormChange} placeholder="Leave blank for domestic products" />
              </div>
            </div>
            <div className="btn-row">
              <button className="btn-primary" onClick={handleVerify} disabled={!imageFile || status === "loading"}>
                {status === "loading" ? "Analyzing label..." : "Verify Label"}
              </button>
              {(imageFile || result) && <button className="btn-secondary" onClick={handleReset}>Clear</button>}
            </div>
          </div>
        </div>
      </div>

      {status === "error" && (
        <div className="notice" style={{ background: "var(--fail-bg)", borderColor: "var(--fail-border)", color: "var(--fail)" }}>
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      {status === "done" && result && (
        <div className="card">
          <div className="result-header">
            <div>
              <div className="card-title">Verification Results</div>
              <div className="card-subtitle" style={{ marginBottom: 0 }}>Completed in {elapsed}s</div>
            </div>
            <span className={`result-verdict ${result.overallStatus}`}>
              {result.overallStatus === "pass" && "APPROVED FOR REVIEW"}
              {result.overallStatus === "warn" && "AGENT REVIEW REQUIRED"}
              {result.overallStatus === "fail" && "DEFICIENCIES FOUND"}
            </span>
          </div>
          <div className="field-results">
            {result.fields.map((f) => <FieldResultRow key={f.key} field={f} />)}
          </div>
        </div>
      )}
    </div>
  );
}
