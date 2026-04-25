"use client";

import { useState, useCallback, useMemo } from "react";
import { applyNodeChanges, applyEdgeChanges, addEdge } from "reactflow";
import type { Node, Edge, NodeChange, EdgeChange, Connection } from "reactflow";

import { Sidebar }      from "./Sidebar";
import { Topbar }       from "./Topbar";
import { FunnelCanvas } from "@/components/canvas/FunnelCanvas";
import { DEMO_NODES, DEMO_EDGES, DEMO_PROJECTS } from "@/lib/demo-data";
import type { FunnelNodeData, Project, ChatMessage } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/constants";

/* ── helpers ─────────────────────────────────────────────────── */
function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function computeProgress(nodes: Node<FunnelNodeData>[]): number {
  const all  = nodes.flatMap((n) => n.data?.tasks ?? []);
  if (!all.length) return 0;
  return Math.round((all.filter((t) => t.done).length / all.length) * 100);
}

type NodesMap = Record<string, Node<FunnelNodeData>[]>;
type EdgesMap  = Record<string, Edge[]>;

/* ── initial state ───────────────────────────────────────────── */
const INITIAL_NODES: NodesMap = {
  closers:    DEMO_NODES as Node<FunnelNodeData>[],
  viralidad:  [],
  "skool-q2": [],
};
const INITIAL_EDGES: EdgesMap = {
  closers:    DEMO_EDGES,
  viralidad:  [],
  "skool-q2": [],
};

/* ── AppShell ────────────────────────────────────────────────── */
export function AppShell() {
  const [projects,        setProjects]       = useState<Project[]>(DEMO_PROJECTS);
  const [activeProjectId, setActiveProjectId] = useState("closers");
  const [activeView,      setActiveView]      = useState("canvas");
  const [nodesMap,        setNodesMap]        = useState<NodesMap>(INITIAL_NODES);
  const [edgesMap,        setEdgesMap]        = useState<EdgesMap>(INITIAL_EDGES);

  const currentNodes   = useMemo(() => nodesMap[activeProjectId]  ?? [], [nodesMap,  activeProjectId]);
  const currentEdges   = useMemo(() => edgesMap[activeProjectId]  ?? [], [edgesMap,  activeProjectId]);
  const globalProgress = useMemo(() => computeProgress(currentNodes), [currentNodes]);

  /* ── node/edge change handlers (drag, selection, etc.) ─────── */
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    setNodesMap((prev) => ({
      ...prev,
      [activeProjectId]: applyNodeChanges(changes, prev[activeProjectId] ?? []) as Node<FunnelNodeData>[],
    }));
  }, [activeProjectId]);

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdgesMap((prev) => ({
      ...prev,
      [activeProjectId]: applyEdgeChanges(changes, prev[activeProjectId] ?? []),
    }));
  }, [activeProjectId]);

  /* ── Bug 3: connect nodes ───────────────────────────────────── */
  const handleConnect = useCallback((connection: Connection) => {
    setEdgesMap((prev) => ({
      ...prev,
      [activeProjectId]: addEdge(
        { ...connection, type: "funnelEdge", animated: false },
        prev[activeProjectId] ?? []
      ),
    }));
  }, [activeProjectId]);

  /* ── Bug 1: task toggle ─────────────────────────────────────── */
  const handleTaskToggle = useCallback((nodeId: string, taskId: string) => {
    setNodesMap((prev) => ({
      ...prev,
      [activeProjectId]: (prev[activeProjectId] ?? []).map((n) =>
        n.id !== nodeId ? n : {
          ...n,
          data: {
            ...n.data,
            tasks: n.data.tasks.map((t) => t.id === taskId ? { ...t, done: !t.done } : t),
          },
        }
      ),
    }));
  }, [activeProjectId]);

  /* ── Bug 1: send chat message ───────────────────────────────── */
  const handleSendMessage = useCallback((nodeId: string, text: string) => {
    const msg: ChatMessage = {
      id: `msg-${uid()}`,
      userId:       "fv",
      userName:     "Ferney",
      userInitials: "FV",
      userColor:    "#7C3AED",
      text,
      createdAt: new Date().toISOString(),
      isMe:      true,
    };
    setNodesMap((prev) => ({
      ...prev,
      [activeProjectId]: (prev[activeProjectId] ?? []).map((n) =>
        n.id !== nodeId ? n : {
          ...n,
          data: { ...n.data, messages: [...n.data.messages, msg], hasUnread: false },
        }
      ),
    }));
  }, [activeProjectId]);

  /* ── Bug 2: add module ──────────────────────────────────────── */
  const handleAddModule = useCallback(() => {
    const id = `node-${uid()}`;
    const existingNodes = nodesMap[activeProjectId] ?? [];
    const lastX = existingNodes.length
      ? Math.max(...existingNodes.map((n) => n.position.x)) + 230
      : 80;

    const newNode: Node<FunnelNodeData> = {
      id,
      type: "funnelNode",
      position: { x: lastX, y: 160 },
      data: {
        title:         "Nuevo Módulo",
        subtitle:      ROLE_LABELS["ghl"],
        icon:          "📦",
        role:          "ghl",
        ownerInitials: "FV",
        ownerColor:    "#7C3AED",
        tasks:    [],
        messages: [],
        hasUnread: false,
      },
    };
    setNodesMap((prev) => ({
      ...prev,
      [activeProjectId]: [...(prev[activeProjectId] ?? []), newNode],
    }));
  }, [activeProjectId, nodesMap]);

  /* ── Bug 4: create new project ──────────────────────────────── */
  const handleNewProject = useCallback(() => {
    const id = `proj-${uid()}`;
    const newProject: Project = {
      id, name: "Nuevo Proyecto", client: "—",
      status: "draft", progress: 0, blockedCount: 0,
    };
    setProjects((prev) => [...prev, newProject]);
    setNodesMap((prev)  => ({ ...prev, [id]: [] }));
    setEdgesMap((prev)  => ({ ...prev, [id]: [] }));
    setActiveProjectId(id);
  }, []);

  /* ── Bug 5: duplicate project ───────────────────────────────── */
  const handleDuplicate = useCallback(() => {
    const source = projects.find((p) => p.id === activeProjectId);
    if (!source) return;
    const newId = `proj-${uid()}`;
    const newProject: Project = {
      ...source, id: newId,
      name: `${source.name} (copia)`,
      status: "draft", progress: 0,
    };
    const idMap: Record<string, string> = {};
    const newNodes: Node<FunnelNodeData>[] = (nodesMap[activeProjectId] ?? []).map((n) => {
      const newNodeId = `node-${uid()}`;
      idMap[n.id] = newNodeId;
      return {
        ...n, id: newNodeId,
        data: {
          ...n.data,
          tasks:    n.data.tasks.map((t) => ({ ...t, id: `t-${uid()}`, done: false })),
          messages: [],
          hasUnread: false,
        },
      };
    });
    const newEdges: Edge[] = (edgesMap[activeProjectId] ?? []).map((e) => ({
      ...e, id: `e-${uid()}`,
      source: idMap[e.source] ?? e.source,
      target: idMap[e.target] ?? e.target,
    }));
    setProjects((prev) => [...prev, newProject]);
    setNodesMap((prev)  => ({ ...prev, [newId]: newNodes }));
    setEdgesMap((prev)  => ({ ...prev, [newId]: newEdges }));
    setActiveProjectId(newId);
  }, [activeProjectId, projects, nodesMap, edgesMap]);

  /* ── Inject callbacks into node data before passing to canvas ─ */
  const nodesWithCallbacks = useMemo<Node<FunnelNodeData>[]>(
    () =>
      currentNodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onTaskToggle: (taskId: string) => handleTaskToggle(n.id, taskId),
          onSendMessage: (text: string)  => handleSendMessage(n.id, text),
        },
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentNodes]
    // Note: handleTaskToggle/handleSendMessage are stable (useCallback with [activeProjectId])
    // but we intentionally omit them to avoid infinite loops when they recreate on project change.
    // currentNodes itself already changes when activeProjectId changes.
  );

  return (
    <div className="app-shell">
      <Sidebar
        activeProjectId={activeProjectId}
        projects={projects}
        onSelectProject={setActiveProjectId}
        activeView={activeView}
        onSelectView={setActiveView}
        onNewProject={handleNewProject}
        onAddModule={handleAddModule}
      />
      <Topbar
        projectId={activeProjectId}
        projects={projects}
        progress={globalProgress}
        onDuplicate={handleDuplicate}
        onAddModule={handleAddModule}
      />
      <FunnelCanvas
        nodes={nodesWithCallbacks}
        edges={currentEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
      />
    </div>
  );
}
