"use client";

import { PROJECT_STATUSES } from "@/lib/constants";
import type { Project } from "@/lib/types";

interface SidebarProps {
  activeProjectId: string;
  projects:        Project[];
  onSelectProject: (id: string) => void;
  activeView:      string;
  onSelectView:    (view: string) => void;
  onNewProject:    () => void;
  onDeleteProject: (id: string) => void;
  onAddModule:     () => void;
  onAddZone:       () => void;
  onLogout:        () => void;
}

const VIEWS = [
  { id: "canvas",  icon: "◈", label: "Embudo"  },
  { id: "roles",   icon: "◎", label: "Roles"   },
  { id: "docs",    icon: "⊟", label: "Docs"    },
  { id: "tablero", icon: "▤", label: "Tablero" },
];

export function Sidebar({
  activeProjectId, projects,
  onSelectProject, activeView, onSelectView,
  onNewProject, onDeleteProject, onAddModule, onAddZone, onLogout,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">⚡</div>
        FunnelManager
      </div>

      {/* Projects */}
      <div className="sidebar-section">
        <div className="sidebar-section-label">Proyectos</div>
        {projects.map((p) => (
          <div key={p.id} className="sidebar-project-row">
            <button
              className={`sidebar-item sidebar-project-btn ${p.id === activeProjectId ? "active" : ""}`}
              onClick={() => onSelectProject(p.id)}
            >
              <span className="sidebar-item-dot"
                style={{ background: PROJECT_STATUSES[p.status].color }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                {p.name}
              </span>
            </button>
            <button
              className="sidebar-delete-btn"
              title="Eliminar proyecto"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteProject(p.id);
              }}
            >✕</button>
          </div>
        ))}
        <button className="sidebar-add-btn" onClick={onNewProject}>
          <span style={{ fontSize: 14 }}>+</span>
          Nuevo proyecto
        </button>
      </div>

      <div className="sidebar-divider" />

      {/* Views */}
      <div className="sidebar-section">
        <div className="sidebar-section-label">Vistas</div>
        {VIEWS.map((v) => (
          <button key={v.id}
            className={`sidebar-item ${activeView === v.id ? "active" : ""}`}
            onClick={() => onSelectView(v.id)}>
            <span className="sidebar-item-icon">{v.icon}</span>
            {v.label}
          </button>
        ))}
      </div>

      <div className="sidebar-divider" />

      {/* Canvas tools */}
      <div className="sidebar-section">
        <div className="sidebar-section-label">Canvas</div>
        <button className="sidebar-item" onClick={onAddModule}>
          <span className="sidebar-item-icon">+</span>
          Módulo
        </button>
        <button className="sidebar-item" onClick={onAddZone}>
          <span className="sidebar-item-icon">⬚</span>
          Zona
        </button>
        <button className="sidebar-item">
          <span className="sidebar-item-icon">⇢</span>
          Condicional
        </button>
      </div>

      <div className="sidebar-divider" style={{ marginTop: "auto" }} />

      {/* AI Copilot */}
      <div className="sidebar-section">
        <button className="sidebar-item">
          <span className="sidebar-item-icon" style={{ color: "#8B5CF6" }}>✦</span>
          <span>IA Copilot</span>
          <span style={{ width: 6, height: 6, borderRadius: "50%",
            background: "#10B981", marginLeft: "auto", flexShrink: 0 }} />
        </button>
        <button className="sidebar-item" onClick={onLogout}
          style={{ color: "var(--sidebar-muted)", marginTop: 4 }}>
          <span className="sidebar-item-icon">↩</span>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
