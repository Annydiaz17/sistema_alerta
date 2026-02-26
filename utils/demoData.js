// ─── Generador de datos de demostración (realista con IA y niveles) ──────────

export function generateDemo() {
    const progs = [
        "Tec. en Sistemas", "Tec. en Administración", "Tec. en Contaduría",
        "Tec. en Gestión Empresarial", "Tec. en Seguridad Ocupacional",
    ];
    const jornadas = ["Diurna", "Nocturna", "Sabatina"];
    const nombres = [
        "Ana Torres", "Luis Pérez", "Sofía Ruiz", "Carlos Gómez", "María López",
        "Diego Martínez", "Laura Castro", "Andrés Silva", "Camila Vargas", "Juan Morales",
        "Valentina Ríos", "Felipe Herrera", "Natalia Cruz", "Santiago Jiménez", "Paula Díaz",
        "Roberto Reyes", "Isabella Sánchez", "Mateo Flores", "Daniela Romero", "Nicolás Vega",
        "Lucía Mendoza", "Sebastián Ortiz", "Mariana Parra", "Tomás Navarro", "Andrea Suárez",
        "Julián Guerrero", "Simona Delgado", "Óscar Medina", "Catalina Aguilar", "Emilio Ramos",
        "Camilo Mora", "Valeria Ríos", "Fernando Gil", "Paola Correa", "Alejandro Duarte",
    ];

    // Función para asignar nivel de desempeño según puntaje
    const nivel = (p) => {
        if (typeof p === "string") return "IA"; // si es inasistencia
        if (p < 120) return "Nivel 1";
        if (p < 155) return "Nivel 2";
        if (p < 190) return "Nivel 3";
        return "Nivel 4";
    };

    return nombres.map((nombre, i) => {
        // Algunos estudiantes tendrán "IA" (inasistencia) en algún módulo
        const hasIA = i % 8 === 3;

        const rc = Math.round(82 + Math.random() * 78);
        const lc = hasIA ? "IA" : Math.round(88 + Math.random() * 72);
        const cc = Math.round(92 + Math.random() * 58);
        const ig = Math.round(75 + Math.random() * 85);
        const ce = i % 12 === 7 ? "IA" : Math.round(85 + Math.random() * 65);

        // Puntaje total (calculado sin los IA)
        const puntajes = [rc, lc, cc, ig, ce].filter(v => typeof v === "number");
        const total = Math.round(puntajes.reduce((a, b) => a + b, 0) / puntajes.length);

        return {
            "Número de identificación": `10203${String(i + 1).padStart(4, "0")}`,
            Nombre: nombre,
            "Programa:": progs[i % progs.length],
            "Jornada:": jornadas[i % jornadas.length],
            "Razonamiento Cuantitativo Puntaje": rc,
            "Nivel de desempeño Razonamiento Cuantitativo": nivel(rc),
            "Lectura Crítica Puntaje": lc,
            "Nivel de desempeño Lectura Crítica": nivel(lc),
            "Competencias Ciudadanas Puntaje": cc,
            "Nivel de desempeño Competencias Ciudadanas": nivel(cc),
            "Inglés Puntaje": ig,
            "Nivel de desempeño Inglés": nivel(ig),
            "Comunicación Escrita Puntaje": ce,
            "Nivel de desempeño Comunicación Escrita": nivel(ce),
            "Puntaje total": total,
        };
    });
}
