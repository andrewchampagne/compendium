import { useMemo, useState } from "react";
import MatchGame from "./games/MatchGame.jsx";
import SpeedRound from "./games/SpeedRound.jsx";
import { loadBest } from "../storage.js";
import { fmtTime } from "./games/util.js";
import { ArrowLeft } from "./icons.jsx";

const GAMES = [
  { id: "match", label: "Match", desc: "Pair terms with definitions as fast as you can.", color: "var(--c-teal)",
    Comp: MatchGame, fmt: (v) => `Best: ${fmtTime(v)}` },
  { id: "speed", label: "Speed Round", desc: "60 seconds of true or false. Build streaks for multipliers.", color: "var(--c-orange)",
    Comp: SpeedRound, fmt: (v) => `Best: ${v} pts` },
];

export default function GamesMode({ deck }) {
  const [game, setGame] = useState(null);
  const cards = useMemo(() => deck.cards.filter((c) => c.term.trim() && c.definition.trim()), [deck.cards]);

  if (cards.length < 4) {
    return <div className="mode-empty"><p>Games need at least 4 cards with a term and definition.</p></div>;
  }

  const current = GAMES.find((g) => g.id === game);
  if (current) {
    return (
      <div className="game">
        <button className="btn game-back" onClick={() => setGame(null)}><ArrowLeft size={16} /> All games</button>
        <current.Comp key={deck.id} cards={cards} deckId={deck.id} />
      </div>
    );
  }

  return (
    <div className="game-grid">
      {GAMES.map((g) => {
        const best = loadBest(deck.id, g.id);
        return (
          <button key={g.id} className="game-tile" style={{ "--mode": g.color }} onClick={() => setGame(g.id)}>
            <span className="game-tile-label">{g.label}</span>
            <span className="muted small">{g.desc}</span>
            {best != null && <span className="game-tile-best">{g.fmt(best)}</span>}
          </button>
        );
      })}
    </div>
  );
}
