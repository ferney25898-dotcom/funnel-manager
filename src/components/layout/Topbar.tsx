"use client";

import type { Project, ProjectMember } from "@/lib/types";
import { PROJECT_STATUSES } from "@/lib/constants";
import { getInitials } from "@/lib/profiles";

interface TopbarProps {
  projectId:   string;
  projects:    Project[];
  progress:    number;
  members:     ProjectMember[];
  onlineUsers: string[];
  onDuplicate: () => void;
  onAddModule: () => void;
  onOpenTeam:  () => void;
}

export function Topbar({
  projectId, projects, progress,
  members, onlineUsers,
  onDuplicate, onAddModule, onOpenTeam,
}: TopbarProps) {
  const project    = projects.find((p) => p.id === projectId);
  const statusLabel = project ? PROJECT_STATUSES[project.status].label : "—";
  const isActive    = project?.status === "active";
  const blocked     = project?.blockedCount ?? 0;

  const onlineSet  = new Set(onlineUsers);
  const onlineMembers = members.filter((m) => onlineSet.has(m.id));

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

      {/* Online presence avatars */}
      {onlineMembers.length > 0 && (
        <div className="topbar-presence" title={`${onlineMembers.length} en línea`}>
          {onlineMembers.slice(0, 5).map((m) => (
            <div key={m.id} className="topbar-avatar" title={m.full_name || m.email}>
              <span style={{ background: m.color, color: "#fff" }}>
                {getInitials(m.full_name || m.email)}
              </span>
              <span className="topbar-avatar-dot" />
            </div>
          ))}
          {onlineMembers.length > 5 && (
            <span className="topbar-presence-extra">+{onlineMembers.length - 5}</span>
          )}
        </div>
      )}

      <button className="topbar-btn" onClick={onOpenTeam} title="Gestionar equipo">
        <span>👥</span>
        Equipo
      </button>

      <button className="topbar-btn" onClick={onDuplicate} title="Duplicar lanzamiento">
        <span>⧉</span>
        Duplicar
      </button>

      <button className="topbar-btn topbar-btn-primary" onClick={onAddModule} title="Agregar módulo">
        <span>+</span>
        Módulo
      </button>
    </header>
  );
}
