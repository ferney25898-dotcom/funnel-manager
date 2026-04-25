import type { RoleKey, ProjectStatus } from "./constants";

export interface Project {
  id: string;
  name: string;
  client: string;
  status: ProjectStatus;
  progress: number;
  blockedCount: number;
}

export interface NodeTask {
  id: string;
  text: string;
  done: boolean;
  order: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userInitials: string;
  userColor: string;
  text: string;
  createdAt: string;
  isMe: boolean;
}

export interface FunnelNodeData {
  title: string;
  subtitle: string;
  icon: string;
  role: RoleKey;
  ownerInitials: string;
  ownerColor: string;
  tasks: NodeTask[];
  messages: ChatMessage[];
  hasUnread: boolean;
  // Runtime callbacks — injected by AppShell, not stored in DB
  onTaskToggle?: (taskId: string) => void;
  onSendMessage?: (text: string) => void;
}

export interface Zone {
  id: string;
  label: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
