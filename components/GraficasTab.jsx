// ─── Tab de Gráficas ────────────────────────────────────────────────────────
import { MOD_KEYS, MOD_LABELS, MOD_SHORT, UMBRAL, C } from "../constants";
import Section from "./Section";
import BoxplotChart from "../charts/BoxplotChart";
import PromedioBarChart from "../charts/PromedioBarChart";
import AlertaBarChart from "../charts/AlertaBarChart";
import HistogramaChart from "../charts/HistogramaChart";

export default function GraficasTab({ students }) {
    return (
        <>
            <Section
                title="① Boxplot por Módulo"
                subtitle="Distribución estadística completa. La línea negra es la mediana, la caja el IQR (50% central), los bigotes el rango, el punto blanco la media. Círculos = valores atípicos."
                legend={[
                    { label: "Mediana (línea negra)", style: { background: "#1e293b", height: 3, width: 14 } },
                    { label: "Media (punto)", style: { borderRadius: "50%", background: "#fff", border: "2px solid #64748b", width: 10, height: 10 } },
                    { label: "Outlier", style: { borderRadius: "50%", background: "#fff", border: "2px solid #f59e0b", width: 10, height: 10 } },
                    { label: `Umbral ${UMBRAL}`, style: { background: "#e63946", height: 2, width: 14 } },
                ]}
            >
                <BoxplotChart students={students} />
            </Section>

            <Section
                title="② Promedio por Módulo"
                subtitle="¿En qué módulo están más débiles los estudiantes? Las barras rojas indican que el promedio del grupo no alcanza el umbral de 120."
                legend={[
                    { label: "Promedio < 120 (crítico)", style: { background: "#fca5a5", border: "1px solid #e63946" } },
                    { label: "Promedio ≥ 120", style: { background: "#93c5fd", border: "1px solid #3b82f6" } },
                ]}
            >
                <PromedioBarChart students={students} />
            </Section>

            <Section
                title="③ Estudiantes en Alerta por Módulo"
                subtitle="Número absoluto (grande) y porcentaje (pequeño) de estudiantes con puntaje < 120 en cada módulo. El gris claro muestra el total evaluado."
            >
                <AlertaBarChart students={students} />
                {/* Tabla resumen */}
                <div style={{ marginTop: 18, overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                            <tr style={{ background: C.light }}>
                                {["Módulo", "Total", "En alerta", "% alerta", "Promedio"].map(h => (
                                    <th key={h} style={{ padding: "7px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.muted }}>{h.toUpperCase()}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {MOD_KEYS.map(k => {
                                const vals = students.map(e => e.modulos[k]).filter(v => v != null && !isNaN(v));
                                const alert = vals.filter(v => v < UMBRAL).length;
                                const prom = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
                                const pct = vals.length ? (alert / vals.length) * 100 : 0;
                                return (
                                    <tr key={k} style={{ borderBottom: `1px solid ${C.border}` }}>
                                        <td style={{ padding: "7px 12px", fontWeight: 600, color: C.text }}>{MOD_LABELS[k]}</td>
                                        <td style={{ padding: "7px 12px", color: C.muted }}>{vals.length}</td>
                                        <td style={{ padding: "7px 12px" }}>
                                            <span style={{ background: "#fee2e2", color: C.accent, borderRadius: 4, padding: "2px 8px", fontWeight: 700 }}>{alert}</span>
                                        </td>
                                        <td style={{ padding: "7px 12px", fontWeight: 700, color: pct >= 30 ? C.accent : C.ok }}>{pct.toFixed(1)}%</td>
                                        <td style={{ padding: "7px 12px", fontWeight: 700, color: prom < UMBRAL ? C.accent : C.ok }}>{prom.toFixed(1)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Section>

            <Section
                title="④ Distribución General de Puntajes"
                subtitle="Histograma de los puntajes globales. La zona roja muestra la concentración de estudiantes bajo el umbral 120. Útil para ver si la mayoría está cerca o lejos del umbral."
                legend={[
                    { label: `Puntaje < ${UMBRAL} (en riesgo)`, style: { background: "#fca5a5", border: "1px solid #e63946" } },
                    { label: `Puntaje ≥ ${UMBRAL} (aprobado)`, style: { background: "#93c5fd", border: "1px solid #3b82f6" } },
                ]}
            >
                <HistogramaChart students={students} />
            </Section>
        </>
    );
}
