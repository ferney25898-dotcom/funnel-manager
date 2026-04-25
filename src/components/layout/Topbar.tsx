"use client";

import type { Project } from "@/lib/types";
import { PROJECT_STATUSES } from "@/lib/constants";

interface TopbarProps {
  projectId:   string;
  projects:    Project[];
  progress:    number;
  onDuplicate: () => void;
  onAddModule: () => void;
}

export function Topbar({ projectId, projects, progress, onDuplicate, onAddModule }: TopbarProps) {
  const project = projects.find((p) => p.id === projectId);
  const statusLabel = project ? PROJECT_STATUSES[project.status].label : "—";
  const isActive    = project?.status === "active";
  const blocked     = project?.blockedCount ?? 0;

  return (
    <header className="topbar">
      <span className="topbar-project-name">
        {project?.name ?? "—"}
      </span>

      <span className={`topbar-badge ${isActive ? "topbar-badge-active" : ""}`}
        style={!isActive ? { background: "#FEF3C7", color: "#92400E" } : undefined}>
        {statusLabel}
      </span>

      {blocked > 0 && (
        <span className="topbar-badge topbar-badge-blocked">
          {blocked} bloqueado{blocked > 1 ? "s" : ""}
        </span>
      )}

      <div className="topbar-progress-wrap">
        <span className="topbar-progress-label">{progress}% completado</span>
        <div className="topbar-progress-bar">
          <div className="topbar-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Bug 5: Duplicar con handler real */}
      <button className="topbar-btn" onClick={onDuplicate} title="Duplicar lanzamiento">
        <span>⧉</span>
        Duplicar
      </button>

      {/* Bug 2: Módulo con handler real */}
      <button className="topbar-btn topbar-btn-primary" onClick={onAddModule} title="Agregar módulo">
        <span>+</span>
        Módulo
      </button>
    </header>
  );
}
