// ─── Detección de columnas, limpieza y procesamiento de datos ────────────────
// Réplica de la lógica de c_diagnostico.py: limpia "IA", rellena con mediana,
// detecta niveles de desempeño, y marca alertas multicriteria.
import { MOD_KEYS, UMBRAL, UMBRAL_TOTAL } from "../constants";

// ── Detección automática de columnas ──────────────────────────────────────────
export function detectColumns(rows) {
    if (!rows.length) return {};
    const keys = Object.keys(rows[0]);
    const norm = k => k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    const find = (...terms) => keys.find(k => terms.some(t => norm(k).includes(t))) || null;

    // Columnas de puntaje
    const cols = {
        nombre: find("nombre", "estudiante", "alumno", "name"),
        codigo: find("codigo", "code", "identificacion", "documento", "cedula"),
        programa: find("programa", "carrera", "facultad", "program"),
        jornada: find("jornada", "turno", "horario"),
        lectura: find("lectura", "lect", "reading"),
        razona: find("razona", "matematica", "cuantitat", "quant", "mate"),
        competen: find("competen", "ciudadan", "civic"),
        ingles: find("ingles", "english", "idioma", "foreign"),
        escritura: find("escritura", "escrit", "writing", "redacc", "comunicacion"),
        puntaje: find("puntaje", "total", "score", "global", "promedio"),
    };

    // Columnas de nivel de desempeño (ej: "Nivel de desempeño Lectura Crítica")
    const niveles = {};
    MOD_KEYS.forEach(k => {
        const colName = keys.find(key => {
            const n = norm(key);
            return n.includes("nivel") && n.includes("desempen") && (
                (k === "lectura" && (n.includes("lectura") || n.includes("lect"))) ||
                (k === "razona" && (n.includes("razona") || n.includes("cuantitat"))) ||
                (k === "competen" && (n.includes("competen") || n.includes("ciudadan"))) ||
                (k === "ingles" && (n.includes("ingles") || n.includes("english"))) ||
                (k === "escritura" && (n.includes("escritura") || n.includes("escrit") || n.includes("comunicacion")))
            );
        });
        if (colName) niveles[k] = colName;
    });
    cols.niveles = niveles;

    return cols;
}

// ── Funciones de limpieza (equivalente a Python) ─────────────────────────────

/** Calcula la mediana de un array numérico */
function median(arr) {
    const sorted = [...arr].filter(v => v != null && !isNaN(v)).sort((a, b) => a - b);
    if (!sorted.length) return 0;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
}

/** Parsea un valor numérico. Convierte "IA", "-", texto → NaN */
function parseNumeric(val) {
    if (val == null || val === "") return NaN;
    const s = String(val).trim();
    // Valores conocidos de inasistencia o inválidos
    if (/^(ia|n\/a|na|nd|—|-|\.|\*|#)$/i.test(s)) return NaN;
    const n = parseFloat(s.replace(",", "."));
    return isFinite(n) ? n : NaN;
}

/** Parsea un nivel de desempeño como "Nivel 1", "1", etc → número 1..4 o null */
function parseNivel(val) {
    if (val == null || val === "") return null;
    const s = String(val).trim();
    const m = s.match(/(\d)/);
    if (m) {
        const n = parseInt(m[1]);
        return n >= 1 && n <= 4 ? n : null;
    }
    return null;
}

/**
 * Limpia los datos crudos del Excel:
 *  1. Convierte puntajes a numérico (maneja "IA", texto, etc.)
 *  2. Calcula mediana por columna de puntaje
 *  3. Rellena NaN con la mediana de su columna
 * Retorna { cleanedRows, cleanStats }
 */
export function cleanData(raw, cols) {
    const puntajeCols = MOD_KEYS.filter(k => cols[k]).map(k => cols[k]);
    if (cols.puntaje) puntajeCols.push(cols.puntaje);

    let totalCleaned = 0;
    const cleanedPerCol = {};

    // Paso 1: Parsear todos los valores numéricos
    const parsed = raw.map(row => {
        const newRow = { ...row };
        puntajeCols.forEach(col => {
            const original = row[col];
            const num = parseNumeric(original);
            newRow[col] = num;
        });
        return newRow;
    });

    // Paso 2: Calcular mediana por columna y rellenar NaN
    puntajeCols.forEach(col => {
        const vals = parsed.map(r => r[col]).filter(v => !isNaN(v));
        const med = median(vals);
        let count = 0;
        parsed.forEach(r => {
            if (isNaN(r[col])) {
                r[col] = med;
                count++;
            }
        });
        if (count > 0) {
            cleanedPerCol[col] = { replaced: count, median: med };
            totalCleaned += count;
        }
    });

    // Paso 3: Limpiar nombre de programa
    if (cols.programa) {
        parsed.forEach(r => {
            if (r[cols.programa]) {
                r[cols.programa] = String(r[cols.programa]).trim();
            }
        });
    }

    return {
        cleanedRows: parsed,
        cleanStats: {
            totalCleaned,
            perColumn: cleanedPerCol,
            totalRows: raw.length,
        },
    };
}

// ── Promedio calculado ────────────────────────────────────────────────────────
export function calcPromedio(row, cols) {
    const vals = MOD_KEYS.map(k => cols[k] ? parseFloat(row[cols[k]]) : NaN).filter(v => !isNaN(v) && v > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

// ── Procesamiento principal ──────────────────────────────────────────────────
export function processData(raw, cols) {
    // 1. Limpieza de datos (como Python)
    const { cleanedRows, cleanStats } = cleanData(raw, cols);

    // 2. Transformar a objetos de estudiante
    const students = cleanedRows.map((row, i) => {
        const modulos = {};
        MOD_KEYS.forEach(k => {
            if (cols[k]) modulos[k] = parseFloat(row[cols[k]]) || null;
        });

        // Niveles de desempeño
        const niveles = {};
        if (cols.niveles) {
            MOD_KEYS.forEach(k => {
                if (cols.niveles[k]) {
                    niveles[k] = parseNivel(row[cols.niveles[k]]);
                }
            });
        }

        let pg = cols.puntaje ? parseFloat(row[cols.puntaje]) : null;
        if (!pg || isNaN(pg)) pg = calcPromedio(row, cols);

        // Determinar si está en riesgo (multicriteria como Python):
        //  - Puntaje global < UMBRAL (120)
        //  - O Puntaje total < UMBRAL_TOTAL (130)
        //  - O Nivel 1 en Lectura Crítica o Razonamiento Cuantitativo
        const riesgoPuntaje = pg !== null && pg < UMBRAL;
        const riesgoTotal = pg !== null && pg < UMBRAL_TOTAL;
        const riesgoNivel = (niveles.lectura === 1) || (niveles.razona === 1);

        // Razones de alerta
        const razones = [];
        if (riesgoPuntaje) razones.push(`Puntaje < ${UMBRAL}`);
        else if (riesgoTotal) razones.push(`Puntaje total < ${UMBRAL_TOTAL}`);
        if (niveles.lectura === 1) razones.push("Nivel 1 Lectura Crítica");
        if (niveles.razona === 1) razones.push("Nivel 1 Razon. Cuantitativo");

        return {
            id: i,
            nombre: cols.nombre ? String(row[cols.nombre]) : `Estudiante ${i + 1}`,
            codigo: cols.codigo ? String(row[cols.codigo]) : "—",
            programa: cols.programa ? String(row[cols.programa]) : "Sin programa",
            jornada: cols.jornada ? String(row[cols.jornada]) : "—",
            modulos,
            niveles,
            puntajeGlobal: pg,
            enRiesgo: riesgoPuntaje || riesgoNivel || riesgoTotal,
            razones,
        };
    }).filter(e => e.puntajeGlobal !== null);

    return { students, cleanStats };
}
