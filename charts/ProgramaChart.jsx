// ─── Gráfica: Boxplot por Programa Individual ───────────────────────────────
// Réplica del boxplot + swarmplot del Python por programa con media/mediana
import { MOD_KEYS, MOD_SHORT, MOD_COLORS, UMBRAL } from "../constants";
import { boxStats } from "../utils/stats";

export default function ProgramaChart({ students, programa }) {
    const filtered = programa === "todos"
        ? students
        : students.filter(e => e.programa === programa);

    const W = 700, H = 370, PL = 52, PR = 16, PT = 40, PB = 55;
    const iW = W - PL - PR, iH = H - PT - PB;

    const modData = MOD_KEYS.map(k => {
        const vals = filtered.map(e => e.modulos[k]).filter(v => v != null);
        return {
            key: k, color: MOD_COLORS[k], label: MOD_SHORT[k],
            stats: boxStats(vals),
            vals,
        };
    }).filter(d => d.stats);

    if (!modData.length) return <p style={{ color: "#94a3b8" }}>Sin datos para este programa.</p>;

    const allVals = filtered.flatMap(e => Object.values(e.modulos)).filter(v => v != null);
    const gMin = Math.max(0, Math.min(...allVals) - 12);
    const gMax = Math.min(300, Math.max(...allVals) + 50);
    const yS = v => iH - ((v - gMin) / (gMax - gMin)) * iH;

    const slotW = iW / modData.length;
    const boxW = Math.min(slotW * 0.42, 46);

    const yTicks = [];
    for (let v = Math.ceil(gMin / 20) * 20; v <= gMax; v += 20) yTicks.push(v);

    return (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", fontFamily: "inherit" }}>
            <defs>
                {modData.map(d => (
                    <linearGradient key={d.key} id={`pg-${d.key}-prog`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={d.color} stopOpacity="0.85" />
                        <stop offset="100%" stopColor={d.color} stopOpacity="0.3" />
                    </linearGradient>
                ))}
            </defs>
            <g transform={`translate(${PL},${PT})`}>
                {/* Grid */}
                {yTicks.map(v => (
                    <g key={v}>
                        <line x1={0} y1={yS(v)} x2={iW} y2={yS(v)} stroke="#f1f5f9" strokeWidth={1} />
                        <text x={-6} y={yS(v) + 4} fontSize={10} fill="#94a3b8" textAnchor="end">{v}</text>
                    </g>
                ))}
                <line x1={0} y1={0} x2={0} y2={iH} stroke="#e2e8f0" />
                <line x1={0} y1={iH} x2={iW} y2={iH} stroke="#e2e8f0" />

                {/* Umbral */}
                <line x1={0} y1={yS(UMBRAL)} x2={iW} y2={yS(UMBRAL)} stroke="#e63946" strokeWidth={2} strokeDasharray="7,4" />
                <text x={iW - 4} y={yS(UMBRAL) - 5} fontSize={10} fill="#e63946" textAnchor="end" fontWeight="700">Umbral {UMBRAL}</text>

                {modData.map((d, i) => {
                    const s = d.stats;
                    const cx = slotW * i + slotW / 2;
                    const bx = cx - boxW / 2;
                    const yQ1 = yS(s.q1), yQ3 = yS(s.q3), yMed = yS(s.med);
                    const yWL = yS(s.whiskerLo), yWH = yS(s.whiskerHi);
                    const boxH = Math.max(yQ1 - yQ3, 2);

                    return (
                        <g key={d.key}>
                            {/* Whiskers */}
                            <line x1={cx} y1={yWH} x2={cx} y2={yQ3} stroke={d.color} strokeWidth={1.5} />
                            <line x1={cx} y1={yQ1} x2={cx} y2={yWL} stroke={d.color} strokeWidth={1.5} />
                            <line x1={cx - 10} y1={yWH} x2={cx + 10} y2={yWH} stroke={d.color} strokeWidth={2} />
                            <line x1={cx - 10} y1={yWL} x2={cx + 10} y2={yWL} stroke={d.color} strokeWidth={2} />
                            {/* Box */}
                            <rect x={bx} y={yQ3} width={boxW} height={boxH}
                                fill={`url(#pg-${d.key}-prog)`} stroke={d.color} strokeWidth={2} rx={3} />
                            {/* Median line */}
                            <line x1={bx} y1={yMed} x2={bx + boxW} y2={yMed} stroke="#1e293b" strokeWidth={2.8} />
                            {/* Mean dot */}
                            <circle cx={cx} cy={yS(s.mean)} r={3.5} fill="#fff" stroke={d.color} strokeWidth={2} />

                            {/* Swarm dots (like Python swarmplot) — show individual students */}
                            {d.vals.map((v, vi) => {
                                const jitter = ((vi * 7 + 3) % 11 - 5) * (boxW / 22);
                                const isRisk = v < UMBRAL;
                                return (
                                    <circle key={vi} cx={cx + jitter} cy={yS(v)} r={2.8}
                                        fill={isRisk ? "#e63946" : "#16a34a"} opacity={0.55} />
                                );
                            })}

                            {/* Stats label (like Python: Media + Mediana above box) */}
                            <rect x={cx - 38} y={yS(gMax) + 2} width={76} height={30} rx={4}
                                fill="#f0f9ff" stroke="#93c5fd" strokeWidth={0.8} />
                            <text x={cx} y={yS(gMax) + 14} fontSize={9} fill="#1e40af" textAnchor="middle" fontWeight="700">
                                Media: {s.mean.toFixed(1)}
                            </text>
                            <text x={cx} y={yS(gMax) + 26} fontSize={9} fill="#1e40af" textAnchor="middle" fontWeight="600">
                                Mediana: {s.med.toFixed(1)}
                            </text>

                            {/* X label */}
                            <text x={cx} y={iH + 20} fontSize={11} fill="#475569" textAnchor="middle" fontWeight="600">{d.label}</text>
                        </g>
                    );
                })}
            </g>
        </svg>
    );
}
