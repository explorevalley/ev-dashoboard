import React, { useMemo, useState } from "react";
import { FaRobot, FaMagic, FaCheck, FaRedo } from "react-icons/fa";
import { getAiTemplate } from "./aiFormTemplates";

function safeText(v) {
  return v === undefined || v === null ? "" : String(v);
}

function normalizeByType(value, type) {
  const t = safeText(type).toLowerCase();
  if (value === null || value === undefined) return value;
  if (t.includes("bool")) {
    if (typeof value === "boolean") return value;
    const s = safeText(value).trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes" || s === "on") return true;
    if (s === "false" || s === "0" || s === "no" || s === "off") return false;
    return false;
  }
  if (t.includes("int") || t.includes("number") || t.includes("float") || t.includes("double") || t.includes("numeric")) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const s = safeText(value).trim();
    if (!s) return null;
    const direct = Number(s);
    if (Number.isFinite(direct)) return direct;
    const match = s.match(/-?\d+(\.\d+)?/);
    if (match && Number.isFinite(Number(match[0]))) return Number(match[0]);
    return null;
  }
  if (t.includes("json") || t.includes("object")) {
    if (typeof value === "object" && !Array.isArray(value)) return value;
    try { return JSON.parse(safeText(value)); } catch { return {}; }
  }
  if (t.includes("array")) {
    if (Array.isArray(value)) return value;
    try {
      const parsed = JSON.parse(safeText(value));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return value;
}

function sanitizePatchWithColumns(obj, tableColumns) {
  const cols = Array.isArray(tableColumns) ? tableColumns : [];
  if (!cols.length || !obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
  const out = {};
  const byName = new Map(cols.map((c) => {
    if (typeof c === "string") return [c, { name: c, type: "" }];
    return [safeText(c?.name), c || {}];
  }));
  Object.keys(obj).forEach((k) => {
    if (!byName.has(k)) return;
    const meta = byName.get(k) || {};
    out[k] = normalizeByType(obj[k], meta?.type);
  });
  return out;
}

export default function AIFormJsonAssistant({
  contextKey,
  tableColumns,
  currentForm,
  onApply,
  showTemplate = true,
  showGenerated = true,
  showApplyButton = true
}) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(null);
  const tpl = useMemo(() => getAiTemplate(contextKey, tableColumns), [contextKey, JSON.stringify(tableColumns || [])]);

  const canGenerate = prompt.trim().length >= 5 && !busy;

  const generate = async () => {
    if (!canGenerate) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/ai/form-json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          contextKey,
          prompt: prompt.trim(),
          template: tpl.template,
          currentForm: currentForm || {}
        })
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(safeText(body?.message || body?.error || "AI generation failed"));
      const obj = body?.json && typeof body.json === "object" ? body.json : null;
      if (!obj) throw new Error("AI returned invalid JSON object.");
      setGenerated(obj);
    } catch (e) {
      setError(safeText(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="pane-title">
        <div><FaRobot /> AI JSON Generator ({tpl.title})</div>
        <button
          className="btn small"
          onClick={() => {
            setPrompt("");
            setGenerated(null);
            setError("");
          }}
          disabled={busy}
        >
          <FaRedo /> Reset
        </button>
      </div>
      <div className="small">
        Describe the details. AI will return JSON matching this template and you can apply it to the form.
      </div>
      <div className="mt-10">
        <textarea
          className="textarea"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Example: 3-star riverside hotel in Jibhi, 12 rooms, wifi, parking, family-friendly..."
        />
      </div>
      <div className="mt-10 flex-gap10">
        <button className="btn primary" onClick={generate} disabled={!canGenerate}>
          <FaMagic /> {busy ? "Generating..." : "Generate JSON"}
        </button>
        {generated && showApplyButton ? (
          <button
            className="btn"
            onClick={() => onApply(sanitizePatchWithColumns(generated, tableColumns))}
            disabled={busy}
          >
            <FaCheck /> Apply To Form
          </button>
        ) : null}
      </div>
      {error ? <div className="warn mt-10">{error}</div> : null}
      {showTemplate ? (
        <div className="field full mt-10">
          <label>Template</label>
          <textarea className="textarea json-box" value={JSON.stringify(tpl.template, null, 2)} readOnly />
        </div>
      ) : null}
      {generated && showGenerated ? (
        <div className="field full mt-10">
          <label>Generated JSON</label>
          <textarea className="textarea json-box" value={JSON.stringify(generated, null, 2)} readOnly />
        </div>
      ) : null}
    </div>
  );
}
