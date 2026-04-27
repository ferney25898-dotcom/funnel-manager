"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { applyNodeChanges, applyEdgeChanges, addEdge } from "reactflow";
import type { Node, Edge, NodeChange, EdgeChange, Connection } from "reactflow";

import { createClient } from "@/lib/supabase/client";
import { Sidebar }      from "./Sidebar";
import { Topbar }       from "./Topbar";
import { FunnelCanvas } from "@/components/canvas/FunnelCanvas";
import type { FunnelNodeData, Project, ChatMessage } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/constants";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function computeProgress(nodes: Node<FunnelNodeData>[]): number {
  const all = nodes.flatMap((n) => n.data?.tasks ?? []);
  if (!all.length) return 0;
  return Math.round((all.filter((t) => t.done).length / all.length) * 100);
}

type NodesMap = Record<string, Node<FunnelNodeData>[]>;
type EdgesMap  = Record<string, Edge[]>;

export function AppShell() {
  const supabase = createClient();

  const [projects,        setProjects]        = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId]  = useState<string>("");
  const [activeView,      setActiveView]       = useState("canvas");
  const [nodesMap,        setNodesMap]         = useState<NodesMap>({});
  const [edgesMap,        setEdgesMap]         = useState<EdgesMap>({});
  const [loading,         setLoading]          = useState(true);

  /* ── Load projects on mount ─────────────────────────────────── */
  useEffect(() => {
    async function init() {
      const { data: projs } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: true });

      if (projs && projs.length > 0) {
        const mapped: Project[] = projs.map((p: any) => ({
          id: p.id, name: p.name, client: p.client || "",
          status: p.status, progress: 0, blockedCount: 0,
        }));
        setProjects(mapped);
        setActiveProjectId(mapped[0].id);
      }
      setLoading(false);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Load nodes + edges when project changes (lazy) ────────── */
  useEffect(() => {
    if (!activeProjectId || nodesMap[activeProjectId] !== undefined) return;

    async function loadProject() {
      const [{ data: nodesData }, { data: edgesData }] = await Promise.all([
        supabase
          .from("funnel_nodes")
          .select("*, node_tasks(*), node_messages(*)")
          .eq("project_id", activeProjectId),
        supabase
          .from("funnel_edges")
          .select("*")
          .eq("project_id", activeProjectId),
      ]);

      const nodes: Node<FunnelNodeData>[] = (nodesData || []).map((n: any) => ({
        id: n.id,
        type: "funnelNode",
        position: { x: n.position_x, y: n.position_y },
        data: {
          title:         n.title,
          subtitle:      n.subtitle || "",
          icon:          n.icon || "📦",
          role:          n.role,
          ownerInitials: n.owner_initials || "",
          ownerColor:    n.owner_color || "#7C3AED",
          hasUnread:     n.has_unread || false,
          tasks: (n.node_tasks || [])
            .sort((a: any, b: any) => a.ord - b.ord)
            .map((t: any) => ({ id: t.id, text: t.text, done: t.done, order: t.ord })),
          messages: (n.node_messages || [])
            .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .map((m: any) => ({
              id: m.id, userId: m.user_id, userName: m.user_name,
              userInitials: m.user_initials, userColor: m.user_color,
              text: m.text, createdAt: m.created_at, isMe: m.is_me,
            })),
        },
      }));

      const edges: Edge[] = (edgesData || []).map((e: any) => ({
        id: e.id, source: e.source, target: e.target,
        sourceHandle: e.source_handle, targetHandle: e.target_handle,
        type: "funnelEdge", animated: e.animated,
        data: { dashed: e.dashed, label: e.label },
      }));

      setNodesMap((prev) => ({ ...prev, [activeProjectId]: nodes }));
      setEdgesMap((prev) => ({ ...prev, [activeProjectId]: edges }));

      const progress = computeProgress(nodes);
      setProjects((prev) =>
        prev.map((p) => (p.id === activeProjectId ? { ...p, progress } : p))
      );
    }
    loadProject();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId]);

  const currentNodes   = useMemo(() => nodesMap[activeProjectId]  ?? [], [nodesMap,  activeProjectId]);
  const currentEdges   = useMemo(() => edgesMap[activeProjectId]  ?? [], [edgesMap,  activeProjectId]);
  const globalProgress = useMemo(() => computeProgress(currentNodes), [currentNodes]);

  /* ── Sync progress into project list ───────────────────────── */
  useEffect(() => {
    if (!activeProjectId) return;
    const progress = computeProgress(currentNodes);
    setProjects((prev) =>
      prev.map((p) => (p.id === activeProjectId ? { ...p, progress } : p))
    );
  }, [currentNodes, activeProjectId]);

  /* ── Node / edge changes (drag, select, delete) ─────────────── */
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    setNodesMap((prev) => ({
      ...prev,
      [activeProjectId]: applyNodeChanges(changes, prev[activeProjectId] ?? []) as Node<FunnelNodeData>[],
    }));

    // Persist position on drag-end only
    changes
      .filter((c): c is Extract<NodeChange, { type: "position" }> =>
        c.type === "position" && !c.dragging && !!c.position
      )
      .forEach((c) => {
        supabase
          .from("funnel_nodes")
          .update({ position_x: c.position!.x, position_y: c.position!.y })
          .eq("id", c.id)
          .then(() => {});
      });
  }, [activeProjectId, supabase]);

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdgesMap((prev) => ({
      ...prev,
      [activeProjectId]: applyEdgeChanges(changes, prev[activeProjectId] ?? []),
    }));
  }, [activeProjectId]);

  /* ── Connect nodes ──────────────────────────────────────────── */
  const handleConnect = useCallback((connection: Connection) => {
    const edgeId = `e-${uid()}`;
    setEdgesMap((prev) => ({
      ...prev,
      [activeProjectId]: addEdge(
        { ...connection, id: edgeId, type: "funnelEdge", animated: false },
        prev[activeProjectId] ?? []
      ),
    }));
    supabase.from("funnel_edges").insert({
      id: edgeId, project_id: activeProjectId,
      source: connection.source, target: connection.target,
      source_handle: connection.sourceHandle, target_handle: connection.targetHandle,
      animated: false, dashed: false,
    }).then(() => {});
  }, [activeProjectId, supabase]);

  /* ── Task toggle ────────────────────────────────────────────── */
  const handleTaskToggle = useCallback((nodeId: string, taskId: string) => {
    setNodesMap((prev) => {
      const nodes  = prev[activeProjectId] ?? [];
      const node   = nodes.find((n) => n.id === nodeId);
      const task   = node?.data.tasks.find((t) => t.id === taskId);
      if (!task) return prev;
      const newDone = !task.done;
      supabase.from("node_tasks").update({ done: newDone }).eq("id", taskId).then(() => {});
      return {
        ...prev,
        [activeProjectId]: nodes.map((n) =>
          n.id !== nodeId ? n : {
            ...n,
            data: {
              ...n.data,
              tasks: n.data.tasks.map((t) => t.id === taskId ? { ...t, done: newDone } : t),
            },
          }
        ),
      };
    });
  }, [activeProjectId, supabase]);

  /* ── Send message ───────────────────────────────────────────── */
  const handleSendMessage = useCallback((nodeId: string, text: string) => {
    const msg: ChatMessage = {
      id: `msg-${uid()}`, userId: "fv", userName: "Ferney",
      userInitials: "FV", userColor: "#7C3AED",
      text, createdAt: new Date().toISOString(), isMe: true,
    };
    supabase.from("node_messages").insert({
      id: msg.id, node_id: nodeId, user_id: msg.userId,
      user_name: msg.userName, user_initials: msg.userInitials,
      user_color: msg.userColor, text: msg.text,
      is_me: msg.isMe, created_at: msg.createdAt,
    }).then(() => {});
    setNodesMap((prev) => ({
      ...prev,
      [activeProjectId]: (prev[activeProjectId] ?? []).map((n) =>
        n.id !== nodeId ? n : {
          ...n,
          data: { ...n.data, messages: [...n.data.messages, msg], hasUnread: false },
        }
      ),
    }));
  }, [activeProjectId, supabase]);

  /* ── Add module ─────────────────────────────────────────────── */
  const handleAddModule = useCallback(async () => {
    const id          = `node-${uid()}`;
    const existing    = nodesMap[activeProjectId] ?? [];
    const lastX       = existing.length
      ? Math.max(...existing.map((n) => n.position.x)) + 230
      : 80;

    await supabase.from("funnel_nodes").insert({
      id, project_id: activeProjectId,
      title: "Nuevo Módulo", subtitle: ROLE_LABELS["ghl"],
      icon: "📦", role: "ghl",
      owner_initials: "FV", owner_color: "#7C3AED",
      position_x: lastX, position_y: 160,
    });

    const newNode: Node<FunnelNodeData> = {
      id, type: "funnelNode",
      position: { x: lastX, y: 160 },
      data: {
        title: "Nuevo Módulo", subtitle: ROLE_LABELS["ghl"],
        icon: "📦", role: "ghl",
        ownerInitials: "FV", ownerColor: "#7C3AED",
        tasks: [], messages: [], hasUnread: false,
      },
    };
    setNodesMap((prev) => ({
      ...prev,
      [activeProjectId]: [...(prev[activeProjectId] ?? []), newNode],
    }));
  }, [activeProjectId, nodesMap, supabase]);

  /* ── New project ────────────────────────────────────────────── */
  const handleNewProject = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("projects")
      .insert({ user_id: user.id, name: "Nuevo Proyecto", client: "—", status: "draft" })
      .select()
      .single();
    if (!data) return;
    const newProject: Project = {
      id: data.id, name: data.name, client: data.client,
      status: data.status, progress: 0, blockedCount: 0,
    };
    setProjects((prev) => [...prev, newProject]);
    setNodesMap((prev)  => ({ ...prev, [data.id]: [] }));
    setEdgesMap((prev)  => ({ ...prev, [data.id]: [] }));
    setActiveProjectId(data.id);
  }, [supabase]);

  /* ── Duplicate project ──────────────────────────────────────── */
  const handleDuplicate = useCallback(async () => {
    const source = projects.find((p) => p.id === activeProjectId);
    if (!source) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: newProj } = await supabase
      .from("projects")
      .insert({ user_id: user.id, name: `${source.name} (copia)`, client: source.client, status: "draft" })
      .select()
      .single();
    if (!newProj) return;

    const idMap: Record<string, string> = {};
    const sourceNodes = nodesMap[activeProjectId] ?? [];
    const sourceEdges = edgesMap[activeProjectId] ?? [];

    for (const n of sourceNodes) {
      const newNodeId = `node-${uid()}`;
      idMap[n.id] = newNodeId;
      await supabase.from("funnel_nodes").insert({
        id: newNodeId, project_id: newProj.id,
        title: n.data.title, subtitle: n.data.subtitle,
        icon: n.data.icon, role: n.data.role,
        owner_initials: n.data.ownerInitials, owner_color: n.data.ownerColor,
        position_x: n.position.x, position_y: n.position.y,
      });
      for (const t of n.data.tasks) {
        await supabase.from("node_tasks").insert({
          id: `t-${uid()}`, node_id: newNodeId,
          text: t.text, done: false, ord: t.order,
        });
      }
    }
    for (const e of sourceEdges) {
      await supabase.from("funnel_edges").insert({
        id: `e-${uid()}`, project_id: newProj.id,
        source: idMap[e.source] ?? e.source,
        target: idMap[e.target] ?? e.target,
      });
    }

    const newNodes: Node<FunnelNodeData>[] = sourceNodes.map((n) => ({
      ...n, id: idMap[n.id],
      data: {
        ...n.data,
        tasks:    n.data.tasks.map((t) => ({ ...t, id: `t-${uid()}`, done: false })),
        messages: [], hasUnread: false,
      },
    }));
    const newEdges: Edge[] = sourceEdges.map((e) => ({
      ...e, id: `e-${uid()}`,
      source: idMap[e.source] ?? e.source,
      target: idMap[e.target] ?? e.target,
    }));

    setProjects((prev) => [...prev, {
      id: newProj.id, name: newProj.name, client: newProj.client,
      status: newProj.status, progress: 0, blockedCount: 0,
    }]);
    setNodesMap((prev) => ({ ...prev, [newProj.id]: newNodes }));
    setEdgesMap((prev) => ({ ...prev, [newProj.id]: newEdges }));
    setActiveProjectId(newProj.id);
  }, [activeProjectId, projects, nodesMap, edgesMap, supabase]);

  /* ── Logout ─────────────────────────────────────────────────── */
  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }, [supabase]);

  /* ── Inject callbacks ───────────────────────────────────────── */
  const nodesWithCallbacks = useMemo<Node<FunnelNodeData>[]>(
    () =>
      currentNodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onTaskToggle:  (taskId: string) => handleTaskToggle(n.id, taskId),
          onSendMessage: (text: string)   => handleSendMessage(n.id, text),
        },
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentNodes]
  );

  /* ── Loading screen ─────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading-icon">⚡</div>
        <span>Cargando FunnelManager…</span>
      </div>
    );
  }

  /* ── Empty state (first time) ───────────────────────────────── */
  if (projects.length === 0) {
    return (
      <div className="app-loading">
        <div className="app-loading-icon">⚡</div>
        <p style={{ color: "var(--text2)", marginBottom: 16 }}>No tienes proyectos aún.</p>
        <button
          onClick={handleNewProject}
          style={{
            background: "var(--brand)", color: "#fff", border: "none",
            padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontSize: 13,
          }}
        >
          + Crear primer proyecto
        </button>
      </div>
    );
  }

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
        onLogout={handleLogout}
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
