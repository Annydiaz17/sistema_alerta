// ─── Barra de indicadores clave (KPIs) ──────────────────────────────────────
import { C, UMBRAL } from "../constants";

export default function KPIBar({ students, enRiesgo, aprobados, promG, programas, cleanStats }) {
    const kpis = [
        { label: "Total estudiantes", val: students.length, color: C.primary },
        { label: "En riesgo", val: enRiesgo.length, color: C.accent },
        { label: "% en riesgo", val: `${((enRiesgo.length / students.length) * 100).toFixed(1)}%`, color: C.accent },
        { label: "Aprobados (≥120)", val: aprobados.length, color: C.ok },
        { label: "Promedio global", val: promG.toFixed(1), color: promG < UMBRAL ? C.accent : C.primary },
        { label: "Programas", val: programas.length, color: "#7c3aed" },
    ];

    // Si hubo limpieza de datos, agregar indicador
    if (cleanStats && cleanStats.totalCleaned > 0) {
        kpis.push({
            label: "Datos limpiados (IA→med.)",
            val: cleanStats.totalCleaned,
            color: "#f59e0b",
        });
    }

    return (
        <div style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, padding: "14px 28px", display: "flex", gap: 28, flexWrap: "wrap" }}>
            {kpis.map(k => (
                <div key={k.label}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: k.color, lineHeight: 1.1 }}>{k.val}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2, maxWidth: 120 }}>{k.label}</div>
                </div>
            ))}
        </div>
    );
}
