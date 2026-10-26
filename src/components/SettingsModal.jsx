import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS } from "../storage.js";
import { X } from "./icons.jsx";

export const PALETTE = [
  ["Teal", "#52b1b6"], ["Lime", "#d5d156"], ["Yellow", "#f4cd5c"],
  ["Magenta", "#b8428d"], ["Pink", "#d85f9a"], ["Salmon", "#e17a8c"],
  ["Orange", "#de713e"], ["Red", "#d23d46"], ["Crimson", "#c83b52"],
];

const SECTIONS = [
  { id: "general", label: "General" },
  { id: "study", label: "Studying" },
  { id: "appearance", label: "Appearance" },
  { id: "data", label: "Data" },
];

function Toggle({ checked, onChange }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track"><span className="toggle-thumb" /></span>
    </label>
  );
}

function Row({ title, desc, children }) {
  return (
    <div className="set-row">
      <div className="set-row-text">
        <div className="set-row-title">{title}</div>
        {desc && <div className="set-row-desc">{desc}</div>}
      </div>
      <div className="set-row-control">{children}</div>
    </div>
  );
}

const FONT_MIN = 10;
const FONT_MAX = 32;

// Free-entry size box; commits on blur/Enter so partial typing ("1") isn't applied.
function FontSizeInput({ value, onChange }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => {
    setDraft(String(value));
  }, [value]);
  const commit = () => {
    const n = Math.round(Number(draft));
    if (!Number.isFinite(n) || draft.trim() === "") return setDraft(String(value));
    const clamped = Math.min(FONT_MAX, Math.max(FONT_MIN, n));
    onChange(clamped);
    setDraft(String(clamped));
  };
  return (
    <label className="font-input">
      <input type="number" min={FONT_MIN} max={FONT_MAX} value={draft}
        onChange={(e) => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        aria-label="Font size in pixels" />
      <span>px</span>
    </label>
  );
}

function Segmented({ value, options, onChange }) {
  return (
    <div className="segmented">
      {options.map(([v, label]) => (
        <button key={v} className={value === v ? "on" : ""} onClick={() => onChange(v)}>{label}</button>
      ))}
    </div>
  );
}

export default function SettingsModal({ settings, onChange, onClearData, onClose }) {
  const [section, setSection] = useState("general");
  const set = (key) => (value) => onChange({ ...settings, [key]: value });

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="settings-layer" role="dialog" aria-modal="true" aria-label="Settings">
      <nav className="settings-nav">
        <div className="settings-nav-inner">
          <div className="settings-nav-head">App settings</div>
          {SECTIONS.map((s) => (
            <button key={s.id} className={`settings-nav-item ${section === s.id ? "active" : ""}`}
              onClick={() => setSection(s.id)}>
              {s.label}
            </button>
          ))}
          <div className="settings-nav-sep" />
          <div className="settings-version muted small">Compendium v0.1.0</div>
        </div>
      </nav>

      <div className="settings-content">
        <div className="settings-content-inner">
          {section === "general" && (
            <>
              <h2>General</h2>
              <Row title="Open assistant on startup" desc="Show the chat panel when the app launches.">
                <Toggle checked={settings.openChatOnStart} onChange={set("openChatOnStart")} />
              </Row>
              <Row title="Confirm before deleting sets" desc="Ask before a set is permanently removed.">
                <Toggle checked={settings.confirmDelete} onChange={set("confirmDelete")} />
              </Row>
            </>
          )}

          {section === "study" && (
            <>
              <h2>Studying</h2>
              <Row title="Show first" desc="Which side of the card faces up.">
                <Segmented value={settings.frontSide} onChange={set("frontSide")}
                  options={[["term", "Term"], ["definition", "Definition"]]} />
              </Row>
              <Row title="Shuffle by default" desc="Start each set in a random order.">
                <Toggle checked={settings.shuffleByDefault} onChange={set("shuffleByDefault")} />
              </Row>
            </>
          )}

          {section === "appearance" && (
            <>
              <h2>Appearance</h2>
              <Row title="Theme">
                <Segmented value={settings.theme} onChange={set("theme")}
                  options={[["system", "System"], ["light", "Light"], ["dark", "Dark"]]} />
              </Row>

              <div className="set-block">
                <div className="set-row-title">Font size</div>
                <div className="set-row-desc">Scales text across the app.</div>
                <div className="font-slider">
                  <span className="small">A</span>
                  <input type="range" min="12" max="20" step="1"
                    value={Math.min(20, Math.max(12, settings.fontSize))}
                    onChange={(e) => set("fontSize")(Number(e.target.value))} />
                  <span className="big">A</span>
                  <FontSizeInput value={settings.fontSize} onChange={set("fontSize")} />
                </div>
              </div>

              <div className="set-block">
                <div className="set-row-title">Chat color</div>
                <div className="set-row-desc">Tint the assistant panel, or keep it neutral.</div>
                <div className="swatches">
                  <button className={`swatch swatch-default ${!settings.chatColor ? "on" : ""}`}
                    onClick={() => set("chatColor")(null)} title="Default">
                    <span>Default</span>
                  </button>
                  {PALETTE.map(([name, hex]) => (
                    <button key={hex} className={`swatch ${settings.chatColor === hex ? "on" : ""}`}
                      style={{ background: hex }} title={name} aria-label={name}
                      onClick={() => set("chatColor")(hex)} />
                  ))}
                </div>
              </div>

              <Row title="Your message bubbles" desc="Random palette color per message, or match the chat color.">
                <Segmented value={settings.bubbleColors} onChange={set("bubbleColors")}
                  options={[["random", "Random"], ["chat", "Match chat"]]} />
              </Row>

              <div className="set-actions">
                <button className="link-btn" onClick={() => onChange({
                  ...settings,
                  theme: DEFAULT_SETTINGS.theme,
                  fontSize: DEFAULT_SETTINGS.fontSize,
                  chatColor: DEFAULT_SETTINGS.chatColor,
                  bubbleColors: DEFAULT_SETTINGS.bubbleColors,
                })}>Reset appearance</button>
              </div>
            </>
          )}

          {section === "data" && (
            <>
              <h2>Data</h2>
              <p className="muted">Sets, chats, and settings are stored locally on this device.</p>
              <div className="danger-zone">
                <div>
                  <div className="set-row-title">Delete all data</div>
                  <div className="set-row-desc">Permanently removes every set, chat history, and setting.</div>
                </div>
                <button className="btn btn-danger" onClick={onClearData}>Delete all</button>
              </div>
            </>
          )}
        </div>

        <div className="settings-close">
          <button className="settings-close-btn" onClick={onClose} aria-label="Close settings"><X size={18} /></button>
          <span>ESC</span>
        </div>
      </div>
    </div>
  );
}
