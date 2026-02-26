// ─── Gráfica 1: Boxplot por Módulo ──────────────────────────────────────────
import { MOD_KEYS, MOD_SHORT, MOD_COLORS, UMBRAL } from "../constants";
import { boxStats } from "../utils/stats";

export default function BoxplotChart({ students }) {
    const W = 660, H = 320, PL = 52, PR = 16, PT = 32, PB = 50;
    const iW = W - PL - PR, iH = H - PT - PB;

    const modData = MOD_KEYS.map(k => ({
        key: k, color: MOD_COLORS[k],
        label: MOD_SHORT[k],
        stats: boxStats(students.map(e => e.modulos[k]).filter(v => v != null)),
    })).filter(d => d.stats);

    if (!modData.length) return <p style={{ color: "#94a3b8" }}>Sin datos de módulos.</p>;

    const allVals = students.flatMap(e => Object.values(e.modulos)).filter(v => v != null);
    const gMin = Math.max(0, Math.min(...allVals) - 8);
    const gMax = Math.min(300, Math.max(...allVals) + 8);
    const yS = v => iH - ((v - gMin) / (gMax - gMin)) * iH;

    const slotW = iW / modData.length;
    const boxW = Math.min(slotW * 0.44, 46);

    const yTicks = [];
    for (let v = Math.ceil(gMin / 20) * 20; v <= gMax; v += 20) yTicks.push(v);

    return (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", fontFamily: "inherit" }}>
            <defs>
                {modData.map(d => (
                    <linearGradient key={d.key} id={`bxg-${d.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={d.color} stopOpacity="0.85" />
                        <stop offset="100%" stopColor={d.color} stopOpacity="0.35" />
                    </linearGradient>
                ))}
            </defs>
            <g transform={`translate(${PL},${PT})`}>
                {/* Rejilla + eje Y */}
                {yTicks.map(v => (
                    <g key={v}>
                        <line x1={0} y1={yS(v)} x2={iW} y2={yS(v)} stroke="#f1f5f9" strokeWidth={1} />
                        <text x={-6} y={yS(v) + 4} fontSize={10} fill="#94a3b8" textAnchor="end">{v}</text>
                    </g>
                ))}
                <line x1={0} y1={0} x2={0} y2={iH} stroke="#e2e8f0" />
                <line x1={0} y1={iH} x2={iW} y2={iH} stroke="#e2e8f0" />

                {/* Línea umbral */}
                <line x1={0} y1={yS(UMBRAL)} x2={iW} y2={yS(UMBRAL)} stroke="#e63946" strokeWidth={1.8} strokeDasharray="7,4" />
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
                            {/* Bigotes */}
                            <line x1={cx} y1={yWH} x2={cx} y2={yQ3} stroke={d.color} strokeWidth={1.5} />
                            <line x1={cx} y1={yQ1} x2={cx} y2={yWL} stroke={d.color} strokeWidth={1.5} />
                            <line x1={cx - 10} y1={yWH} x2={cx + 10} y2={yWH} stroke={d.color} strokeWidth={2} />
                            <line x1={cx - 10} y1={yWL} x2={cx + 10} y2={yWL} stroke={d.color} strokeWidth={2} />
                            {/* Caja IQR */}
                            <rect x={bx} y={yQ3} width={boxW} height={boxH}
                                fill={`url(#bxg-${d.key})`} stroke={d.color} strokeWidth={2} rx={3} />
                            {/* Línea mediana */}
                            <line x1={bx} y1={yMed} x2={bx + boxW} y2={yMed} stroke="#1e293b" strokeWidth={2.8} />
                            {/* Punto media */}
                            <circle cx={cx} cy={yS(s.mean)} r={3.5} fill="#fff" stroke={d.color} strokeWidth={2} />
                            {/* Outliers */}
                            {s.outliers.map((ov, oi) => (
                                <circle key={oi} cx={cx + (oi % 2 === 0 ? -9 : 9)} cy={yS(ov)} r={3}
                                    fill="none" stroke={d.color} strokeWidth={1.5} opacity={0.65} />
                            ))}
                            {/* Valor mediana */}
                            <text x={cx} y={yMed - 8} fontSize={11} fill="#1e293b" textAnchor="middle" fontWeight="800">
                                {s.med.toFixed(0)}
                            </text>
                            {/* Etiqueta eje X */}
                            <text x={cx} y={iH + 20} fontSize={11} fill="#475569" textAnchor="middle" fontWeight="600">{d.label}</text>
                        </g>
                    );
                })}
            </g>
        </svg>
    );
}
