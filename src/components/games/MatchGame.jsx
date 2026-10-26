import { useEffect, useState } from "react";
import { loadBest, saveBest } from "../../storage.js";
import { fmtTime, shuffle } from "./util.js";

const PAIRS = 6;
const PENALTY = 1000;

const deal = (cards) =>
  shuffle(shuffle(cards).slice(0, PAIRS).flatMap((c) => [
    { key: c.id + "t", cardId: c.id, text: c.term },
    { key: c.id + "d", cardId: c.id, text: c.definition },
  ]));

export default function MatchGame({ cards, deckId }) {
  const [tiles, setTiles] = useState(() => deal(cards));
  const [cleared, setCleared] = useState(() => new Set());
  const [sel, setSel] = useState(null);
  const [wrong, setWrong] = useState([]);
  const [start, setStart] = useState(() => Date.now());
  const [penalty, setPenalty] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [result, setResult] = useState(null); // { time, best, isRecord }

  const done = cleared.size === tiles.length;

  useEffect(() => {
    if (done) return;
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, [done]);

  useEffect(() => {
    if (!done || result) return;
    const time = Date.now() - start + penalty;
    const prev = loadBest(deckId, "match");
    const isRecord = prev == null || time < prev;
    if (isRecord) saveBest(deckId, "match", time);
    setResult({ time, best: isRecord ? time : prev, isRecord });
  }, [done, result, start, penalty, deckId]);

  const click = (tile) => {
    if (cleared.has(tile.key) || wrong.length) return;
    if (!sel) return setSel(tile);
    if (sel.key === tile.key) return setSel(null);
    if (sel.cardId === tile.cardId) {
      setCleared((s) => new Set([...s, sel.key, tile.key]));
    } else {
      setWrong([sel.key, tile.key]);
      setPenalty((p) => p + PENALTY);
      setTimeout(() => setWrong([]), 500);
    }
    setSel(null);
  };

  const restart = () => {
    setTiles(deal(cards));
    setCleared(new Set());
    setSel(null);
    setWrong([]);
    setPenalty(0);
    setStart(Date.now());
    setNow(Date.now());
    setResult(null);
  };

  if (result) {
    return (
      <div className="game-end">
        <h2>{result.isRecord ? "New best!" : "Done!"}</h2>
        <p className="game-big">{fmtTime(result.time)}</p>
        <p className="muted">Best: {fmtTime(result.best)}{penalty > 0 && ` · includes ${penalty / 1000}s of penalties`}</p>
        <button className="btn btn-primary" onClick={restart}>Play again</button>
      </div>
    );
  }

  return (
    <div>
      <div className="game-hud">
        <span>{fmtTime(now - start + penalty)}</span>
        <span className="muted small">Wrong pairs add 1s</span>
      </div>
      <div className="match-grid">
        {tiles.map((t) => (
          <button key={t.key}
            className={`match-tile ${cleared.has(t.key) ? "gone" : ""} ${sel?.key === t.key ? "sel" : ""} ${wrong.includes(t.key) ? "wrong" : ""}`}
            onClick={() => click(t)} disabled={cleared.has(t.key)}>
            {t.text}
          </button>
        ))}
      </div>
    </div>
  );
}
