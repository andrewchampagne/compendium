import { useRef, useState } from "react";
import { File, Upload, X } from "./icons.jsx";

const ACCEPT = ".pptx,.docx,.pdf,.txt,.md";
const OK_EXT = ACCEPT.split(",");

export default function ImportModal({ canAppend, busy, error, onSubmit, onClose }) {
  const [files, setFiles] = useState([]);
  const [instructions, setInstructions] = useState("");
  const [target, setTarget] = useState("new");
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  const addFiles = (list) => {
    const incoming = [...list].filter((f) => OK_EXT.some((ext) => f.name.toLowerCase().endsWith(ext)));
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => f.name + f.size));
      return [...prev, ...incoming.filter((f) => !seen.has(f.name + f.size))];
    });
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="modal">
        <header className="modal-head">
          <h2>Import slides or documents</h2>
          <button className="icon-btn" onClick={onClose} disabled={busy}><X /></button>
        </header>

        <div
          className={`dropzone ${drag ? "drag" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
        >
          <Upload size={28} />
          <p><strong>Drag files here</strong> or click to browse</p>
          <p className="muted small">PowerPoint, Word, PDF, or text · multiple files OK</p>
          <input ref={inputRef} type="file" multiple accept={ACCEPT} hidden
            onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        </div>

        {files.length > 0 && (
          <ul className="file-list">
            {files.map((f, i) => (
              <li key={f.name + f.size}>
                <File size={16} /> <span className="file-name">{f.name}</span>
                <span className="muted small">{(f.size / 1024).toFixed(0)} KB</span>
                <button className="icon-btn" disabled={busy}
                  onClick={() => setFiles(files.filter((_, j) => j !== i))}><X size={16} /></button>
              </li>
            ))}
          </ul>
        )}

        <label className="field-label">Instructions (optional)</label>
        <textarea className="field" rows={2} value={instructions}
          placeholder="e.g. Focus on vocabulary; phrase terms as questions"
          onChange={(e) => setInstructions(e.target.value)} />

        {canAppend && (
          <div className="radio-row">
            <label><input type="radio" checked={target === "new"} onChange={() => setTarget("new")} /> New set</label>
            <label><input type="radio" checked={target === "append"} onChange={() => setTarget("append")} /> Add to current set</label>
          </div>
        )}

        {error && <p className="error">{error}</p>}

        <footer className="modal-foot">
          <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" disabled={!files.length || busy}
            onClick={() => onSubmit(files, instructions, target)}>
            {busy ? <><span className="spinner" /> Generating cards…</> : "Create flashcards"}
          </button>
        </footer>
      </div>
    </div>
  );
}
