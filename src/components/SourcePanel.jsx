import { useState } from "react";
import * as api from "../api.js";
import { Book, Sparkle, X } from "./icons.jsx";

// Slide text and speaker notes are stored as one string; notes start at "[notes] ".
function splitNotes(text) {
  const i = text.indexOf("[notes] ");
  return i < 0 ? [text, ""] : [text.slice(0, i).trim(), text.slice(i + 8).trim()];
}

// Imports with a stored PDF open the real slide/page in its own window; older ones show text.
export const hasDoc = (source) => !!source?.doc;
export function openSource(source) {
  window.open(api.docUrl(source), "compendium-source", "width=1100,height=800");
}

// A cached explanation is only valid for the card text it was written for.
const explainKey = (card) => `${card.term}\u0000${card.definition}`;

export default function SourcePanel({ card, source, onUpdate, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!source) return null;

  const [body, notes] = splitNotes(source.text);
  const explanation = card.explainedFor === explainKey(card) ? card.explanation : "";

  const runExplain = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await api.explain({ term: card.term, definition: card.definition, source });
      onUpdate(card.id, { explanation: res.explanation, explainedFor: explainKey(card) });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="source-panel" onClick={(e) => e.stopPropagation()}>
      <div className="source-head">
        <span className="source-loc"><Book size={16} /> {source.loc} <span className="muted">· {source.file}</span></span>
        {onClose && <button className="icon-btn" title="Close" onClick={onClose}><X size={16} /></button>}
      </div>
      {body && <div className="source-text">{body}</div>}
      {notes && <div className="source-notes"><span className="fc-label">Speaker notes</span>{notes}</div>}
      {explanation ? (
        <div className="source-explain"><Sparkle size={16} /><span>{explanation}</span></div>
      ) : (
        <button className="btn btn-sm source-explain-btn" onClick={runExplain} disabled={busy}>
          {busy ? <><span className="spinner dark small" /> Explaining…</> : <><Sparkle size={16} /> Explain from my notes</>}
        </button>
      )}
      {error && <p className="error small">{error}</p>}
    </div>
  );
}

export function SourceChip({ source, open, onClick }) {
  if (!source) return null;
  return (
    <button className={`source-chip ${open ? "active" : ""}`}
      title={hasDoc(source) ? `Open ${source.loc} of ${source.file}` : `From ${source.file}`}
      onClick={(e) => { e.stopPropagation(); hasDoc(source) ? openSource(source) : onClick(); }}>
      <Book size={14} /> {source.loc}
    </button>
  );
}
