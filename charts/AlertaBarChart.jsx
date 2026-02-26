// ─── Gráfica 3: Cantidad en Alerta por Módulo ──────────────────────────────
import { MOD_KEYS, MOD_SHORT, UMBRAL } from "../constants";

export default function AlertaBarChart({ students }) {
    const W = 660, H = 270, PL = 52, PR = 16, PT = 36, PB = 52;
    const iW = W - PL - PR, iH = H - PT - PB;

    const data = MOD_KEYS.map(k => {
        const vals = students.map(e => e.modulos[k]).filter(v => v != null && !isNaN(v));
        const alert = vals.filter(v => v < UMBRAL).length;
        const pct = vals.length ? (alert / vals.length) * 100 : 0;
        return { key: k, label: MOD_SHORT[k], alert, total: vals.length, pct };
    });

    const maxA = Math.max(...data.map(d => d.total), 1);
    const yS = v => iH - (v / (maxA * 1.12)) * iH;
    const slotW = iW / data.length;
    const barW = slotW * 0.56;

    const colAlert = pct => pct >= 50 ? "#dc2626" : pct >= 30 ? "#f97316" : "#f59e0b";

    const yTicks = [];
    const step = Math.max(1, Math.ceil(maxA / 5));
    for (let v = 0; v <= maxA + step; v += step) yTicks.push(v);

    return (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", fontFamily: "inherit" }}>
            <g transform={`translate(${PL},${PT})`}>
                {yTicks.map(v => (
                    <g key={v}>
                        <line x1={0} y1={yS(v)} x2={iW} y2={yS(v)} stroke="#f1f5f9" strokeWidth={1} />
                        <text x={-6} y={yS(v) + 4} fontSize={10} fill="#94a3b8" textAnchor="end">{v}</text>
                    </g>
                ))}
                <line x1={0} y1={iH} x2={iW} y2={iH} stroke="#e2e8f0" />
                <line x1={0} y1={0} x2={0} y2={iH} stroke="#e2e8f0" />

                {data.map((d, i) => {
                    const cx = slotW * i + slotW / 2;
                    const bx = cx - barW / 2;
                    const byT = yS(d.total);
                    const byA = yS(d.alert);
                    const col = colAlert(d.pct);
                    return (
                        <g key={d.key}>
                            {/* Barra total (fondo) */}
                            <rect x={bx} y={byT} width={barW} height={Math.max(iH - byT, 1)} fill="#f1f5f9" rx={4} />
                            {/* Barra alerta */}
                            <rect x={bx} y={byA} width={barW} height={Math.max(iH - byA, 2)} fill={col} rx={4} opacity={0.9} />
                            {/* Número absoluto */}
                            <text x={cx} y={byA - 20} fontSize={14} fill={col} textAnchor="middle" fontWeight="800">{d.alert}</text>
                            {/* Porcentaje */}
                            <text x={cx} y={byA - 7} fontSize={10} fill={col} textAnchor="middle" fontWeight="600">{d.pct.toFixed(1)}%</text>
                            {/* Total (encima de barra total) */}
                            <text x={cx} y={byT - 5} fontSize={9} fill="#94a3b8" textAnchor="middle">/{d.total}</text>
                            <text x={cx} y={iH + 20} fontSize={11} fill="#475569" textAnchor="middle" fontWeight="600">{d.label}</text>
                        </g>
                    );
                })}
            </g>
        </svg>
    );
}
