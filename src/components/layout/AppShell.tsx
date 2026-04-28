"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { applyNodeChanges, applyEdgeChanges, addEdge } from "reactflow";
import type { Node, Edge, NodeChange, EdgeChange, Connection } from "reactflow";

import { createClient } from "@/lib/supabase/client";
import { Sidebar }      from "./Sidebar";
import { Topbar }       from "./Topbar";
import { FunnelCanvas } from "@/components/canvas/FunnelCanvas";
import { TeamModal }    from "@/components/team/TeamModal";
import { Dashboard }    from "@/components/dashboard/Dashboard";
import { getCurrentProfile, getInitials, type Profile } from "@/lib/profiles";
import type { FunnelNodeData, Project, ChatMessage, ProjectMember, ZoneNodeData } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/constants";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function computeProgress(nodes: Node<FunnelNodeData>[]): number {
  const all = nodes.flatMap((n) => n.data?.tasks ?? []);
  if (!all.length) return 0;
  return Math.round((all.filter((t) => t.done).length / all.length) * 100);
}

function isZone(n: Node): boolean {
  return n.type === "zoneNode";
}

type NodesMap = Record<string, Node<FunnelNodeData>[]>;
type ZonesMap = Record<string, Node<ZoneNodeData>[]>;
type EdgesMap  = Record<string, Edge[]>;

export function AppShell() {
  const supabase = createClient();

  const [projects,         setProjects]         = useState<Project[]>([]);
  const [activeProjectId,  setActiveProjectId]  = useState<string>("");
  const [activeView,       setActiveView]        = useState("canvas");
  const [nodesMap,         setNodesMap]          = useState<NodesMap>({});
  const [zonesMap,         setZonesMap]          = useState<ZonesMap>({});
  const [edgesMap,         setEdgesMap]          = useState<EdgesMap>({});
  const [loading,          setLoading]           = useState(true);
  const [teamOpen,         setTeamOpen]          = useState(false);
  const [me,               setMe]               = useState<Profile | null>(null);
  const [membersByProject, setMembersByProject]  = useState<Record<string, ProjectMember[]>>({});

  /* ── Load profile + projects on mount ───────────────────────── */
  useEffect(() => {
    async function init() {
      const profile = await getCurrentProfile();
      setMe(profile);

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

  /* ── Load members of active project ─────────────────────────── */
  useEffect(() => {
    if (!activeProjectId || membersByProject[activeProjectId]) return;
    async function loadMembers() {
      const { data: project } = await supabase
        .from("projects").select("user_id").eq("id", activeProjectId).single();

      const { data: ms } = await supabase
        .from("project_members")
        .select("user_id, role")
        .eq("project_id", activeProjectId);

      const memberIds = new Set<string>();
      if (project?.user_id) memberIds.add(project.user_id);
      (ms || []).forEach((m: any) => memberIds.add(m.user_id));

      if (memberIds.size === 0) {
        setMembersByProject((prev) => ({ ...prev, [activeProjectId]: [] }));
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, color")
        .in("id", Array.from(memberIds));

      const result: ProjectMember[] = (profiles || []).map((p: any) => ({
        id: p.id, full_name: p.full_name, email: p.email, color: p.color,
        role: project?.user_id === p.id
          ? "owner"
          : ((ms || []).find((m: any) => m.user_id === p.id)?.role ?? "viewer"),
      }));
      setMembersByProject((prev) => ({ ...prev, [activeProjectId]: result }));
    }
    loadMembers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId]);

  /* ── Load nodes + zones + edges when project changes (lazy) ─── */
  useEffect(() => {
    if (!activeProjectId || nodesMap[activeProjectId] !== undefined) return;

    async function loadProject() {
      const [{ data: nodesData }, { data: edgesData }, { data: zonesData }] = await Promise.all([
        supabase
          .from("funnel_nodes")
          .select("*, node_tasks(*), node_messages(*)")
          .eq("project_id", activeProjectId),
        supabase
          .from("funnel_edges")
          .select("*")
          .eq("project_id", activeProjectId),
        supabase
          .from("funnel_zones")
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
          assignedTo:    n.assigned_to || null,
          hasUnread:     n.has_unread || false,
          tasks: (n.node_tasks || [])
            .sort((a: any, b: any) => a.ord - b.ord)
            .map((t: any) => ({ id: t.id, text: t.text, done: t.done, order: t.ord })),
          messages: (n.node_messages || [])
            .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .map((m: any) => ({
              id: m.id, userId: m.user_id, userName: m.user_name,
              userInitials: m.user_initials, userColor: m.user_color,
              text: m.text, createdAt: m.created_at,
              isMe: me ? m.user_id === me.id : !!m.is_me,
            })),
        },
      }));

      const edges: Edge[] = (edgesData || []).map((e: any) => ({
        id: e.id, source: e.source, target: e.target,
        sourceHandle: e.source_handle, targetHandle: e.target_handle,
        type: "funnelEdge", animated: e.animated,
        data: { dashed: e.dashed, label: e.label },
      }));

      const zones: Node<ZoneNodeData>[] = (zonesData || []).map((z: any) => ({
        id: z.id,
        type: "zoneNode",
        position: { x: z.position_x, y: z.position_y },
        zIndex: -1,
        style: { width: z.width, height: z.height },
        data: { label: z.label, color: z.color, width: z.width, height: z.height },
      }));

      setNodesMap((prev) => ({ ...prev, [activeProjectId]: nodes }));
      setEdgesMap((prev) => ({ ...prev, [activeProjectId]: edges }));
      setZonesMap((prev) => ({ ...prev, [activeProjectId]: zones }));

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
  const currentZones   = useMemo(() => zonesMap[activeProjectId]  ?? [], [zonesMap,  activeProjectId]);
  const globalProgress = useMemo(() => computeProgress(currentNodes), [currentNodes]);

  /* ── Sync progress into project list ───────────────────────── */
  useEffect(() => {
    if (!activeProjectId) return;
    const progress = computeProgress(currentNodes);
    setProjects((prev) =>
      prev.map((p) => (p.id === activeProjectId ? { ...p, progress } : p))
    );
  }, [currentNodes, activeProjectId]);

  /* ── Node / edge changes — split zone vs funnel ─────────────── */
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    const zoneIds = new Set((zonesMap[activeProjectId] ?? []).map((z) => z.id));

    const zoneChanges  = changes.filter((c) => "id" in c && zoneIds.has(c.id));
    const funnelChanges = changes.filter((c) => !("id" in c) || !zoneIds.has(c.id));

    if (zoneChanges.length) {
      setZonesMap((prev) => ({
        ...prev,
        [activeProjectId]: applyNodeChanges(zoneChanges, prev[activeProjectId] ?? []) as Node<ZoneNodeData>[],
      }));
      zoneChanges
        .filter((c): c is Extract<NodeChange, { type: "position" }> =>
          c.type === "position" && !c.dragging && !!c.position
        )
        .forEach((c) => {
          supabase
            .from("funnel_zones")
            .update({ position_x: c.position!.x, position_y: c.position!.y })
            .eq("id", c.id)
            .then(() => {});
        });
    }

    if (funnelChanges.length) {
      setNodesMap((prev) => ({
        ...prev,
        [activeProjectId]: applyNodeChanges(funnelChanges, prev[activeProjectId] ?? []) as Node<FunnelNodeData>[],
      }));
      funnelChanges
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
    }
  }, [activeProjectId, zonesMap, supabase]);

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

  /* ── Update node data ───────────────────────────────────────── */
  const handleUpdateNodeData = useCallback((nodeId: string, updates: { title?: string; subtitle?: string; icon?: string; role?: string; assignedTo?: string | null }) => {
    setNodesMap((prev) => ({
      ...prev,
      [activeProjectId]: (prev[activeProjectId] ?? []).map((n) =>
        n.id !== nodeId ? n : { ...n, data: { ...n.data, ...updates } }
      ),
    }));
    const dbUpdates: Record<string, string | null> = {};
    if (updates.title    !== undefined) dbUpdates.title    = updates.title!;
    if (updates.role     !== undefined) dbUpdates.role     = updates.role!;
    if (updates.icon     !== undefined) dbUpdates.icon     = updates.icon!;
    if (updates.subtitle !== undefined) dbUpdates.subtitle = updates.subtitle!;
    if (updates.assignedTo !== undefined) dbUpdates.assigned_to = updates.assignedTo;
    if (Object.keys(dbUpdates).length) {
      supabase.from("funnel_nodes").update(dbUpdates).eq("id", nodeId).then(() => {});
    }
  }, [activeProjectId, supabase]);

  /* ── Add task to node ───────────────────────────────────────── */
  const handleAddTask = useCallback((nodeId: string, text: string) => {
    const taskId = `t-${uid()}`;
    const nodes  = nodesMap[activeProjectId] ?? [];
    const node   = nodes.find((n) => n.id === nodeId);
    const order  = node?.data.tasks.length ?? 0;
    supabase.from("node_tasks").insert({
      id: taskId, node_id: nodeId, text, done: false, ord: order,
    }).then(() => {});
    setNodesMap((prev) => ({
      ...prev,
      [activeProjectId]: (prev[activeProjectId] ?? []).map((n) =>
        n.id !== nodeId ? n : {
          ...n,
          data: {
            ...n.data,
            tasks: [...n.data.tasks, { id: taskId, text, done: false, order }],
          },
        }
      ),
    }));
  }, [activeProjectId, nodesMap, supabase]);

  /* ── Send message ───────────────────────────────────────────── */
  const handleSendMessage = useCallback((nodeId: string, text: string) => {
    if (!me) return;
    const msg: ChatMessage = {
      id: `msg-${uid()}`,
      userId:       me.id,
      userName:     me.full_name || me.email,
      userInitials: getInitials(me.full_name || me.email),
      userColor:    me.color,
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
  }, [activeProjectId, supabase, me]);

  /* ── Add funnel module ──────────────────────────────────────── */
  const handleAddModule = useCallback(async () => {
    const id       = `node-${uid()}`;
    const existing = nodesMap[activeProjectId] ?? [];
    const lastX    = existing.length
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

  /* ── Add zone ───────────────────────────────────────────────── */
  const handleAddZone = useCallback(async () => {
    const id     = `zone-${uid()}`;
    const W      = 360;
    const H      = 260;
    const zones  = currentZones;
    const lastX  = zones.length ? Math.max(...zones.map((z) => z.position.x)) + 40 : 60;
    const lastY  = zones.length ? Math.max(...zones.map((z) => z.position.y)) + 40 : 60;

    await supabase.from("funnel_zones").insert({
      id, project_id: activeProjectId,
      label: "Nueva Zona", color: "#7C3AED",
      position_x: lastX, position_y: lastY,
      width: W, height: H,
    });

    const newZone: Node<ZoneNodeData> = {
      id, type: "zoneNode",
      position: { x: lastX, y: lastY },
      zIndex: -1,
      style: { width: W, height: H },
      data: { label: "Nueva Zona", color: "#7C3AED", width: W, height: H },
    };
    setZonesMap((prev) => ({
      ...prev,
      [activeProjectId]: [...(prev[activeProjectId] ?? []), newZone],
    }));
  }, [activeProjectId, currentZones, supabase]);

  /* ── Zone resize ────────────────────────────────────────────── */
  const handleZoneResize = useCallback((zoneId: string, w: number, h: number) => {
    setZonesMap((prev) => ({
      ...prev,
      [activeProjectId]: (prev[activeProjectId] ?? []).map((z) =>
        z.id !== zoneId ? z : {
          ...z,
          style: { ...z.style, width: w, height: h },
          data:  { ...z.data,  width: w, height: h },
        }
      ),
    }));
    supabase.from("funnel_zones").update({ width: w, height: h }).eq("id", zoneId).then(() => {});
  }, [activeProjectId, supabase]);

  /* ── Zone label change ──────────────────────────────────────── */
  const handleZoneLabelChange = useCallback((zoneId: string, label: string) => {
    setZonesMap((prev) => ({
      ...prev,
      [activeProjectId]: (prev[activeProjectId] ?? []).map((z) =>
        z.id !== zoneId ? z : { ...z, data: { ...z.data, label } }
      ),
    }));
    supabase.from("funnel_zones").update({ label }).eq("id", zoneId).then(() => {});
  }, [activeProjectId, supabase]);

  /* ── Zone color change ──────────────────────────────────────── */
  const handleZoneColorChange = useCallback((zoneId: string, color: string) => {
    setZonesMap((prev) => ({
      ...prev,
      [activeProjectId]: (prev[activeProjectId] ?? []).map((z) =>
        z.id !== zoneId ? z : { ...z, data: { ...z.data, color } }
      ),
    }));
    supabase.from("funnel_zones").update({ color }).eq("id", zoneId).then(() => {});
  }, [activeProjectId, supabase]);

  /* ── Zone delete ────────────────────────────────────────────── */
  const handleZoneDelete = useCallback((zoneId: string) => {
    setZonesMap((prev) => ({
      ...prev,
      [activeProjectId]: (prev[activeProjectId] ?? []).filter((z) => z.id !== zoneId),
    }));
    supabase.from("funnel_zones").delete().eq("id", zoneId).then(() => {});
  }, [activeProjectId, supabase]);

  /* ── New project ────────────────────────────────────────────── */
  const handleNewProject = useCallback(async () => {
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      alert("Error de auth: " + (authErr?.message ?? "sin sesión"));
      return;
    }
    const { data, error } = await supabase
      .from("projects")
      .insert({ user_id: user.id, name: "Nuevo Proyecto", client: "—", status: "draft" })
      .select()
      .single();
    if (error) { alert("Error al crear proyecto: " + error.message); return; }
    if (!data)  { alert("No se pudo crear el proyecto (sin datos)"); return; }

    const newProject: Project = {
      id: data.id, name: data.name, client: data.client,
      status: data.status, progress: 0, blockedCount: 0,
    };
    setProjects((prev) => [...prev, newProject]);
    setNodesMap((prev)  => ({ ...prev, [data.id]: [] }));
    setEdgesMap((prev)  => ({ ...prev, [data.id]: [] }));
    setZonesMap((prev)  => ({ ...prev, [data.id]: [] }));
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
    const sourceZones = zonesMap[activeProjectId] ?? [];

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
    for (const z of sourceZones) {
      await supabase.from("funnel_zones").insert({
        id: `zone-${uid()}`, project_id: newProj.id,
        label: z.data.label, color: z.data.color,
        position_x: z.position.x, position_y: z.position.y,
        width: z.data.width, height: z.data.height,
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
    const newZones: Node<ZoneNodeData>[] = sourceZones.map((z) => ({
      ...z, id: `zone-${uid()}`,
    }));

    setProjects((prev) => [...prev, {
      id: newProj.id, name: newProj.name, client: newProj.client,
      status: newProj.status, progress: 0, blockedCount: 0,
    }]);
    setNodesMap((prev) => ({ ...prev, [newProj.id]: newNodes }));
    setEdgesMap((prev) => ({ ...prev, [newProj.id]: newEdges }));
    setZonesMap((prev) => ({ ...prev, [newProj.id]: newZones }));
    setActiveProjectId(newProj.id);
  }, [activeProjectId, projects, nodesMap, edgesMap, zonesMap, supabase]);

  /* ── Logout ─────────────────────────────────────────────────── */
  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }, [supabase]);

  /* ── Inject callbacks + members into funnel nodes ───────────── */
  const currentMembers = membersByProject[activeProjectId] ?? [];
  const nodesWithCallbacks = useMemo<Node<FunnelNodeData>[]>(
    () =>
      currentNodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          members: currentMembers,
          onTaskToggle:     (taskId: string) => handleTaskToggle(n.id, taskId),
          onSendMessage:    (text: string)   => handleSendMessage(n.id, text),
          onAddTask:        (text: string)   => handleAddTask(n.id, text),
          onUpdateNodeData: (updates)        => handleUpdateNodeData(n.id, updates),
        },
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentNodes, currentMembers]
  );

  /* ── Inject callbacks into zones ────────────────────────────── */
  const zonesWithCallbacks = useMemo<Node<ZoneNodeData>[]>(
    () =>
      currentZones.map((z) => ({
        ...z,
        data: {
          ...z.data,
          onResize:      (w: number, h: number) => handleZoneResize(z.id, w, h),
          onLabelChange: (label: string)        => handleZoneLabelChange(z.id, label),
          onColorChange: (color: string)        => handleZoneColorChange(z.id, color),
          onDelete:      ()                     => handleZoneDelete(z.id),
        },
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentZones]
  );

  /* ── Merged node list for React Flow (zones first = behind) ─── */
  const allNodes = useMemo(
    () => [...zonesWithCallbacks, ...nodesWithCallbacks],
    [zonesWithCallbacks, nodesWithCallbacks]
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

  const activeProject = projects.find((p) => p.id === activeProjectId);

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
        onAddZone={handleAddZone}
        onLogout={handleLogout}
      />
      <Topbar
        projectId={activeProjectId}
        projects={projects}
        progress={globalProgress}
        onDuplicate={handleDuplicate}
        onAddModule={handleAddModule}
        onOpenTeam={() => setTeamOpen(true)}
      />

      {activeView === "canvas" && (
        <FunnelCanvas
          nodes={allNodes}
          edges={currentEdges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
        />
      )}

      {activeView === "tablero" && (
        <div className="view-scroll">
          <Dashboard
            project={activeProject}
            nodes={currentNodes}
            members={currentMembers}
          />
        </div>
      )}

      {(activeView === "roles" || activeView === "docs") && (
        <div className="view-placeholder">
          <span style={{ fontSize: 32 }}>🚧</span>
          <p>Vista próximamente</p>
        </div>
      )}

      {teamOpen && (
        <TeamModal projectId={activeProjectId} onClose={() => setTeamOpen(false)} />
      )}
    </div>
  );
}
