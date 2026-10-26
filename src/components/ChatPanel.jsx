import { useEffect, useRef, useState } from "react";
import { Send, Sparkle, X } from "./icons.jsx";

// Light palette colors get charcoal text; the rest get white.
const LIGHT = new Set(["#52b1b6", "#d5d156", "#f4cd5c", "#e17a8c"]);

const SUGGESTIONS = [
  "Add 5 more cards on the key concepts",
  "Make all definitions shorter",
  "Remove duplicate cards",
  "Which cards are hardest?",
];

function OpsSummary({ ops }) {
  if (!ops) return null;
  const parts = [];
  if (ops.add) parts.push(<span key="a" className="op op-add">+{ops.add} added</span>);
  if (ops.update) parts.push(<span key="u" className="op op-upd">{ops.update} edited</span>);
  if (ops.delete) parts.push(<span key="d" className="op op-del">−{ops.delete} removed</span>);
  return parts.length ? <div className="ops">{parts}</div> : null;
}

export default function ChatPanel({ deck, messages, busy, chatColor, onSend, onClear, onClose }) {
  const [text, setText] = useState("");
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  const submit = (value = text) => {
    const v = value.trim();
    if (!v || busy || !deck) return;
    onSend(v);
    setText("");
    if (inputRef.current) inputRef.current.style.height = "auto";
  };

  return (
    <aside className={`chat ${chatColor ? "chat-tinted" : ""} ${LIGHT.has(chatColor) ? "chat-light" : ""}`} style={chatColor ? { "--chat": chatColor } : undefined}>
      <header className="chat-head">
        <div className="chat-title"><Sparkle size={24} /> Assistant</div>
        <div className="row gap-sm">
          {messages.length > 0 && <button className="link-btn" onClick={onClear}>Clear</button>}
          <button className="icon-btn" onClick={onClose} title="Close"><X size={18} /></button>
        </div>
      </header>

      <div className="chat-body">
        {!deck ? (
          <p className="muted chat-empty">Open a set to edit it with chat.</p>
        ) : messages.length === 0 ? (
          <div className="chat-empty">
            <p className="muted">Ask about this set, or tell me to add, edit, or remove cards.</p>
            <div className="suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="suggestion" onClick={() => submit(s)} disabled={busy}>{s}</button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`msg msg-${m.role} ${m.error ? "msg-error" : ""}`}>
              <div className="bubble" style={m.color ? { "--bubble": m.color } : undefined}>{m.content}</div>
              {m.role === "assistant" && <OpsSummary ops={m.ops} />}
            </div>
          ))
        )}
        {busy && (
          <div className="msg msg-assistant">
            <div className="bubble typing"><span /><span /><span /></div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form className="chat-input" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="chat-bar">
          <textarea
            ref={inputRef}
            rows={1}
            value={text}
            placeholder={deck ? "Ask or edit your cards…" : "Open a set first"}
            disabled={!deck}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
            }}
          />
          <button type="submit" className="send-btn" disabled={!text.trim() || busy || !deck} title="Send">
            <Send size={18} />
          </button>
        </div>
      </form>
    </aside>
  );
}
