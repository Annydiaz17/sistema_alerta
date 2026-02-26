// ─── Tab de Análisis por Programa ───────────────────────────────────────────
// Réplica del loop "for programa in programas_principales" del Python
import { useState } from "react";
import { MOD_KEYS, MOD_LABELS, UMBRAL, NIVELES, C } from "../constants";
import Section from "./Section";
import ProgramaChart from "../charts/ProgramaChart";

export default function ProgramaTab({ students, programas }) {
    const [selProg, setSelProg] = useState("todos");

    const filtered = selProg === "todos" ? students : students.filter(e => e.programa === selProg);
    const total = filtered.length;

    // Estadísticas de niveles (como Python: estudiantes con al menos un Nivel 1/2)
    const conNivel1 = filtered.filter(e =>
        Object.values(e.niveles || {}).some(n => n === 1)
    ).length;
    const conNivel2 = filtered.filter(e =>
        Object.values(e.niveles || {}).some(n => n === 2)
    ).length;
    const enRiesgo = filtered.filter(e => e.enRiesgo).length;

    return (
        <>
            {/* Selector de programa */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ fontWeight: 700, fontSize: 13, color: C.text }}>Programa:</label>
                <select value={selProg} onChange={e => setSelProg(e.target.value)}
                    style={{ padding: "9px 14px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, background: "#fff", color: C.text, minWidth: 260 }}>
                    <option value="todos">📊 Todos los programas ({students.length} est.)</option>
                    {programas.map(p => {
                        const n = students.filter(e => e.programa === p).length;
                        return <option key={p} value={p}>{p} ({n})</option>;
                    })}
                </select>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 12, color: C.muted }}>{total} estudiantes seleccionados</span>
            </div>

            {/* Resumen de alertas del programa (como Python: reporte textual) */}
            <div style={{
                background: "linear-gradient(135deg, #fef2f2 0%, #fff7ed 100%)",
                border: "1px solid #fecaca", borderRadius: 12, padding: "18px 22px", marginBottom: 20,
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16,
            }}>
                <div>
                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 4 }}>TOTAL ESTUDIANTES</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: C.primary }}>{total}</div>
                </div>
                <div>
                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 4 }}>EN RIESGO</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: C.accent }}>{enRiesgo}</div>
                    <div style={{ fontSize: 11, color: C.accent }}>{total ? ((enRiesgo / total) * 100).toFixed(1) : 0}%</div>
                </div>
                <div>
                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 4 }}>CON NIVEL 1 (algún módulo)</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "#dc2626" }}>{conNivel1}</div>
                    <div style={{ fontSize: 11, color: "#dc2626" }}>{total ? ((conNivel1 / total) * 100).toFixed(1) : 0}%</div>
                </div>
                <div>
                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 4 }}>CON NIVEL 2 (algún módulo)</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "#f97316" }}>{conNivel2}</div>
                    <div style={{ fontSize: 11, color: "#f97316" }}>{total ? ((conNivel2 / total) * 100).toFixed(1) : 0}%</div>
                </div>
            </div>

            {/* Boxplot + Swarm por Programa */}
            <Section
                title={`Desempeño Detallado: ${selProg === "todos" ? "TODOS LOS PROGRAMAS" : selProg.toUpperCase()}`}
                subtitle="Cada punto representa un estudiante (rojo = alerta, verde = ok). La caja muestra el rango intercuartil (IQR), la línea negra la mediana, el punto blanco la media."
                legend={[
                    { label: "Estudiante en riesgo (<120)", style: { borderRadius: "50%", background: "#e63946", width: 10, height: 10 } },
                    { label: "Estudiante ok (≥120)", style: { borderRadius: "50%", background: "#16a34a", width: 10, height: 10 } },
                    { label: `Umbral ${UMBRAL}`, style: { background: "#e63946", height: 2, width: 14 } },
                ]}
            >
                <ProgramaChart students={students} programa={selProg} />
            </Section>

            {/* Tabla detallada por módulo para el programa */}
            <Section title="Estadísticas por Módulo" subtitle="Detalle numérico del programa seleccionado.">
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                            <tr style={{ background: C.light }}>
                                {["Módulo", "Estudiantes", "Media", "Mediana", "Mín", "Máx", "En alerta", "% alerta", "Nivel 1", "Nivel 2"].map(h => (
                                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.muted }}>{h.toUpperCase()}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {MOD_KEYS.map(k => {
                                const vals = filtered.map(e => e.modulos[k]).filter(v => v != null && !isNaN(v));
                                const alert = vals.filter(v => v < UMBRAL).length;
                                const pct = vals.length ? (alert / vals.length) * 100 : 0;
                                const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
                                const sorted = [...vals].sort((a, b) => a - b);
                                const med = sorted.length ? (sorted.length % 2 === 0 ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 : sorted[Math.floor(sorted.length / 2)]) : 0;
                                const n1 = filtered.filter(e => (e.niveles || {})[k] === 1).length;
                                const n2 = filtered.filter(e => (e.niveles || {})[k] === 2).length;

                                return (
                                    <tr key={k} style={{ borderBottom: `1px solid ${C.border}` }}>
                                        <td style={{ padding: "8px 12px", fontWeight: 600, color: C.text }}>{MOD_LABELS[k]}</td>
                                        <td style={{ padding: "8px 12px", color: C.muted }}>{vals.length}</td>
                                        <td style={{ padding: "8px 12px", fontWeight: 700, color: mean < UMBRAL ? C.accent : C.ok }}>{mean.toFixed(1)}</td>
                                        <td style={{ padding: "8px 12px", fontWeight: 600, color: C.text }}>{med.toFixed(1)}</td>
                                        <td style={{ padding: "8px 12px", color: C.muted }}>{sorted[0]?.toFixed(0) ?? "—"}</td>
                                        <td style={{ padding: "8px 12px", color: C.muted }}>{sorted[sorted.length - 1]?.toFixed(0) ?? "—"}</td>
                                        <td style={{ padding: "8px 12px" }}>
                                            <span style={{ background: "#fee2e2", color: C.accent, borderRadius: 4, padding: "2px 8px", fontWeight: 700 }}>{alert}</span>
                                        </td>
                                        <td style={{ padding: "8px 12px", fontWeight: 700, color: pct >= 30 ? C.accent : C.ok }}>{pct.toFixed(1)}%</td>
                                        <td style={{ padding: "8px 12px" }}>
                                            {n1 > 0 ? <span style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 4, padding: "2px 8px", fontWeight: 700 }}>{n1}</span> : <span style={{ color: C.muted }}>0</span>}
                                        </td>
                                        <td style={{ padding: "8px 12px" }}>
                                            {n2 > 0 ? <span style={{ background: "#ffedd5", color: "#f97316", borderRadius: 4, padding: "2px 8px", fontWeight: 700 }}>{n2}</span> : <span style={{ color: C.muted }}>0</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Section>
        </>
    );
}
