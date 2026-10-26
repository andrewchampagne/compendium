import { useState } from "react";
import { Pencil, Plus, Star, Trash } from "./icons.jsx";
import SourcePanel, { SourceChip } from "./SourcePanel.jsx";

function CardRow({ card, num, source, onUpdate, onDelete, onToggleStar, startEditing }) {
  const [editing, setEditing] = useState(startEditing);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [draft, setDraft] = useState({ term: card.term, definition: card.definition });

  const save = () => {
    onUpdate(card.id, draft);
    setEditing(false);
  };
  const onKey = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save();
    if (e.key === "Escape") setEditing(false);
  };

  if (editing) {
    return (
      <div className="term-row editing">
        <span className="term-num">{num}</span>
        <div className="term-edit-col">
          <textarea autoFocus value={draft.term} placeholder="Enter term"
            onChange={(e) => setDraft({ ...draft, term: e.target.value })} onKeyDown={onKey} />
          <span className="term-edit-label">TERM</span>
        </div>
        <div className="term-edit-col">
          <textarea value={draft.definition} placeholder="Enter definition"
            onChange={(e) => setDraft({ ...draft, definition: e.target.value })} onKeyDown={onKey} />
          <span className="term-edit-label">DEFINITION</span>
        </div>
        <div className="term-actions col">
          <button className="btn btn-primary btn-sm" onClick={save}>Save</button>
          <button className="btn btn-sm" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="term-row">
        <div className="term-term">
          {card.term || <span className="muted">(no term)</span>}
          {source && <div><SourceChip source={source} open={sourceOpen} onClick={() => setSourceOpen((o) => !o)} /></div>}
        </div>
      <div className="term-def">{card.definition || <span className="muted">(no definition)</span>}</div>
      <div className="term-actions">
        <button className={`icon-btn ${card.starred ? "starred" : ""}`} title="Star" onClick={() => onToggleStar(card.id)}>
          <Star size={18} filled={card.starred} />
        </button>
        <button className="icon-btn" title="Edit" onClick={() => {
          setDraft({ term: card.term, definition: card.definition });
          setEditing(true);
        }}>
          <Pencil size={18} />
        </button>
        <button className="icon-btn danger" title="Delete" onClick={() => onDelete(card.id)}>
          <Trash size={18} />
        </button>
      </div>
      </div>
      {sourceOpen && source && (
        <SourcePanel card={card} source={source} onUpdate={onUpdate} onClose={() => setSourceOpen(false)} />
      )}
    </>
  );
}

export default function CardList({ cards, sources = {}, onUpdate, onDelete, onToggleStar, onAdd, newCardId }) {
  return (
    <section className="terms">
      <h3 className="terms-title">Terms in this set ({cards.length})</h3>
      <div className="terms-list">
        {cards.map((c, i) => (
          <CardRow key={c.id} card={c} num={i + 1} source={c.sourceId ? sources[c.sourceId] : null} onUpdate={onUpdate} onDelete={onDelete}
            onToggleStar={onToggleStar} startEditing={c.id === newCardId} />
        ))}
      </div>
      <button className="add-card" onClick={onAdd}>
        <Plus size={18} /> Add a card
      </button>
    </section>
  );
}
