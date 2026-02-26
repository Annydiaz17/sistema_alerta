// ─── Gráfica 4: Histograma de Distribución General ──────────────────────────
import { UMBRAL } from "../constants";

export default function HistogramaChart({ students }) {
    const W = 660, H = 270, PL = 52, PR = 16, PT = 30, PB = 52;
    const iW = W - PL - PR, iH = H - PT - PB;

    const vals = students.map(e => e.puntajeGlobal).filter(v => v != null);
    if (!vals.length) return null;

    const BINS = 14;
    const minV = Math.floor(Math.min(...vals) / 5) * 5;
    const maxV = Math.ceil(Math.max(...vals) / 5) * 5;
    const binSize = (maxV - minV) / BINS;

    const buckets = Array.from({ length: BINS }, (_, i) => ({
        lo: minV + i * binSize, hi: minV + (i + 1) * binSize, count: 0,
    }));
    vals.forEach(v => {
        const idx = Math.min(Math.floor((v - minV) / binSize), BINS - 1);
        if (idx >= 0) buckets[idx].count++;
    });

    const maxC = Math.max(...buckets.map(b => b.count), 1);
    const yS = v => iH - (v / (maxC * 1.12)) * iH;
    const barW = iW / BINS;
    const xS = v => ((v - minV) / (maxV - minV)) * iW;
    const xUmb = xS(UMBRAL);

    const yTicks = [0, Math.round(maxC * .25), Math.round(maxC * .5), Math.round(maxC * .75), maxC];

    return (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", fontFamily: "inherit" }}>
            <g transform={`translate(${PL},${PT})`}>
                {/* Zona riesgo */}
                {xUmb > 0 && (
                    <rect x={0} y={0} width={Math.min(xUmb, iW)} height={iH} fill="#fef2f2" opacity={0.7} />
                )}

                {/* Rejilla */}
                {yTicks.map(v => (
                    <g key={v}>
                        <line x1={0} y1={yS(v)} x2={iW} y2={yS(v)} stroke="#f1f5f9" strokeWidth={1} />
                        <text x={-6} y={yS(v) + 4} fontSize={10} fill="#94a3b8" textAnchor="end">{v}</text>
                    </g>
                ))}
                <line x1={0} y1={iH} x2={iW} y2={iH} stroke="#e2e8f0" />
                <line x1={0} y1={0} x2={0} y2={iH} stroke="#e2e8f0" />

                {/* Línea umbral */}
                <line x1={xUmb} y1={0} x2={xUmb} y2={iH} stroke="#e63946" strokeWidth={2} strokeDasharray="6,4" />
                <text x={xUmb + 4} y={14} fontSize={10} fill="#e63946" fontWeight="700">↑ Umbral {UMBRAL}</text>

                {/* Barras */}
                {buckets.map((b, i) => {
                    const risk = b.lo < UMBRAL;
                    const by = yS(b.count);
                    const bh = Math.max(iH - by, 1);
                    return (
                        <g key={i}>
                            <rect x={i * barW + 1} y={by} width={barW - 2} height={bh}
                                fill={risk ? "#fca5a5" : "#93c5fd"}
                                stroke={risk ? "#e63946" : "#3b82f6"}
                                strokeWidth={0.6} rx={2} opacity={0.88} />
                            {b.count > 0 && bh > 16 && (
                                <text x={i * barW + barW / 2} y={by + bh / 2 + 4} fontSize={10}
                                    fill={risk ? "#991b1b" : "#1e40af"} textAnchor="middle" fontWeight="700">{b.count}</text>
                            )}
                        </g>
                    );
                })}

                {/* Eje X: etiquetas cada 2 buckets */}
                {buckets.filter((_, i) => i % 2 === 0).map((b, i) => (
                    <text key={i} x={i * 2 * barW + barW} y={iH + 20} fontSize={10} fill="#64748b" textAnchor="middle">
                        {b.lo.toFixed(0)}
                    </text>
                ))}
            </g>
        </svg>
    );
}
