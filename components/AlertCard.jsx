// ─── Tarjeta de alerta por estudiante ────────────────────────────────────────
import { MOD_KEYS, MOD_LABELS, UMBRAL, NIVELES } from "../constants";

export default function AlertCard({ e }) {
    const criticos = MOD_KEYS.filter(k => e.modulos[k] != null && e.modulos[k] < UMBRAL);
    const nivelesRiesgo = MOD_KEYS.filter(k => (e.niveles || {})[k] === 1);

    return (
        <div style={{ background: "#fff8f8", border: "1px solid #fecaca", borderLeft: "4px solid #e63946", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                    <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 13 }}>{e.nombre}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{e.codigo} · {e.programa}</div>
                    {e.jornada && e.jornada !== "—" && (
                        <div style={{ fontSize: 10, color: "#94a3b8" }}>{e.jornada}</div>
                    )}
                </div>
                <div style={{ background: "#e63946", color: "#fff", borderRadius: 6, padding: "3px 10px", fontSize: 13, fontWeight: 800 }}>
                    {e.puntajeGlobal?.toFixed(1)}
                </div>
            </div>

            {/* Razones de alerta */}
            {e.razones && e.razones.length > 0 && (
                <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {e.razones.map((r, i) => (
                        <span key={i} style={{
                            fontSize: 10, padding: "2px 7px", borderRadius: 4, fontWeight: 600,
                            background: r.includes("Nivel 1") ? "#fee2e2" : "#fef3c7",
                            color: r.includes("Nivel 1") ? "#dc2626" : "#d97706",
                        }}>{r}</span>
                    ))}
                </div>
            )}

            {/* Módulos críticos */}
            {criticos.length > 0 && (
                <div style={{ marginTop: 6, fontSize: 11, color: "#b91c1c" }}>
                    ⚠ Puntaje bajo: {criticos.map(k => `${MOD_LABELS[k]} (${e.modulos[k]?.toFixed(0)})`).join(", ")}
                </div>
            )}

            {/* Niveles de desempeño */}
            {Object.keys(e.niveles || {}).length > 0 && (
                <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {MOD_KEYS.map(k => {
                        const n = (e.niveles || {})[k];
                        if (n == null) return null;
                        const info = NIVELES[n] || { label: `N${n}`, color: "#64748b", bg: "#f1f5f9" };
                        return (
                            <span key={k} style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, fontWeight: 600, background: info.bg, color: info.color }}>
                                {MOD_LABELS[k]?.split(" ")[0]}: {info.label}
                            </span>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
