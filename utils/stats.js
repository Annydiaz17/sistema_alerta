// ─── Estadísticas de boxplot ────────────────────────────────────────────────

export function boxStats(vals) {
    const s = [...vals].filter(v => v != null && !isNaN(v)).sort((a, b) => a - b);
    if (!s.length) return null;
    const q = p => {
        const i = p * (s.length - 1);
        const lo = Math.floor(i);
        return s[lo] + (s[lo + 1] !== undefined ? (i - lo) * (s[lo + 1] - s[lo]) : 0);
    };
    const q1 = q(0.25), med = q(0.5), q3 = q(0.75), iqr = q3 - q1;
    const fence_lo = q1 - 1.5 * iqr, fence_hi = q3 + 1.5 * iqr;
    const whiskerLo = s.find(v => v >= fence_lo) ?? s[0];
    const whiskerHi = [...s].reverse().find(v => v <= fence_hi) ?? s[s.length - 1];
    const outliers = s.filter(v => v < fence_lo || v > fence_hi);
    const mean = s.reduce((a, b) => a + b, 0) / s.length;
    return { min: s[0], max: s[s.length - 1], q1, med, q3, whiskerLo, whiskerHi, outliers, mean };
}
