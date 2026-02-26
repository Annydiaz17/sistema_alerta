// ═══════════════════════════════════════════════════════════════════════════════
// Saber Pro Dashboard — Componente Principal
// ═══════════════════════════════════════════════════════════════════════════════
import { useState, useCallback } from "react";
import { C, UMBRAL } from "./constants";
import { parseFile } from "./utils/excelParser";
import { detectColumns, processData } from "./utils/dataProcessor";
import { generateDemo } from "./utils/demoData";
import UploadScreen from "./components/UploadScreen";
import KPIBar from "./components/KPIBar";
import TabBar from "./components/TabBar";
import GraficasTab from "./components/GraficasTab";
import ProgramaTab from "./components/ProgramaTab";
import TablaTab from "./components/TablaTab";
import AlertasTab from "./components/AlertasTab";

export default function SaberProDashboard() {
    const [students, setStudents] = useState([]);
    const [cols, setCols] = useState({});
    const [cleanStats, setCleanStats] = useState(null);
    const [tab, setTab] = useState("graficas");
    const [loading, setLoading] = useState(false);

    const cargar = useCallback(async (file) => {
        setLoading(true);
        try {
            const raw = await parseFile(file);
            const det = detectColumns(raw);
            const { students: processed, cleanStats: stats } = processData(raw, det);
            setStudents(processed);
            setCols(det);
            setCleanStats(stats);
            setTab("graficas");
        } catch (err) { alert("Error al leer: " + err.message); }
        setLoading(false);
    }, []);

    const demo = () => {
        const raw = generateDemo();
        const det = detectColumns(raw);
        const { students: processed, cleanStats: stats } = processData(raw, det);
        setStudents(processed);
        setCols(det);
        setCleanStats(stats);
        setTab("graficas");
    };

    // ── Pantalla de carga ──
    if (!students.length) {
        return <UploadScreen onFileLoad={cargar} onDemo={demo} loading={loading} />;
    }

    // ── Datos derivados ──
    const enRiesgo = students.filter(e => e.enRiesgo);
    const aprobados = students.filter(e => !e.enRiesgo);
    const promG = students.reduce((a, e) => a + (e.puntajeGlobal || 0), 0) / students.length;
    const programas = [...new Set(students.map(e => e.programa))].sort();

    // ── Dashboard ──
    return (
        <div style={{ fontFamily: "'Libre Franklin',Georgia,serif", background: C.bg, minHeight: "100vh" }}>
            <link href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400;600;700;800&display=swap" rel="stylesheet" />

            {/* HEADER */}
            <div style={{ background: C.primary, padding: "0 28px", display: "flex", alignItems: "center", height: 54, gap: 12 }}>
                <span style={{ fontSize: 17, fontWeight: 800, color: "#fff", letterSpacing: -0.3 }}>📊 Saber Pro · Diagnóstico Temprano</span>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,.55)" }}>{students.length} estudiantes · umbral {UMBRAL}</span>
                {cleanStats && cleanStats.totalCleaned > 0 && (
                    <span style={{ fontSize: 11, color: "#fcd34d", background: "rgba(255,255,255,.1)", padding: "2px 8px", borderRadius: 4 }}>
                        🧹 {cleanStats.totalCleaned} datos limpiados
                    </span>
                )}
                <button onClick={() => { setStudents([]); setCols({}); setCleanStats(null); }} style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.2)", color: "#fff", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>
                    ↩ Cambiar archivo
                </button>
            </div>

            <KPIBar students={students} enRiesgo={enRiesgo} aprobados={aprobados} promG={promG} programas={programas} cleanStats={cleanStats} />
            <TabBar tab={tab} setTab={setTab} enRiesgoCount={enRiesgo.length} />

            <div style={{ padding: "24px 28px" }}>
                {tab === "graficas" && <GraficasTab students={students} />}
                {tab === "programa" && <ProgramaTab students={students} programas={programas} />}
                {tab === "tabla" && <TablaTab students={students} programas={programas} />}
                {tab === "alertas" && <AlertasTab students={students} enRiesgo={enRiesgo} programas={programas} />}
            </div>

            <div style={{ borderTop: `1px solid ${C.border}`, padding: "10px 28px", fontSize: 11, color: "#94a3b8", display: "flex", justifyContent: "space-between" }}>
                <span>Diagnóstico Saber Pro · Umbral: {UMBRAL}</span>
                <span>Columnas detectadas: {Object.values(cols).filter(Boolean).length} · Niveles: {Object.keys(cols.niveles || {}).length}</span>
            </div>
        </div>
    );
}
