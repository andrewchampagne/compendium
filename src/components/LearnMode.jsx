import { useMemo, useState } from "react";
import { Rotate } from "./icons.jsx";

const shuffle = (a) => {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

// Simple local Learn mode: term -> pick the definition. Missed cards come back later.
export default function LearnMode({ cards }) {
  const usable = useMemo(() => cards.filter((c) => c.term.trim() && c.definition.trim()), [cards]);
  const [queue, setQueue] = useState(() => shuffle(usable.map((c) => c.id)));
  const [mastered, setMastered] = useState(() => new Set());
  const [picked, setPicked] = useState(null);

  const card = usable.find((c) => c.id === queue[0]);
  const options = useMemo(() => {
    if (!card) return [];
    const others = shuffle(usable.filter((c) => c.id !== card.id)).slice(0, 3);
    return shuffle([card, ...others]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id, queue.length]);

  const restart = () => {
    setQueue(shuffle(usable.map((c) => c.id)));
    setMastered(new Set());
    setPicked(null);
  };

  if (usable.length < 2) {
    return <div className="mode-empty"><p>Learn needs at least 2 cards with a term and definition.</p></div>;
  }

  const total = usable.length;
  const pct = (mastered.size / total) * 100;

  if (!card) {
    return (
      <div className="learn-done">
        <div className="fc-done-emoji">🏆</div>
        <h2>You've mastered all {total} terms!</h2>
        <button className="btn btn-primary" onClick={restart}><Rotate size={18} /> Start over</button>
      </div>
    );
  }

  const answer = (opt) => {
    if (picked) return;
    setPicked(opt.id);
  };

  const next = () => {
    const correct = picked === card.id;
    const [, ...rest] = queue;
    if (correct) {
      setMastered((m) => new Set(m).add(card.id));
      setQueue(rest);
    } else {
      // Re-ask a few cards later (or at the end if the queue is short).
      const at = Math.min(rest.length, 3);
      setQueue([...rest.slice(0, at), card.id, ...rest.slice(at)]);
    }
    setPicked(null);
  };

  return (
    <div className="learn">
      <div className="learn-progress">
        <span className="muted small">{mastered.size} / {total} mastered</span>
        <div className="fc-progress"><div className="fc-progress-bar" style={{ width: `${pct}%` }} /></div>
      </div>
      <div className="learn-card">
        <span className="fc-label">Term</span>
        <div className="learn-term">{card.term}</div>
        <span className="fc-label">Choose the matching definition</span>
        <div className="learn-options">
          {options.map((opt, i) => {
            const state = !picked ? "" : opt.id === card.id ? "right" : opt.id === picked ? "wrong" : "dim";
            return (
              <button key={opt.id} className={`learn-option ${state}`} onClick={() => answer(opt)}>
                <span className="learn-key">{i + 1}</span>
                {opt.definition}
              </button>
            );
          })}
        </div>
        {picked && (
          <div className={`learn-feedback ${picked === card.id ? "right" : "wrong"}`}>
            <span>{picked === card.id ? "Nice, that's correct!" : "Not quite. You'll see this one again."}</span>
            <button className="btn btn-primary" onClick={next} autoFocus>Continue</button>
          </div>
        )}
      </div>
    </div>
  );
}
