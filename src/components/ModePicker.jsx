import { useEffect, useRef, useState } from "react";
import { Cards, Chat, Check, ChevronDown, Clipboard, Gamepad, Target } from "./icons.jsx";

export const MODES = [
  { id: "flashcards", label: "Flashcards", desc: "Flip through terms", Icon: Cards, color: "var(--c-teal)" },
  { id: "learn", label: "Learn", desc: "Multiple choice until mastered", Icon: Target, color: "var(--c-orange)" },
  { id: "discussion", label: "Discussion", desc: "Open-ended Q&A with AI", Icon: Chat, color: "var(--c-magenta)" },
  { id: "exam", label: "Exam", desc: "AI-generated practice test", Icon: Clipboard, color: "var(--c-red)" },
  { id: "games", label: "Games", desc: "Match and Speed Round", Icon: Gamepad, color: "var(--c-teal)" },
];

export default function ModePicker({ mode, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = MODES.find((m) => m.id === mode) ?? MODES[0];

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    window.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className="mode-picker" ref={ref}>
      <button className="mode-trigger" style={{ "--mode": current.color }}
        onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
        <current.Icon size={22} />
        <span>{current.label}</span>
        <ChevronDown size={18} className={`chev ${open ? "up" : ""}`} />
      </button>
      {open && (
        <div className="mode-menu" role="menu">
          {MODES.map((m) => (
            <button key={m.id} role="menuitem" className={`mode-option ${m.id === mode ? "on" : ""}`}
              style={{ "--mode": m.color }}
              onClick={() => { onChange(m.id); setOpen(false); }}>
              <span className="mode-option-icon"><m.Icon size={20} /></span>
              <span className="mode-option-text">
                <span className="mode-option-label">{m.label}</span>
                <span className="mode-option-desc">{m.desc}</span>
              </span>
              {m.id === mode && <Check size={18} className="mode-option-check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
