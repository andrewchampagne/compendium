import { useEffect, useRef, useState } from "react";
import * as api from "../api.js";
import { loadDiscussion, saveDiscussion } from "../storage.js";
import { Rotate, Send } from "./icons.jsx";

const VERDICT = {
  correct: { label: "Correct", cls: "v-correct" },
  partial: { label: "Partly right", cls: "v-partial" },
  incorrect: { label: "Not quite", cls: "v-incorrect" },
};

// Message shape: { role: "assistant", feedback?, verdict?, question } | { role: "user", content }
const toHistory = (msgs) =>
  msgs.map((m) =>
    m.role === "user"
      ? { role: "user", content: m.content }
      : { role: "assistant", content: [m.feedback, m.question].filter(Boolean).join("\n\n") }
  );

export default function DiscussionMode({ deck }) {
  const [msgs, setMsgs] = useState(() => loadDiscussion(deck.id));
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    saveDiscussion(deck.id, msgs);
  }, [deck.id, msgs]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy]);

  const ask = async (history) => {
    setBusy(true);
    setError("");
    try {
      const res = await api.discuss({ title: deck.title, cards: deck.cards, history: toHistory(history) });
      setMsgs([...history, { role: "assistant", ...res }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const send = (value) => {
    const v = value.trim();
    if (!v || busy) return;
    const next = [...msgs, { role: "user", content: v }];
    setMsgs(next);
    setText("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    ask(next);
  };

  const restart = () => { setMsgs([]); setError(""); };

  if (deck.cards.length === 0) {
    return <div className="mode-empty"><p>Add some cards to start a discussion.</p></div>;
  }

  if (msgs.length === 0 && !busy) {
    return (
      <div className="mode-start">
        <h2>Discussion</h2>
        <p className="muted">The AI asks open-ended questions about this set, gives quick feedback on your answers, and follows up on weak spots.</p>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary" onClick={() => ask([])}>Start discussion</button>
      </div>
    );
  }

  return (
    <div className="discuss">
      <div className="discuss-head">
        <span className="muted small">{msgs.filter((m) => m.role === "user").length} answered</span>
        <button className="link-btn" onClick={restart}><Rotate size={14} /> New discussion</button>
      </div>
      <div className="discuss-body">
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="d-msg d-user"><div className="d-bubble">{m.content}</div></div>
          ) : (
            <div key={i} className="d-msg d-ai">
              {m.feedback && VERDICT[m.verdict] && (
                <div className={`d-feedback ${VERDICT[m.verdict].cls}`}>
                  <strong>{VERDICT[m.verdict].label}.</strong> {m.feedback}
                </div>
              )}
              <div className="d-bubble d-question">{m.question}</div>
            </div>
          )
        )}
        {busy && <div className="d-msg d-ai"><div className="d-bubble typing"><span /><span /><span /></div></div>}
        {error && <p className="error">{error} <button className="link-btn" onClick={() => ask(msgs)}>Retry</button></p>}
        <div ref={endRef} />
      </div>
      <form className="chat-bar discuss-bar" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          placeholder="Type your answer…"
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }}
        />
        <button type="button" className="link-btn" disabled={busy} onClick={() => send("Skip")}>Skip</button>
        <button type="submit" className="send-btn" disabled={!text.trim() || busy} title="Send"><Send size={18} /></button>
      </form>
    </div>
  );
}
