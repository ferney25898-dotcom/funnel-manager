"use client";

import { useCallback, useRef, useState } from "react";
import type { NodeProps } from "reactflow";
import type { ZoneNodeData } from "@/lib/types";

const ZONE_COLORS = [
  "#7C3AED", "#2563EB", "#059669", "#D97706", "#DC2626", "#DB2777",
];

export function ZoneNode({ data, selected }: NodeProps<ZoneNodeData>) {
  const [editing,    setEditing]    = useState(false);
  const [label,      setLabel]      = useState(data.label);
  const [showColors, setShowColors] = useState(false);
  const resizeRef = useRef<{ sx: number; sy: number; sw: number; sh: number } | null>(null);

  /* ── Resize via drag on bottom-right handle ── */
  const onResizeDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    resizeRef.current = { sx: e.clientX, sy: e.clientY, sw: data.width, sh: data.height };

    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const newW = Math.max(160, resizeRef.current.sw + ev.clientX - resizeRef.current.sx);
      const newH = Math.max(100, resizeRef.current.sh + ev.clientY - resizeRef.current.sy);
      data.onResize?.(newW, newH);
    };
    const onUp = () => {
      resizeRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [data]);

  function commitLabel() {
    setEditing(false);
    const trimmed = label.trim() || "Zona";
    setLabel(trimmed);
    if (trimmed !== data.label) data.onLabelChange?.(trimmed);
  }

  return (
    <div
      className="zone-node"
      style={{
        width:         data.width,
        height:        data.height,
        borderColor:   data.color,
        background:    `${data.color}12`,
        boxShadow:     selected ? `0 0 0 2px ${data.color}` : "none",
        pointerEvents: "none",   /* interior pasa eventos a los nodos encima */
      }}
    >
      {/* Top bar: label + color picker + delete */}
      <div className="zone-topbar nodrag">
        {editing ? (
          <input
            autoFocus
            className="zone-label-input"
            value={label}
            style={{ color: data.color }}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={(e) => {
              if (e.key === "Enter")  commitLabel();
              if (e.key === "Escape") { setLabel(data.label); setEditing(false); }
            }}
          />
        ) : (
          <span
            className="zone-label"
            style={{ color: data.color }}
            onDoubleClick={() => setEditing(true)}
          >
            {data.label}
          </span>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
          {/* Color circle button */}
          <button
            className="zone-btn"
            style={{ background: data.color }}
            onClick={() => setShowColors((v) => !v)}
            title="Color"
          />

          {/* Color swatches dropdown */}
          {showColors && (
            <div className="zone-color-picker nodrag">
              {ZONE_COLORS.map((c) => (
                <button
                  key={c}
                  className="zone-color-swatch"
                  style={{ background: c, outline: c === data.color ? "2px solid #fff" : "none" }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onColorChange?.(c);
                    setShowColors(false);
                  }}
                />
              ))}
            </div>
          )}

          {/* Delete */}
          <button
            className="zone-btn zone-btn-delete"
            onClick={() => data.onDelete?.()}
            title="Eliminar zona"
          >✕</button>
        </div>
      </div>

      {/* Resize handle */}
      <div className="zone-resize nodrag" onMouseDown={onResizeDown} />
    </div>
  );
}
