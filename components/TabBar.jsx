// ─── Navegación por Tabs ────────────────────────────────────────────────────
import { C } from "../constants";

export default function TabBar({ tab, setTab, enRiesgoCount }) {
    const tabStyle = t => ({
        padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
        border: "none", background: "transparent",
        borderBottom: tab === t ? `3px solid ${C.primary}` : "3px solid transparent",
        color: tab === t ? C.primary : C.muted, transition: "all .15s",
    });

    const tabs = [
        ["graficas", "📊 Gráficas"],
        ["programa", "🏫 Por Programa"],
        ["tabla", "📋 Tabla"],
        ["alertas", `⚠ Alertas (${enRiesgoCount})`],
    ];

    return (
        <div style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, padding: "0 28px", display: "flex" }}>
            {tabs.map(([k, l]) => (
                <button key={k} style={tabStyle(k)} onClick={() => setTab(k)}>{l}</button>
            ))}
        </div>
    );
}
