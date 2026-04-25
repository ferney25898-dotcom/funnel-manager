"use client";

import { useState, useRef, useEffect } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { ROLE_LABELS } from "@/lib/constants";
import type { FunnelNodeData, NodeTask, ChatMessage } from "@/lib/types";

const ROLE_COLOR_MAP: Record<string, string> = {
  trafficker:    "#3B82F6",
  estratega:     "#10B981",
  ghl:           "#7C3AED",
  integraciones: "#6366F1",
  ventas:        "#E24B4A",
  pm:            "#F59E0B",
  experto:       "#8B5CF6",
};
function getRoleColor(role: string) { return ROLE_COLOR_MAP[role] ?? "#7C3AED"; }
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

export function FunnelNode({ data, selected }: NodeProps<FunnelNodeData>) {
  const [expanded, setExpanded] = useState(false);
  const [msgInput, setMsgInput] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  const roleColor = getRoleColor(data.role);
  const tasks     = data.tasks;
  const messages  = data.messages;
  const done      = tasks.filter((t) => t.done).length;
  const total     = tasks.length;
  const pct       = total > 0 ? Math.round((done / total) * 100) : 0;

  /* Bug 1: scroll to bottom when expanded OR when new messages arrive */
  useEffect(() => {
    if (expanded && chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [expanded, messages.length]);

  /* Bug 1: send message */
  const sendMessage = () => {
    const text = msgInput.trim();
    if (!text) return;
    data.onSendMessage?.(text);
    setMsgInput("");
  };

  return (
    <div
      style={{
        width: 190,
        background: "var(--surface)",
        border: `1.5px solid ${selected ? roleColor : "var(--border)"}`,
        borderRadius: "var(--radius-node)",
        boxShadow: selected
          ? `0 0 0 2px ${roleColor}33`
          : "0 1px 6px rgba(0,0,0,0.08)",
        fontFamily: "var(--font-sans)",
        transition: "box-shadow 0.15s, border-color 0.15s",
        overflow: "hidden",
      }}
    >
      {/* Bug 3: handles — larger for easier grabbing */}
      <Handle
        type="target"
        position={Position.Left}
        style={handleStyle}
        className="funnel-handle"
      />
      <Handle
        type="source"
        position={Position.Right}
        style={handleStyle}
        className="funnel-handle"
      />

      {/* ── Header ── */}
      <div
        style={{ display: "flex", alignItems: "flex-start", gap: 6,
          padding: "9px 10px 6px", cursor: "pointer", userSelect: "none" }}
        onClick={() => setExpanded((e) => !e)}
      >
        <span style={{ fontSize: 14, lineHeight: 1, marginTop: 1 }}>{data.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {data.title}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--text2)", marginTop: 1,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {ROLE_LABELS[data.role] ?? data.role}
          </div>
        </div>
        {data.hasUnread && (
          <span style={{ width: 6, height: 6, borderRadius: "50%",
            background: "#E24B4A", flexShrink: 0, marginTop: 4 }} />
        )}
        <span style={{ fontSize: 9, color: "var(--text3)", flexShrink: 0, marginTop: 4,
          transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
          ▼
        </span>
      </div>

      {/* ── Progress bar ── */}
      <div style={{ padding: "0 10px 8px" }}>
        <div style={{ height: 4, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: roleColor,
            borderRadius: 999, transition: "width 0.3s ease" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center",
          justifyContent: "space-between", marginTop: 5 }}>
          <span style={{ fontSize: 10, color: "var(--text2)" }}>
            {done}/{total} tareas · {pct}%
          </span>
          <span style={{ width: 18, height: 18, borderRadius: "50%",
            background: data.ownerColor, color: "#fff", fontSize: 8, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {data.ownerInitials}
          </span>
        </div>
      </div>

      {/* ── Expanded panel ── */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)",
          background: "var(--surface3, var(--surface))" }}>

          {/* Tasks */}
          <div style={{ padding: "8px 10px 6px" }}>
            <SectionLabel>Tareas</SectionLabel>
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                roleColor={roleColor}
                onToggle={() => data.onTaskToggle?.(task.id)}
              />
            ))}
            <button style={{ display: "flex", alignItems: "center", gap: 4,
              marginTop: 6, fontSize: 10.5, color: "var(--text3)",
              background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <span style={{ fontSize: 12 }}>+</span> Tarea
              <span style={{ marginLeft: 4, color: "#8B5CF6" }}>✦</span>
              <span style={{ color: "#8B5CF6" }}>IA</span>
            </button>
          </div>

          {/* Chat */}
          <div style={{ borderTop: "1px solid var(--border)", padding: "8px 10px 6px" }}>
            <SectionLabel>Chat del módulo</SectionLabel>
            <div ref={chatRef}
              style={{ maxHeight: 130, overflowY: "auto",
                display: "flex", flexDirection: "column", gap: 6 }}>
              {messages.length === 0 && (
                <span style={{ fontSize: 10.5, color: "var(--text3)", fontStyle: "italic" }}>
                  Sin mensajes aún…
                </span>
              )}
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} roleColor={roleColor} />
              ))}
            </div>

            {/* Bug 1: message input — now actually sends */}
            <div style={{ display: "flex", gap: 4, marginTop: 6, alignItems: "center" }}>
              <input
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                placeholder="Mensaje al dueño…"
                onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); sendMessage(); } }}
                style={{ flex: 1, fontSize: 11, padding: "4px 7px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-inner)",
                  background: "var(--surface)", color: "var(--text)", outline: "none" }}
              />
              <button
                onClick={(e) => { e.stopPropagation(); sendMessage(); }}
                style={{ width: 22, height: 22, background: roleColor, color: "#fff",
                  border: "none", borderRadius: 5, cursor: "pointer", fontSize: 11,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                ↑
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase",
      letterSpacing: "0.07em", color: "var(--text3)", marginBottom: 6 }}>
      {children}
    </div>
  );
}

function TaskRow({ task, roleColor, onToggle }: {
  task: NodeTask; roleColor: string; onToggle: () => void;
}) {
  return (
    <div onClick={onToggle}
      style={{ display: "flex", alignItems: "flex-start", gap: 6,
        padding: "3px 0", cursor: "pointer", borderRadius: 4 }}>
      <div style={{ width: 13, height: 13, borderRadius: 3, flexShrink: 0, marginTop: 1,
        border: task.done ? "none" : "1.5px solid var(--border2)",
        background: task.done ? roleColor : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.15s" }}>
        {task.done && <span style={{ color: "#fff", fontSize: 8, lineHeight: 1 }}>✓</span>}
      </div>
      <span style={{ fontSize: 11, lineHeight: 1.4, transition: "color 0.15s",
        color: task.done ? "var(--text3)" : "var(--text)",
        textDecoration: task.done ? "line-through" : "none" }}>
        {task.text}
      </span>
    </div>
  );
}

function MessageBubble({ msg, roleColor }: { msg: ChatMessage; roleColor: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column",
      alignItems: msg.isMe ? "flex-end" : "flex-start" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2,
        flexDirection: msg.isMe ? "row-reverse" : "row" }}>
        <span style={{ width: 14, height: 14, borderRadius: "50%",
          background: msg.userColor, color: "#fff", fontSize: 7, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          {msg.userInitials}
        </span>
        <span style={{ fontSize: 9, color: "var(--text3)" }}>
          {msg.userName} · {fmtTime(msg.createdAt)}
        </span>
      </div>
      <div style={{ maxWidth: "88%", fontSize: 11, lineHeight: 1.4,
        color: "var(--text)", padding: "4px 7px",
        background: msg.isMe ? `${roleColor}18` : "var(--border)",
        borderRadius: msg.isMe ? "8px 8px 2px 8px" : "8px 8px 8px 2px" }}>
        {msg.text}
      </div>
    </div>
  );
}

const handleStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  background: "#D1D5DB",
  border: "2px solid var(--surface)",
  borderRadius: "50%",
  cursor: "crosshair",
};
