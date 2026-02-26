// ─── Tab de Alertas (con exportación por programa) ──────────────────────────
import { MOD_KEYS, MOD_LABELS, C, UMBRAL } from "../constants";
import { loadXLSX } from "../utils/excelParser";
import AlertCard from "./AlertCard";

export default function AlertasTab({ students, enRiesgo, programas }) {
    // Exportar un Excel con un sheet por programa (como Python)
    const exportarAlertas = async () => {
        const XLSX = await loadXLSX();
        const wb = XLSX.utils.book_new();

        // Sheet global
        const dataGlobal = [...enRiesgo]
            .sort((a, b) => (a.puntajeGlobal || 0) - (b.puntajeGlobal || 0))
            .map(e => ({
                Nombre: e.nombre, "Código": e.codigo, Programa: e.programa, Jornada: e.jornada || "—",
                "Puntaje Global": e.puntajeGlobal?.toFixed(1),
                ...Object.fromEntries(MOD_KEYS.map(k => [MOD_LABELS[k], e.modulos[k]?.toFixed(1) || "—"])),
                "Razón Alerta": (e.razones || []).join("; "),
                Estado: "EN RIESGO",
            }));
        const wsGlobal = XLSX.utils.json_to_sheet(dataGlobal);
        XLSX.utils.book_append_sheet(wb, wsGlobal, "Todas las Alertas");

        // Un sheet por programa (como Python: for programa in programas_principales)
        programas.forEach(prog => {
            const alertasProg = enRiesgo.filter(e => e.programa === prog);
            if (alertasProg.length === 0) return;

            const data = [...alertasProg]
                .sort((a, b) => (a.puntajeGlobal || 0) - (b.puntajeGlobal || 0))
                .map(e => ({
                    Nombre: e.nombre, "Código": e.codigo, Jornada: e.jornada || "—",
                    "Puntaje Global": e.puntajeGlobal?.toFixed(1),
                    ...Object.fromEntries(MOD_KEYS.map(k => [MOD_LABELS[k], e.modulos[k]?.toFixed(1) || "—"])),
                    "Razón Alerta": (e.razones || []).join("; "),
                }));
            const ws = XLSX.utils.json_to_sheet(data);
            // Nombre de sheet limpio (max 31 chars, sin caracteres inválidos)
            const sheetName = prog.replace(/[\/\\?*\[\]:]/g, "").substring(0, 31);
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });

        XLSX.writeFile(wb, "alertas_saberpro.xlsx");
    };

    // Agrupar por programa para mostrar conteo
    const porPrograma = programas.map(p => ({
        programa: p,
        total: students.filter(e => e.programa === p).length,
        riesgo: enRiesgo.filter(e => e.programa === p).length,
    })).filter(p => p.riesgo > 0).sort((a, b) => b.riesgo - a.riesgo);

    return (
        <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: C.accent }}>⚠ {enRiesgo.length} estudiantes en riesgo</div>
                    <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>Puntaje &lt; {UMBRAL} · Nivel 1 en Lectura/Razonamiento · ordenados de menor a mayor</div>
                </div>
                <button onClick={exportarAlertas} style={{ background: C.primary, color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    ⬇ Exportar Excel (por programa)
                </button>
            </div>

            {/* Resumen por programa */}
            {porPrograma.length > 0 && (
                <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
                    {porPrograma.map(p => (
                        <div key={p.programa} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 12 }}>
                            <div style={{ fontWeight: 700, color: C.text, marginBottom: 2 }}>{p.programa}</div>
                            <span style={{ color: C.accent, fontWeight: 800 }}>{p.riesgo}</span>
                            <span style={{ color: C.muted }}> / {p.total}</span>
                        </div>
                    ))}
                </div>
            )}

            {enRiesgo.length === 0 ? (
                <div style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: 12, padding: 32, textAlign: "center", color: C.ok, fontWeight: 700, fontSize: 16 }}>
                    ✓ Ningún estudiante está por debajo del umbral.
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 8 }}>
                    {[...enRiesgo].sort((a, b) => (a.puntajeGlobal || 0) - (b.puntajeGlobal || 0)).map(e => <AlertCard key={e.id} e={e} />)}
                </div>
            )}
        </>
    );
}
