import { useCallback, useEffect, useState } from "react";
import { loadBest, saveBest } from "../../storage.js";
import { shuffle } from "./util.js";

const DURATION = 60;
const STREAK_STEP = 5;
const POINTS = 10;

function makePrompt(cards) {
  const card = cards[Math.floor(Math.random() * cards.length)];
  const truth = Math.random() < 0.5;
  const def = truth ? card.definition : shuffle(cards.filter((c) => c.id !== card.id))[0].definition;
  return { card, def, truth };
}

export default function SpeedRound({ cards, deckId }) {
  const [phase, setPhase] = useState("ready"); // ready | play | end
  const [left, setLeft] = useState(DURATION);
  const [prompt, setPrompt] = useState(() => makePrompt(cards));
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [flash, setFlash] = useState(null);
  const [missed, setMissed] = useState([]);
  const [best, setBest] = useState(() => loadBest(deckId, "speed"));
  const [isRecord, setIsRecord] = useState(false);

  const mult = 1 + Math.floor(streak / STREAK_STEP);

  const begin = () => {
    setScore(0); setStreak(0); setMissed([]); setLeft(DURATION); setIsRecord(false);
    setPrompt(makePrompt(cards));
    setPhase("play");
  };

  useEffect(() => {
    if (phase !== "play") return;
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "play" || left > 0) return;
    setPhase("end");
    if (best == null || score > best) {
      saveBest(deckId, "speed", score);
      setBest(score);
      setIsRecord(true);
    }
  }, [left, phase, score, best, deckId]);

  const answer = useCallback((guess) => {
    if (phase !== "play") return;
    const right = guess === prompt.truth;
    if (right) {
      setScore((s) => s + POINTS * mult);
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
      setMissed((m) => (m.some((c) => c.id === prompt.card.id) ? m : [...m, prompt.card]));
    }
    setFlash(right ? "good" : "bad");
    setTimeout(() => setFlash(null), 250);
    setPrompt(makePrompt(cards));
  }, [phase, prompt, mult, cards]);

  useEffect(() => {
    const key = (e) => {
      if (e.key === "ArrowLeft") answer(true);
      else if (e.key === "ArrowRight") answer(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [answer]);

  if (phase === "ready") {
    return (
      <div className="game-end">
        <h2>Speed Round</h2>
        <p className="muted">Does the definition match the term? You have {DURATION} seconds.<br />
          Use the buttons, or press ← for True and → for False. Every {STREAK_STEP} in a row raises your multiplier.</p>
        <button className="btn btn-primary" onClick={begin}>Start</button>
      </div>
    );
  }

  if (phase === "end") {
    return (
      <div className="game-end">
        <h2>{isRecord ? "New best!" : "Time's up!"}</h2>
        <p className="game-big">{score} pts</p>
        <p className="muted">Best: {best ?? score} pts</p>
        {missed.length > 0 && (
          <div className="speed-missed">
            <h3>Cards to review</h3>
            {missed.map((c) => <p key={c.id}><strong>{c.term}</strong>: {c.definition}</p>)}
          </div>
        )}
        <button className="btn btn-primary" onClick={begin}>Play again</button>
      </div>
    );
  }

  return (
    <div>
      <div className="game-hud">
        <span>{left}s</span>
        <span>{score} pts</span>
        <span className="speed-mult">×{mult} · streak {streak}</span>
      </div>
      <div className={`speed-card ${flash ?? ""}`}>
        <p className="speed-term">{prompt.card.term}</p>
        <p className="speed-def">{prompt.def}</p>
      </div>
      <div className="speed-actions">
        <button className="btn speed-true" onClick={() => answer(true)}>← True</button>
        <button className="btn speed-false" onClick={() => answer(false)}>False →</button>
      </div>
    </div>
  );
}
