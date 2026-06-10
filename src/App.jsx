import React, { useState } from "react";
import SingleVerify from "./components/SingleVerify.jsx";
import BatchVerify from "./components/BatchVerify.jsx";

const SEAL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="48" fill="#1a2744" stroke="#c8a84b" stroke-width="3"/>
  <circle cx="50" cy="50" r="36" fill="none" stroke="#c8a84b" stroke-width="1.5"/>
  <text x="50" y="46" text-anchor="middle" fill="#c8a84b" font-size="9" font-family="serif" font-weight="bold">U.S. DEPT.</text>
  <text x="50" y="57" text-anchor="middle" fill="#c8a84b" font-size="9" font-family="serif" font-weight="bold">TREASURY</text>
  <text x="50" y="68" text-anchor="middle" fill="#c8a84b" font-size="7" font-family="serif">TTB</text>
  <circle cx="50" cy="28" r="5" fill="#c8a84b"/>
</svg>`;

export default function App() {
  const [tab, setTab] = useState("single");
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("ttb_api_key") || "");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [keySet, setKeySet] = useState(() => !!localStorage.getItem("ttb_api_key"));

  function saveApiKey() {
    const key = apiKeyInput.trim();
    if (!key) return;
    localStorage.setItem("ttb_api_key", key);
    setApiKey(key);
    setKeySet(true);
    setApiKeyInput("");
  }

  function clearApiKey() {
    localStorage.removeItem("ttb_api_key");
    setApiKey("");
    setKeySet(false);
  }

  return (
    <div>
      <header className="site-header">
        <div className="header-top">
          <div className="header-seal" dangerouslySetInnerHTML={{ __html: SEAL_SVG }} />
          <div className="header-text">
            <h1>Alcohol and Tobacco Tax and Trade Bureau</h1>
            <p>Label Verification System — Compliance Division</p>
          </div>
        </div>
        <nav className="header-nav">
          <button className={`nav-tab ${tab === "single" ? "active" : ""}`} onClick={() => setTab("single")}>Single Label</button>
          <button className={`nav-tab ${tab === "batch" ? "active" : ""}`} onClick={() => setTab("batch")}>Batch Upload</button>
          <button className={`nav-tab ${tab === "about" ? "active" : ""}`} onClick={() => setTab("about")}>About</button>
        </nav>
      </header>
      <main className="main-content">
        {!keySet && (
          <div className="api-key-setup">
            <h2>Setup Required</h2>
            <p>This tool uses the Anthropic Claude API to read label images. Enter your API key below to get started. The key is stored in your browser only and is never sent anywhere except directly to Anthropic.</p>
            <div className="api-key-input-row">
              <input
                className="api-key-input"
                type="password"
                placeholder="sk-ant-..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveApiKey()}
              />
              <button className="btn-primary" onClick={saveApiKey} disabled={!apiKeyInput.trim()}>Save Key</button>
            </div>
            <p style={{ marginTop: 10, fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>Get an API key at console.anthropic.com</p>
          </div>
        )}
        {keySet && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <span style={{ fontSize: "0.8rem", color: "var(--gray-400)", alignSelf: "center", marginRight: 10 }}>API key active</span>
            <button className="btn-secondary" style={{ padding: "6px 14px", fontSize: "0.8rem" }} onClick={clearApiKey}>Change Key</button>
          </div>
        )}
        {tab === "single" && (keySet
          ? <SingleVerify apiKey={apiKey} />
          : <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--gray-400)" }}>Enter your API key above to begin verifying labels.</div>
        )}
        {tab === "batch" && (keySet
          ? <BatchVerify apiKey={apiKey} />
          : <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--gray-400)" }}>Enter your API key above to begin verifying labels.</div>
        )}
        {tab === "about" && <AboutTab />}
      </main>
    </div>
  );
}

function AboutTab() {
  return (
    <div className="card">
      <div className="card-title">About This Tool</div>
      <hr className="section-divider" />
      <p style={{ marginBottom: 16, lineHeight: 1.7, color: "var(--gray-800)" }}>
        The TTB Label Verification System is a proof-of-concept prototype built to assist compliance agents in reviewing alcohol beverage label applications. It uses AI vision to extract key fields from label artwork and compare them against submitted application data.
      </p>
      <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--navy)", marginBottom: 8, marginTop: 20 }}>WHAT IT CHECKS</h3>
      <div className="field-results" style={{ marginBottom: 20 }}>
        {[
          ["Brand Name", "Compared against the application's stated brand name"],
          ["Class / Type", "Verified against the designated beverage class and type"],
          ["Alcohol Content", "Checked for match with the declared ABV and proof statement"],
          ["Net Contents", "Verified against the declared bottle size or fill volume"],
          ["Bottler / Producer", "Name and address compared against the application"],
          ["Country of Origin", "Present and matching for import applications"],
          ["Government Warning", "Exact text verified — GOVERNMENT WARNING: must appear in all caps with the correct statutory language"],
        ].map(([label, desc]) => (
          <div key={label} style={{ padding: "10px 14px", borderLeft: "3px solid var(--gold)", background: "var(--gray-50)", borderRadius: "0 4px 4px 0", marginBottom: 6 }}>
            <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--navy)", marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--gray-600)" }}>{desc}</div>
          </div>
        ))}
      </div>
      <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--navy)", marginBottom: 8, marginTop: 20 }}>RESULT MEANINGS</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="badge badge-pass">PASS</span>
          <span style={{ fontSize: "0.875rem", color: "var(--gray-600)" }}>Field matches the application — no action needed</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="badge badge-warn">REVIEW</span>
          <span style={{ fontSize: "0.875rem", color: "var(--gray-600)" }}>Values are similar but differ slightly — agent review recommended</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="badge badge-fail">FAIL</span>
          <span style={{ fontSize: "0.875rem", color: "var(--gray-600)" }}>Clear mismatch detected — label does not match the application</span>
        </div>
      </div>
      <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--navy)", marginBottom: 8, marginTop: 20 }}>LIMITATIONS</h3>
      <p style={{ fontSize: "0.875rem", color: "var(--gray-600)", lineHeight: 1.7 }}>
        This is a prototype. Results flagged as REVIEW or FAIL should always be confirmed by a compliance agent before a determination is issued. This tool does not replace agent judgment.
      </p>
      <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--navy)", marginBottom: 8, marginTop: 20 }}>TECHNICAL NOTES</h3>
      <p style={{ fontSize: "0.875rem", color: "var(--gray-600)", lineHeight: 1.7 }}>
        Label images are sent to the Anthropic Claude API for vision analysis. No images or application data are stored. The API key is held in browser local storage and used only for requests to api.anthropic.com.
      </p>
    </div>
  );
}
