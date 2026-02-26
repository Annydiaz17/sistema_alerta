// ─── Gráfica 2: Promedio por Módulo ─────────────────────────────────────────
import { MOD_KEYS, MOD_SHORT, MOD_COLORS, UMBRAL } from "../constants";

export default function PromedioBarChart({ students }) {
    const W = 660, H = 270, PL = 52, PR = 16, PT = 30, PB = 52;
    const iW = W - PL - PR, iH = H - PT - PB;

    const data = MOD_KEYS.map(k => {
        const vals = students.map(e => e.modulos[k]).filter(v => v != null && !isNaN(v));
        return { key: k, label: MOD_SHORT[k], avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0 };
    });

    const maxV = Math.max(...data.map(d => d.avg), UMBRAL + 25);
    const yS = v => iH - (v / maxV) * iH;
    const slotW = iW / data.length;
    const barW = slotW * 0.56;
    const yTicks = [0, 50, 100, UMBRAL, 150, 200].filter(v => v <= maxV + 5);

    return (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", fontFamily: "inherit" }}>
            <defs>
                {data.map(d => (
                    <linearGradient key={d.key} id={`pg-${d.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={MOD_COLORS[d.key]} stopOpacity="1" />
                        <stop offset="100%" stopColor={MOD_COLORS[d.key]} stopOpacity="0.45" />
                    </linearGradient>
                ))}
            </defs>
            <g transform={`translate(${PL},${PT})`}>
                {yTicks.map(v => (
                    <g key={v}>
                        <line x1={0} y1={yS(v)} x2={iW} y2={yS(v)}
                            stroke={v === UMBRAL ? "#fca5a5" : "#f1f5f9"}
                            strokeWidth={v === UMBRAL ? 1.8 : 1}
                            strokeDasharray={v === UMBRAL ? "7,4" : "none"} />
                        <text x={-6} y={yS(v) + 4} fontSize={10}
                            fill={v === UMBRAL ? "#e63946" : "#94a3b8"} textAnchor="end"
                            fontWeight={v === UMBRAL ? "700" : "400"}>
                            {v === UMBRAL ? `${v}⚠` : v}
                        </text>
                    </g>
                ))}
                <line x1={0} y1={iH} x2={iW} y2={iH} stroke="#e2e8f0" />
                <line x1={0} y1={0} x2={0} y2={iH} stroke="#e2e8f0" />

                {data.map((d, i) => {
                    const cx = slotW * i + slotW / 2;
                    const bx = cx - barW / 2;
                    const by = yS(d.avg);
                    const bh = Math.max(iH - by, 2);
                    const bad = d.avg < UMBRAL;
                    return (
                        <g key={d.key}>
                            <rect x={bx} y={by} width={barW} height={bh}
                                fill={bad ? "#fca5a5" : `url(#pg-${d.key})`}
                                stroke={bad ? "#e63946" : MOD_COLORS[d.key]} strokeWidth={1.2} rx={4} />
                            {bad && <text x={cx} y={by - 19} fontSize={10} fill="#e63946" textAnchor="middle">⚠</text>}
                            <text x={cx} y={by - 6} fontSize={12} fill={bad ? "#e63946" : "#1e293b"} textAnchor="middle" fontWeight="800">
                                {d.avg.toFixed(1)}
                            </text>
                            <text x={cx} y={iH + 20} fontSize={11} fill="#475569" textAnchor="middle" fontWeight="600">{d.label}</text>
                        </g>
                    );
                })}
            </g>
        </svg>
    );
}
