import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Book, Pencil, Rotate, Shuffle, Star } from "./icons.jsx";
import SourcePanel, { hasDoc, openSource } from "./SourcePanel.jsx";

// Deterministic shuffle so order stays stable across re-renders.
function seededShuffle(arr, seed) {
  const a = arr.slice();
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const isTyping = (el) =>
  el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);

export default function Flashcard({ cards, sources = {}, onUpdate, onToggleStar, frontSide = "term", shuffleByDefault = false }) {
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [dir, setDir] = useState(0); // -1 prev, 1 next: drives the slide-in animation
  const [shuffleSeed, setShuffleSeed] = useState(() => (shuffleByDefault ? ((Math.random() * 2 ** 31) | 0) || 1 : 0)); // 0 = unshuffled
  const [starredOnly, setStarredOnly] = useState(false);
  const [done, setDone] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ term: "", definition: "" });
  const [sourceOpen, setSourceOpen] = useState(false);

  const orderKey = cards.map((c) => c.id + (starredOnly && c.starred ? "*" : "")).join(",");
  const order = useMemo(() => {
    const ids = cards.filter((c) => !starredOnly || c.starred).map((c) => c.id);
    return shuffleSeed ? seededShuffle(ids, shuffleSeed) : ids;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderKey, starredOnly, shuffleSeed]);

  const total = order.length;
  const index = Math.min(pos, Math.max(0, total - 1));
  const card = cards.find((c) => c.id === order[index]);
  const source = card?.sourceId ? sources[card.sourceId] : null;
  const anySource = cards.some((c) => c.sourceId && sources[c.sourceId]);

  useEffect(() => {
    if (pos !== index) setPos(index);
  }, [pos, index]);

  // The source panel belongs to one card; close it when moving on.
  useEffect(() => {
    setSourceOpen(false);
  }, [card?.id, done]);

  // Turn off "starred only" automatically once nothing is starred.
  useEffect(() => {
    if (starredOnly && !cards.some((c) => c.starred)) setStarredOnly(false);
  }, [cards, starredOnly]);

  const go = useCallback(
    (delta) => {
      if (editing || total === 0) return;
      if (done) {
        if (delta < 0) setDone(false);
        return;
      }
      const next = index + delta;
      if (next >= total) return setDone(true);
      if (next < 0) return;
      setDir(delta);
      setFlipped(false);
      setPos(next);
    },
    [editing, total, done, index]
  );

  const flip = useCallback(() => {
    if (!editing && !done && card) setFlipped((f) => !f);
  }, [editing, done, card]);

  const restart = () => {
    setDone(false);
    setDir(0);
    setFlipped(false);
    setPos(0);
  };

  const toggleShuffle = () => {
    setShuffleSeed((s) => (s ? 0 : (Math.random() * 2 ** 31) | 0 || 1));
    restart();
  };

  const startEdit = (e) => {
    e?.stopPropagation();
    if (!card) return;
    setDraft({ term: card.term, definition: card.definition });
    setEditing(true);
  };

  const saveEdit = () => {
    onUpdate(card.id, draft);
    setEditing(false);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (isTyping(document.activeElement)) return;
      if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
      else if (e.key === " " || e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); flip(); }
      else if ((e.key === "s" || e.key === "S") && !e.ctrlKey && !e.metaKey && !e.altKey && source && !editing && !done) {
        e.preventDefault();
        hasDoc(source) ? openSource(source) : setSourceOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, flip, source, editing, done]);

  if (cards.length === 0) {
    return (
      <div className="fc-empty">
        <p>No cards yet.</p>
        <p className="muted">Add terms below, import slides, or ask the assistant to create some.</p>
      </div>
    );
  }

  return (
    <div className="fc">
      <div>
        {done ? (
          <div className="fc-card fc-done">
            <div className="fc-done-inner">
              <div className="fc-done-emoji">🎉</div>
              <h2>Nice work!</h2>
              <p className="muted">You've reviewed all {total} cards.</p>
              <div className="row gap">
                <button className="btn btn-primary" onClick={restart}>
                  <Rotate size={18} /> Restart flashcards
                </button>
                <button className="btn" onClick={() => setDone(false)}>Back to last card</button>
              </div>
            </div>
          </div>
        ) : editing ? (
          <div className="fc-card fc-editing">
            <label className="fc-label">Term</label>
            <textarea autoFocus value={draft.term}
              onChange={(e) => setDraft((d) => ({ ...d, term: e.target.value }))} />
            <label className="fc-label">Definition</label>
            <textarea value={draft.definition}
              onChange={(e) => setDraft((d) => ({ ...d, definition: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) saveEdit(); }} />
            <div className="row gap end">
              <button className="btn" onClick={() => setEditing(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit}>Save</button>
            </div>
          </div>
        ) : (
          <div
            key={card.id}
            className={`fc-card fc-flip ${flipped ? "is-flipped" : ""} ${dir > 0 ? "slide-next" : dir < 0 ? "slide-prev" : ""}`}
            onClick={flip}
            role="button"
            tabIndex={0}
            aria-label={flipped ? "Definition. Click to show term." : "Term. Click to show definition."}
          >
            <div className="fc-inner">
              {(frontSide === "definition"
                ? [["front", "Definition", card.definition], ["back", "Term", card.term]]
                : [["front", "Term", card.term], ["back", "Definition", card.definition]]
              ).map(([side, label, text]) => (
                <div key={side} className={`fc-face fc-${side}`}>
                  <div className="fc-face-top">
                    <span className="fc-label">{label}</span>
                    <div className="fc-face-actions">
                      {source && (
                        <button className={`icon-btn ${sourceOpen ? "active" : ""}`} title={`Source: ${source.loc} (S)`}
                          onClick={(e) => { e.stopPropagation(); hasDoc(source) ? openSource(source) : setSourceOpen((o) => !o); }}>
                          <Book size={18} />
                        </button>
                      )}
                      <button className="icon-btn" title="Edit" onClick={startEdit}><Pencil size={18} /></button>
                      <button
                        className={`icon-btn ${card.starred ? "starred" : ""}`}
                        title={card.starred ? "Unstar" : "Star"}
                        onClick={(e) => { e.stopPropagation(); onToggleStar(card.id); }}
                      >
                        <Star size={18} filled={card.starred} />
                      </button>
                    </div>
                  </div>
                  <div className={`fc-text ${text.length > 220 ? "small" : text.length > 90 ? "medium" : ""}`}>
                    {text || <span className="muted">(empty)</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {sourceOpen && source && !editing && !done && (
          <SourcePanel card={card} source={source} onUpdate={onUpdate} onClose={() => setSourceOpen(false)} />
        )}
      </div>

      <div className="fc-controls">
        <div className="fc-controls-left">
          <label className={`toggle ${!cards.some((c) => c.starred) ? "disabled" : ""}`}>
            <input type="checkbox" checked={starredOnly}
              disabled={!cards.some((c) => c.starred)}
              onChange={(e) => { setStarredOnly(e.target.checked); restart(); }} />
            <span className="toggle-track"><span className="toggle-thumb" /></span>
            Starred only
          </label>
        </div>
        <div className="fc-nav">
          <button className="circle-btn" onClick={() => go(-1)} disabled={!done && index === 0} aria-label="Previous">
            <ArrowLeft />
          </button>
          <span className="fc-count">{done ? total : index + 1} / {total}</span>
          <button className="circle-btn" onClick={() => go(1)} disabled={done} aria-label="Next">
            <ArrowRight />
          </button>
        </div>
        <div className="fc-controls-right">
          <button className={`icon-btn ${shuffleSeed ? "active" : ""}`} title="Shuffle" onClick={toggleShuffle}>
            <Shuffle />
          </button>
        </div>
      </div>
      <div className="fc-progress">
        <div className="fc-progress-bar" style={{ width: `${total ? ((done ? total : index + 1) / total) * 100 : 0}%` }} />
      </div>
      <p className="fc-hint muted">Space to flip · ← → to navigate{anySource ? " · S to show source" : ""}</p>
    </div>
  );
}
