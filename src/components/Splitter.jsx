import { useState } from "react";

const RESIST = 60;

// Drag handle on a panel edge. Widths are clamped to [min, max]; pushing well
// past `min` collapses the panel to 0, and dragging out from 0 reopens it.
export default function Splitter({ side, width, min, max, onChange }) {
  const [dragging, setDragging] = useState(false);

  const widthAt = (x) => {
    const raw = side === "left" ? x : window.innerWidth - x;
    // Hold at `min` until the cursor is pushed RESIST px past it, then snap shut.
    if (raw < min - RESIST) return 0;
    return Math.max(min, Math.min(raw, max));
  };

  const end = () => {
    setDragging(false);
    document.body.classList.remove("resizing");
  };

  return (
    <div
      className={`splitter splitter-${side} ${dragging ? "dragging" : ""} ${width === 0 ? "collapsed" : ""}`}
      style={side === "left" ? { left: width } : { right: width }}
      role="separator" aria-orientation="vertical" tabIndex={0}
      title={width === 0 ? "Drag to open" : "Drag to resize"}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
        document.body.classList.add("resizing");
      }}
      onPointerMove={(e) => { if (dragging) onChange(widthAt(e.clientX)); }}
      onPointerUp={end}
      onPointerCancel={end}
      onDoubleClick={() => onChange(width === 0 ? max : 0)}
    />
  );
}
