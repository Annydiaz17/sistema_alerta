// ─── Tab de Tabla ───────────────────────────────────────────────────────────
import { useState } from "react";
import { MOD_KEYS, MOD_SHORT, UMBRAL, NIVELES, C } from "../constants";

export default function TablaTab({ students, programas }) {
    const [buscar, setBuscar] = useState("");
    const [filtroRiesgo, setFiltro] = useState("todos");
    const [filtroProg, setFiltroProg] = useState("todos");
    const [sortCol, setSortCol] = useState("puntajeGlobal");
    const [sortDir, setSortDir] = useState("asc");

    const filtered = students
        .filter(e => { const q = buscar.toLowerCase(); return !q || e.nombre.toLowerCase().includes(q) || e.codigo.toLowerCase().includes(q); })
        .filter(e => filtroRiesgo === "todos" ? true : filtroRiesgo === "riesgo" ? e.enRiesgo : !e.enRiesgo)
        .filter(e => filtroProg === "todos" ? true : e.programa === filtroProg)
        .sort((a, b) => {
            let va = a[sortCol], vb = b[sortCol];
            if (typeof va === "string") { va = va.toLowerCase(); vb = (vb || "").toLowerCase(); }
            if (va == null) va = -Infinity; if (vb == null) vb = -Infinity;
            return sortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
        });

    const toggleSort = col => { if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortCol(col); setSortDir("asc"); } };
    const SortIcon = ({ col }) => sortCol !== col ? <span style={{ opacity: .3 }}>↕</span> : sortDir === "asc" ? "↑" : "↓";

    // Check if any student has niveles
    const hasNiveles = students.some(e => Object.keys(e.niveles || {}).length > 0);

    return (
        <>
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
                <input placeholder="Buscar nombre o código..." value={buscar} onChange={e => setBuscar(e.target.value)}
                    style={{ padding: "8px 14px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.text, outline: "none", width: 240 }} />
                <select value={filtroRiesgo} onChange={e => setFiltro(e.target.value)}
                    style={{ padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, background: "#fff", color: C.text }}>
                    <option value="todos">Todos</option>
                    <option value="riesgo">Solo en riesgo</option>
                    <option value="ok">Solo aprobados</option>
                </select>
                <select value={filtroProg} onChange={e => setFiltroProg(e.target.value)}
                    style={{ padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, background: "#fff", color: C.text }}>
                    <option value="todos">Todos los programas</option>
                    {programas.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <div style={{ flex: 1 }} /><span style={{ fontSize: 12, color: C.muted }}>{filtered.length} resultados</span>
            </div>
            <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: C.light, borderBottom: `2px solid ${C.border}` }}>
                                {[["nombre", "Nombre"], ["codigo", "Código"], ["programa", "Programa"], ["puntajeGlobal", "Puntaje"]].map(([k, l]) => (
                                    <th key={k} onClick={() => toggleSort(k)} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: C.muted, fontSize: 11, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
                                        {l} <SortIcon col={k} />
                                    </th>
                                ))}
                                {MOD_KEYS.map(k => (
                                    <th key={k} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: C.muted, fontSize: 11, whiteSpace: "nowrap" }}>{MOD_SHORT[k]}</th>
                                ))}
                                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: C.muted, fontSize: 11 }}>Estado</th>
                                {hasNiveles && <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: C.muted, fontSize: 11 }}>Razón</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.slice(0, 120).map((e, i) => (
                                <tr key={e.id} style={{ background: i % 2 === 0 ? "#fff" : C.bg, borderBottom: `1px solid ${C.border}` }}>
                                    <td style={{ padding: "8px 14px", fontWeight: 600, color: C.text }}>{e.nombre}</td>
                                    <td style={{ padding: "8px 14px", color: C.muted, fontSize: 12 }}>{e.codigo}</td>
                                    <td style={{ padding: "8px 14px", color: C.muted, fontSize: 12, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.programa}</td>
                                    <td style={{ padding: "8px 14px", fontWeight: 800, fontSize: 14, color: e.enRiesgo ? C.accent : C.ok }}>{e.puntajeGlobal?.toFixed(1)}</td>
                                    {MOD_KEYS.map(k => {
                                        const val = e.modulos[k];
                                        const niv = (e.niveles || {})[k];
                                        const nivInfo = niv ? NIVELES[niv] : null;
                                        return (
                                            <td key={k} style={{ padding: "8px 14px", fontSize: 12 }}>
                                                <span style={{ color: val != null && val < UMBRAL ? C.accent : C.muted, fontWeight: val != null && val < UMBRAL ? 700 : 400 }}>
                                                    {val != null ? val.toFixed(0) : "—"}
                                                </span>
                                                {nivInfo && (
                                                    <span style={{ fontSize: 8, marginLeft: 3, padding: "1px 4px", borderRadius: 3, background: nivInfo.bg, color: nivInfo.color, fontWeight: 600 }}>
                                                        N{niv}
                                                    </span>
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td style={{ padding: "8px 14px" }}>
                                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: e.enRiesgo ? "#fee2e2" : "#dcfce7", color: e.enRiesgo ? C.accent : C.ok }}>
                                            {e.enRiesgo ? "En riesgo" : "Aprobado"}
                                        </span>
                                    </td>
                                    {hasNiveles && (
                                        <td style={{ padding: "8px 14px", fontSize: 10, color: C.accent, maxWidth: 140 }}>
                                            {(e.razones || []).join(", ")}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 120 && (
                    <div style={{ padding: "10px 14px", fontSize: 12, color: C.muted, borderTop: `1px solid ${C.border}` }}>
                        Mostrando 120 de {filtered.length} — usa filtros para acotar.
                    </div>
                )}
            </div>
        </>
    );
}
