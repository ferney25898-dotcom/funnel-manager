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
  fileUrl?:  string;
  fileType?: string;
  readBy:    string[];   // user_ids que ya leyeron este mensaje
}

export interface ProjectMember {
  id:        string;
  full_name: string;
  email:     string;
  color:     string;
  role:      "owner" | "editor" | "viewer";
}

export interface FunnelNodeData {
  title: string;
  subtitle: string;
  icon: string;
  role: RoleKey;
  ownerInitials: string;
  ownerColor: string;
  assignedTo?: string | null; // profile id
  tasks: NodeTask[];
  messages: ChatMessage[];
  hasUnread: boolean;
  // Runtime callbacks — injected by AppShell, not stored in DB
  onTaskToggle?:     (taskId: string) => void;
  onDeleteTask?:     (taskId: string) => void;
  onMarkRead?:       () => void;
  onSendMessage?:    (text: string) => void;
  onAddTask?:        (text: string) => void;
  onUpdateNodeData?: (updates: {
    title?:          string;
    subtitle?:       string;
    icon?:           string;
    role?:           string;
    assignedTo?:     string | null;
    ownerInitials?:  string;
    ownerColor?:     string;
  }) => void;
  onUploadFile?:     (file: File) => Promise<void>;
  members?:          ProjectMember[];
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

export interface ZoneNodeData {
  label:          string;
  color:          string;
  width:          number;
  height:         number;
  onResize?:      (w: number, h: number) => void;
  onLabelChange?: (label: string) => void;
  onColorChange?: (color: string) => void;
  onDelete?:      () => void;
}
