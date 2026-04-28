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

/* ── Task suggestions per role (auto-completar tareas comunes) ─ */
export const TASK_SUGGESTIONS: Record<string, string[]> = {
  trafficker: [
    "Configurar campaña Meta Ads",
    "Configurar campaña Google Ads",
    "Armar públicos lookalike",
    "Instalar pixel + eventos",
    "Crear creatividades para anuncios",
    "Definir presupuesto diario",
    "Configurar UTMs",
    "Análisis de KPIs (CTR, CPL, CPM)",
    "A/B testing de anuncios",
    "Optimizar segmentación",
  ],
  estratega: [
    "Definir avatar / buyer persona",
    "Escribir copy de anuncios",
    "Diseñar embudo (mapa)",
    "Redactar email follow-up",
    "Guion de webinar / VSL",
    "Hooks y ganchos",
    "Estrategia de oferta",
    "Copy para landing page",
    "Asuntos de email",
    "Mensajes de WhatsApp",
  ],
  ghl: [
    "Configurar pipeline GHL",
    "Diseñar landing page",
    "Configurar formulario de registro",
    "Configurar dominio personalizado",
    "Configurar email transaccional",
    "Setup de calendario",
    "Configurar workflow de automatización",
    "Crear secuencia de emails",
    "Configurar SMS automáticos",
    "Setup de membresía",
  ],
  integraciones: [
    "Conectar Zapier / Make",
    "Configurar webhook",
    "Conectar pasarela de pago (Stripe / MP)",
    "Sincronizar CRM",
    "Configurar SMS / WhatsApp API",
    "Conectar Meta Conversions API",
    "Integrar Google Analytics",
    "Conectar Calendly / Booking",
    "API de facturación",
  ],
  ventas: [
    "Llamar a leads calificados",
    "Configurar pipeline de ventas",
    "Script de cierre",
    "Seguimiento post-venta",
    "Reporte de conversiones",
    "Capacitar al equipo de closers",
    "Definir objeciones frecuentes",
    "Setup de CRM de ventas",
  ],
  pm: [
    "Reunión de kickoff",
    "Asignar tareas al equipo",
    "Revisión semanal de avances",
    "Documentar entregables",
    "Reporte al cliente",
    "Coordinar fechas de lanzamiento",
    "Validar dependencias entre roles",
    "Gestión de bloqueos",
  ],
  experto: [
    "Grabar webinar / VSL",
    "Definir oferta y precio",
    "Validar copy y mensajes",
    "Aprobar landing final",
    "Revisar embudo completo",
    "Grabar testimonios",
    "Estrategia de bonos",
    "Definir garantía",
  ],
};
