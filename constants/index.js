// ─── Constantes y configuración del dashboard Saber Pro ─────────────────────

export const MOD_KEYS = ["lectura", "razona", "competen", "ingles", "escritura"];

export const MOD_LABELS = {
    lectura: "Lectura Crítica",
    razona: "Razonamiento Cuant.",
    competen: "Competencias Ciudadanas",
    ingles: "Inglés",
    escritura: "Comunicación Escrita",
};

export const MOD_LABELS_FULL = {
    lectura: "Lectura Crítica",
    razona: "Razonamiento Cuantitativo",
    competen: "Competencias Ciudadanas",
    ingles: "Inglés",
    escritura: "Comunicación Escrita",
};

export const MOD_SHORT = {
    lectura: "Lectura",
    razona: "Razon.",
    competen: "Ciudadanas",
    ingles: "Inglés",
    escritura: "Escritura",
};

export const MOD_COLORS = {
    lectura: "#3b82f6",
    razona: "#8b5cf6",
    competen: "#f59e0b",
    ingles: "#10b981",
    escritura: "#f43f5e",
};

export const UMBRAL = 120;
export const UMBRAL_TOTAL = 130; // Umbral del puntaje total para alerta (como en Python)

// Niveles de desempeño (Saber Pro)
export const NIVELES = {
    1: { label: "Nivel 1", color: "#dc2626", bg: "#fee2e2" },  // Crítico
    2: { label: "Nivel 2", color: "#f97316", bg: "#ffedd5" },  // Bajo
    3: { label: "Nivel 3", color: "#16a34a", bg: "#dcfce7" },  // Medio
    4: { label: "Nivel 4", color: "#2563eb", bg: "#dbeafe" },  // Alto
};

// Paleta de colores del UI
export const C = {
    bg: "#f8fafc",
    panel: "#ffffff",
    border: "#e2e8f0",
    primary: "#1e3a5f",
    accent: "#e63946",
    warn: "#f97316",
    ok: "#16a34a",
    text: "#1e293b",
    muted: "#64748b",
    light: "#f1f5f9",
};
