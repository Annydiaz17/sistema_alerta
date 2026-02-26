// ─── Pantalla de carga inicial ───────────────────────────────────────────────
import { useRef } from "react";
import { C } from "../constants";

export default function UploadScreen({ onFileLoad, onDemo, loading }) {
    const fileRef = useRef();

    return (
        <div style={{ fontFamily: "'Libre Franklin',Georgia,serif", background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <link href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400;600;700;800&display=swap" rel="stylesheet" />
            <div style={{ textAlign: "center", maxWidth: 520, padding: 40 }}>
                <div style={{ width: 72, height: 72, background: C.primary, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 32 }}>📊</div>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: C.primary, margin: "0 0 8px" }}>Diagnóstico Saber Pro</h1>
                <p style={{ color: C.muted, fontSize: 14, marginBottom: 32, lineHeight: 1.7 }}>
                    Sube el Excel de resultados. El sistema clasifica estudiantes en riesgo (&lt;120), genera las 4 gráficas de análisis y permite exportar alertas.
                </p>
                <div
                    onClick={() => fileRef.current.click()}
                    style={{ border: `2px dashed ${C.border}`, borderRadius: 14, padding: "36px 24px", cursor: "pointer", marginBottom: 14, background: "#fff", transition: "border-color .2s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = C.primary}
                    onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                >
                    <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }}
                        onChange={e => e.target.files[0] && onFileLoad(e.target.files[0])} />
                    <div style={{ fontSize: 34, marginBottom: 10 }}>📂</div>
                    <div style={{ fontWeight: 700, color: C.text, marginBottom: 4 }}>Subir archivo Excel / CSV</div>
                    <div style={{ fontSize: 12, color: C.muted }}>Columnas detectadas automáticamente</div>
                    {loading && <div style={{ marginTop: 14, color: C.primary, fontWeight: 600 }}>Procesando...</div>}
                </div>
                <button onClick={onDemo} style={{ background: C.light, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 24px", fontSize: 13, color: C.muted, cursor: "pointer", fontWeight: 600 }}>
                    Ver con datos de ejemplo (30 estudiantes)
                </button>
                <div style={{ marginTop: 26, fontSize: 11, color: "#94a3b8", lineHeight: 2.1 }}>
                    Gráficas incluidas:<br />
                    Boxplot por módulo · Promedio por módulo<br />
                    Cantidad en alerta · Histograma de distribución
                </div>
            </div>
        </div>
    );
}
