// ─── Wrapper de sección con título, subtítulo y leyenda ──────────────────────
import { C } from "../constants";

export default function Section({ title, subtitle, legend, children }) {
    return (
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: "22px 24px", marginBottom: 20 }}>
            <div style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 800, color: C.text, fontSize: 15 }}>{title}</div>
                {subtitle && <div style={{ fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>{subtitle}</div>}
            </div>
            {children}
            {legend && (
                <div style={{ display: "flex", gap: 18, marginTop: 12, flexWrap: "wrap" }}>
                    {legend.map((l, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.muted }}>
                            <div style={{ width: 12, height: 12, ...l.style, borderRadius: 2 }} />
                            {l.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
