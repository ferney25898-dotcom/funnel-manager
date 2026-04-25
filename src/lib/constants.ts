export const ROLE_COLORS: Record<string, string> = {
  trafficker:    "#3B82F6",
  estratega:     "#10B981",
  ghl:           "#7C3AED",
  integraciones: "#6366F1",
  ventas:        "#E24B4A",
  pm:            "#F59E0B",
  experto:       "#8B5CF6",
};

export const ROLE_LABELS: Record<string, string> = {
  trafficker:    "Trafficker Digital",
  estratega:     "Estratega / Copy",
  ghl:           "GHL Builder",
  integraciones: "Integraciones",
  ventas:        "Líder de Ventas",
  pm:            "Project Manager",
  experto:       "Experto / CEO",
};

export const PROJECT_STATUSES = {
  draft:     { label: "Borrador",  color: "#F59E0B" },
  active:    { label: "En curso",  color: "#10B981" },
  completed: { label: "Completo",  color: "#6366F1" },
} as const;

export type ProjectStatus = keyof typeof PROJECT_STATUSES;
export type RoleKey = keyof typeof ROLE_COLORS;
