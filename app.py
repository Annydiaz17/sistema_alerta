# -*- coding: utf-8 -*-
"""
Sistema de Alerta Temprana - Diagnostico Saber Pro / TYT
Dashboard interactivo con Streamlit + Plotly
"""
import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from io import BytesIO
import re as regex_module

# ---- CONFIG ----
st.set_page_config(page_title="Saber Pro - Alerta Temprana", page_icon="📊",
                   layout="wide", initial_sidebar_state="expanded")

UMBRAL = 120
UMBRAL_TOTAL = 130

MODULOS = {
    "razona":    "Razonamiento Cuantitativo",
    "lectura":   "Lectura Critica",
    "competen":  "Competencias Ciudadanas",
    "ingles":    "Ingles",
    "escritura": "Comunicacion Escrita",
}

MOD_COLORS = {
    "Razonamiento Cuantitativo": "#8b5cf6",
    "Lectura Critica":           "#3b82f6",
    "Competencias Ciudadanas":   "#f59e0b",
    "Ingles":                    "#10b981",
    "Comunicacion Escrita":      "#f43f5e",
}

def hex_to_rgba(hx, op=0.2):
    hx = hx.lstrip('#')
    return f"rgba({int(hx[0:2],16)},{int(hx[2:4],16)},{int(hx[4:6],16)},{op})"


# ---- CSS ----
st.markdown("""<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
html, body, [class*="st-"] { font-family: 'Inter', sans-serif; }
.main-header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%);
    padding: 1.5rem 2rem; border-radius: 12px; margin-bottom: 1.5rem; color: white; }
.main-header h1 { margin:0; font-size:1.6rem; font-weight:800; }
.main-header p { margin:0.3rem 0 0; opacity:0.7; font-size:0.85rem; }
.alert-card { background: #fff8f8; border: 1px solid #fecaca; border-left: 4px solid #e63946;
    border-radius: 8px; padding: 0.8rem 1rem; margin-bottom: 0.5rem; }
.alert-card .name { font-weight: 700; color: #1e293b; }
.alert-card .meta { font-size: 0.75rem; color: #64748b; }
.alert-card .score { background: #e63946; color: #fff; border-radius: 6px; padding: 2px 10px; font-weight: 800; float: right; }
.alert-card .reason { font-size: 0.7rem; color: #b91c1c; margin-top: 0.3rem; }
div[data-testid="stMetric"] { background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0.8rem; }
</style>""", unsafe_allow_html=True)


# ==============================================================================
# DATA FUNCTIONS
# ==============================================================================

def detectar_columnas(df):
    import unicodedata
    cols = df.columns.tolist()
    def norm(k):
        k = unicodedata.normalize("NFD", k.lower())
        return "".join(c for c in k if c.isalnum() and not unicodedata.combining(c))
    def find(*terms):
        for c in cols:
            n = norm(c)
            if any(t in n for t in terms):
                return c
        return None
    mapping = {
        "nombre":   find("nombre", "estudiante", "alumno", "name"),
        "codigo":   find("codigo", "code", "identificacion", "documento", "cedula"),
        "programa": find("programa", "carrera", "facultad", "program"),
        "jornada":  find("jornada", "turno"),
        "puntaje_total": find("puntaje", "total", "score", "global"),
    }
    puntajes = {}
    puntajes["razona"]   = find("razona", "cuantitat", "quant")
    puntajes["lectura"]  = find("lectura", "lect", "reading")
    puntajes["competen"] = find("competen", "ciudadan", "civic")
    puntajes["ingles"]   = find("ingles", "english", "idioma")
    puntajes["escritura"]= find("escritura", "escrit", "writing", "comunicacion")
    mapping["puntajes"] = {k: v for k, v in puntajes.items() if v}
    niveles = {}
    for key in MODULOS:
        mod_norm = norm(MODULOS[key])
        for c in cols:
            n = norm(c)
            if "nivel" in n and "desempen" in n and any(p in n for p in mod_norm.split()[:2]):
                niveles[key] = c
                break
    mapping["niveles"] = niveles
    return mapping


def limpiar_datos(df, col_map):
    total_cleaned = 0
    for key, col in col_map.get("puntajes", {}).items():
        if col and col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
            nans = int(df[col].isna().sum())
            if nans > 0:
                df[col] = df[col].fillna(df[col].median())
                total_cleaned += nans
    col_t = col_map.get("puntaje_total")
    if col_t and col_t in df.columns:
        df[col_t] = pd.to_numeric(df[col_t], errors="coerce")
        nans = int(df[col_t].isna().sum())
        if nans > 0:
            df[col_t] = df[col_t].fillna(df[col_t].median())
            total_cleaned += nans
    col_p = col_map.get("programa")
    if col_p and col_p in df.columns:
        df[col_p] = df[col_p].astype(str).str.strip()
    return df, total_cleaned


def procesar_estudiantes(df, col_map):
    records = []
    pcols = col_map.get("puntajes", {})
    ncols = col_map.get("niveles", {})
    for idx, row in df.iterrows():
        mods = {}
        nivs = {}
        for k, c in pcols.items():
            if c:
                v = pd.to_numeric(row.get(c), errors="coerce")
                mods[k] = round(float(v), 1) if pd.notna(v) else None
        for k, c in ncols.items():
            if c:
                m = regex_module.search(r"(\d)", str(row.get(c, "")))
                nivs[k] = int(m.group(1)) if m else None
        ct = col_map.get("puntaje_total")
        pg = pd.to_numeric(row.get(ct), errors="coerce") if ct else None
        if pg is None or pd.isna(pg):
            vv = [v for v in mods.values() if v is not None]
            pg = sum(vv)/len(vv) if vv else None
        if pg is None or (isinstance(pg, float) and np.isnan(pg)):
            continue
        pg = round(float(pg), 1)
        razones = []
        if pg < UMBRAL:         razones.append(f"Puntaje < {UMBRAL}")
        elif pg < UMBRAL_TOTAL: razones.append(f"Total < {UMBRAL_TOTAL}")
        if nivs.get("lectura") == 1: razones.append("Nivel 1 Lectura")
        if nivs.get("razona") == 1:  razones.append("Nivel 1 Razon.")
        nc = col_map.get("nombre"); cc = col_map.get("codigo")
        pc = col_map.get("programa"); jc = col_map.get("jornada")
        records.append({
            "nombre": str(row.get(nc, f"Est. {idx+1}")) if nc else f"Est. {idx+1}",
            "codigo": str(row.get(cc, "-")) if cc else "-",
            "programa": str(row.get(pc, "Sin prog.")) if pc else "Sin prog.",
            "jornada": str(row.get(jc, "-")) if jc else "-",
            "puntaje_global": pg, "en_riesgo": len(razones) > 0,
            "razones": "; ".join(razones),
            **{f"mod_{k}": v for k, v in mods.items()},
            **{f"niv_{k}": v for k, v in nivs.items()},
        })
    return pd.DataFrame(records)


def generar_demo():
    np.random.seed(42)
    progs = ["Tec. Sistemas", "Tec. Administracion", "Tec. Contaduria", "Tec. Gestion Emp.", "Tec. Seguridad"]
    nombres = ["Ana Torres","Luis Perez","Sofia Ruiz","Carlos Gomez","Maria Lopez",
        "Diego Martinez","Laura Castro","Andres Silva","Camila Vargas","Juan Morales",
        "Valentina Rios","Felipe Herrera","Natalia Cruz","Santiago Jimenez","Paula Diaz",
        "Roberto Reyes","Isabella Sanchez","Mateo Flores","Daniela Romero","Nicolas Vega",
        "Lucia Mendoza","Sebastian Ortiz","Mariana Parra","Tomas Navarro","Andrea Suarez",
        "Julian Guerrero","Simona Delgado","Oscar Medina","Catalina Aguilar","Emilio Ramos",
        "Camilo Mora","Valeria Rios","Fernando Gil","Paola Correa","Alejandro Duarte"]
    def niv(p):
        if isinstance(p, str): return "IA"
        return "Nivel 1" if p<120 else "Nivel 2" if p<155 else "Nivel 3" if p<190 else "Nivel 4"
    rows = []
    for i, n in enumerate(nombres):
        rc=int(82+np.random.rand()*78); lc="IA" if i%8==3 else int(88+np.random.rand()*72)
        cc=int(92+np.random.rand()*58); ig=int(75+np.random.rand()*85)
        ce="IA" if i%12==7 else int(85+np.random.rand()*65)
        nums=[v for v in[rc,lc,cc,ig,ce] if isinstance(v,int)]
        rows.append({"Nombre":n, "Programa:":progs[i%5],
            "Razonamiento Cuantitativo Puntaje":rc, "Nivel de desempeno Razonamiento Cuantitativo":niv(rc),
            "Lectura Critica Puntaje":lc, "Nivel de desempeno Lectura Critica":niv(lc),
            "Competencias Ciudadanas Puntaje":cc, "Nivel de desempeno Competencias Ciudadanas":niv(cc),
            "Ingles Puntaje":ig, "Nivel de desempeno Ingles":niv(ig),
            "Comunicacion Escrita Puntaje":ce, "Nivel de desempeno Comunicacion Escrita":niv(ce),
            "Puntaje total":int(sum(nums)/len(nums))})
    return pd.DataFrame(rows)


def exportar_excel(df_est, programas):
    out = BytesIO()
    with pd.ExcelWriter(out, engine="xlsxwriter") as w:
        risk = df_est[df_est["en_riesgo"]].sort_values("puntaje_global")
        risk.to_excel(w, sheet_name="Alertas", index=False)
        for p in programas:
            r = risk[risk["programa"]==p]
            if len(r)>0: r.to_excel(w, sheet_name=p[:31].replace("/","_"), index=False)
    return out.getvalue()


# ==============================================================================
# CHARTS
# ==============================================================================

def chart_boxplot(df_est):
    fig = go.Figure()
    for k, lab in MODULOS.items():
        c = f"mod_{k}"
        if c in df_est.columns:
            fig.add_trace(go.Box(y=df_est[c].dropna(), name=lab.split()[0], boxmean=True,
                marker_color=MOD_COLORS.get(lab,"#6366f1"), line_color=MOD_COLORS.get(lab,"#6366f1"),
                fillcolor=hex_to_rgba(MOD_COLORS.get(lab,"#6366f1"))))
    fig.add_hline(y=UMBRAL, line_dash="dash", line_color="#e63946", line_width=2,
                  annotation_text=f"Umbral {UMBRAL}", annotation_font_color="#e63946")
    fig.update_layout(title="Boxplot por Modulo", yaxis_title="Puntaje", showlegend=False,
                      height=400, template="plotly_white", margin=dict(l=40,r=20,t=50,b=40))
    return fig

def chart_promedio(df_est):
    data = []
    for k, lab in MODULOS.items():
        c = f"mod_{k}"
        if c in df_est.columns:
            avg = df_est[c].dropna().mean()
            data.append({"M": lab.split()[0], "P": avg,
                         "c": "#fca5a5" if avg < UMBRAL else MOD_COLORS.get(lab,"#6366f1")})
    if not data: return go.Figure()
    d = pd.DataFrame(data)
    fig = go.Figure(go.Bar(x=d["M"], y=d["P"], marker_color=d["c"],
                           text=d["P"].round(1), textposition="outside"))
    fig.add_hline(y=UMBRAL, line_dash="dash", line_color="#e63946", line_width=2)
    fig.update_layout(title="Promedio por Modulo", yaxis_title="Promedio",
                      height=380, template="plotly_white", margin=dict(l=40,r=20,t=50,b=40))
    return fig

def chart_alertas(df_est):
    data = []
    for k, lab in MODULOS.items():
        c = f"mod_{k}"
        if c in df_est.columns:
            v = df_est[c].dropna(); a=int((v<UMBRAL).sum()); t=len(v)
            data.append({"M":lab.split()[0], "A":a, "T":t, "P":round(a/t*100,1) if t else 0})
    if not data: return go.Figure()
    d = pd.DataFrame(data)
    fig = go.Figure()
    fig.add_trace(go.Bar(x=d["M"], y=d["T"], name="Total", marker_color="#e2e8f0", opacity=0.6))
    fig.add_trace(go.Bar(x=d["M"], y=d["A"], name="Alerta", marker_color="#e63946",
                         text=[f'{a} ({p}%)' for a,p in zip(d["A"],d["P"])], textposition="outside"))
    fig.update_layout(title="En Alerta por Modulo", barmode="overlay", height=380,
                      template="plotly_white", margin=dict(l=40,r=20,t=50,b=40))
    return fig

def chart_histograma(df_est):
    v = df_est["puntaje_global"].dropna()
    fig = go.Figure()
    fig.add_trace(go.Histogram(x=v[v<UMBRAL], nbinsx=10, name="Riesgo", marker_color="#fca5a5"))
    fig.add_trace(go.Histogram(x=v[v>=UMBRAL], nbinsx=10, name="OK", marker_color="#93c5fd"))
    fig.add_vline(x=UMBRAL, line_dash="dash", line_color="#e63946", line_width=2)
    fig.update_layout(title="Distribucion de Puntajes", barmode="stack", height=380,
                      template="plotly_white", margin=dict(l=40,r=20,t=50,b=40))
    return fig

def chart_programa(df_est, prog):
    d = df_est if prog=="Todos" else df_est[df_est["programa"]==prog]
    fig = go.Figure()
    for k, lab in MODULOS.items():
        c = f"mod_{k}"
        if c in d.columns:
            col = MOD_COLORS.get(lab,"#6366f1")
            fig.add_trace(go.Box(y=d[c].dropna(), name=lab.split()[0], boxmean=True,
                marker_color=col, line_color=col, fillcolor=hex_to_rgba(col),
                boxpoints="all", jitter=0.4, pointpos=0, marker_size=4, marker_opacity=0.5))
    fig.add_hline(y=UMBRAL, line_dash="dash", line_color="#e63946", line_width=2)
    t = prog.upper() if prog!="Todos" else "TODOS"
    fig.update_layout(title=f"Detalle: {t}", yaxis_title="Puntaje", showlegend=False,
                      height=430, template="plotly_white", margin=dict(l=40,r=20,t=50,b=40))
    return fig


# ==============================================================================
# MAIN APP
# ==============================================================================

def load_data(source):
    """Load and process data, store in session_state."""
    if source == "demo":
        df_raw = generar_demo()
    else:
        try:
            if source.name.endswith(".csv"):
                df_raw = pd.read_csv(source, sep=",", on_bad_lines="skip", encoding="utf-8-sig")
                if len(df_raw.columns) < 3:
                    source.seek(0)
                    df_raw = pd.read_csv(source, sep=";", on_bad_lines="skip", encoding="utf-8-sig")
            else:
                df_raw = pd.read_excel(source, engine="openpyxl")
        except Exception as e:
            st.error(f"Error: {e}")
            return
    col_map = detectar_columnas(df_raw)
    df_raw, cleaned = limpiar_datos(df_raw, col_map)
    df_est = procesar_estudiantes(df_raw, col_map)
    st.session_state["data"] = df_est
    st.session_state["cleaned"] = cleaned
    st.session_state["loaded"] = True


def main():
    # -- Init session --
    if "loaded" not in st.session_state:
        st.session_state["loaded"] = False
        st.session_state["data"] = None
        st.session_state["cleaned"] = 0

    # -- Sidebar --
    with st.sidebar:
        st.markdown("### 📊 Saber Pro")
        st.markdown("**Alerta Temprana**")
        st.markdown("---")
        uploaded = st.file_uploader("Subir Excel / CSV", type=["xlsx","xls","csv"], key="file_up")
        if st.button("Cargar datos demo", key="btn_demo"):
            load_data("demo")
            st.rerun()
        st.markdown("---")
        st.caption(f"Umbral: {UMBRAL} | Total: {UMBRAL_TOTAL}")

    # -- Process uploaded file (only once) --
    if uploaded is not None:
        file_id = f"{uploaded.name}_{uploaded.size}"
        if st.session_state.get("last_file") != file_id:
            load_data(uploaded)
            st.session_state["last_file"] = file_id
            st.rerun()

    df_est = st.session_state.get("data")

    # -- Welcome screen --
    if df_est is None or len(df_est) == 0:
        st.markdown("""<div style="text-align:center;padding:5rem 2rem;">
            <h1 style="color:#1e3a5f;">📊 Diagnostico Saber Pro</h1>
            <p style="color:#64748b;">Sube un Excel en la barra lateral o haz clic en "Cargar datos demo".</p>
        </div>""", unsafe_allow_html=True)
        return

    # -- Derived data --
    en_riesgo = df_est[df_est["en_riesgo"]]
    aprobados = df_est[~df_est["en_riesgo"]]
    programas = sorted(df_est["programa"].unique())
    prom_g = df_est["puntaje_global"].mean()
    cleaned = st.session_state.get("cleaned", 0)

    # -- Header --
    clean_html = f' | 🧹 {cleaned} limpiados' if cleaned > 0 else ''
    st.markdown(f"""<div class="main-header">
        <h1>📊 Saber Pro - Diagnostico Temprano</h1>
        <p>{len(df_est)} estudiantes | umbral {UMBRAL} | {len(programas)} programas{clean_html}</p>
    </div>""", unsafe_allow_html=True)

    # -- KPIs --
    k1,k2,k3,k4,k5 = st.columns(5)
    k1.metric("Total", len(df_est))
    k2.metric("En riesgo", len(en_riesgo), delta=f"{len(en_riesgo)/len(df_est)*100:.1f}%", delta_color="inverse")
    k3.metric("Aprobados", len(aprobados))
    k4.metric("Promedio", f"{prom_g:.1f}")
    k5.metric("Programas", len(programas))

    # -- TABS --
    t1, t2, t3, t4 = st.tabs(["Graficas","Por Programa","Tabla",f"Alertas ({len(en_riesgo)})"])

    with t1:
        c1,c2 = st.columns(2)
        c1.plotly_chart(chart_boxplot(df_est), use_container_width=True)
        c2.plotly_chart(chart_promedio(df_est), use_container_width=True)
        c3,c4 = st.columns(2)
        c3.plotly_chart(chart_alertas(df_est), use_container_width=True)
        c4.plotly_chart(chart_histograma(df_est), use_container_width=True)
        # Summary table
        resumen = []
        for k, lab in MODULOS.items():
            c = f"mod_{k}"
            if c in df_est.columns:
                v=df_est[c].dropna(); a=int((v<UMBRAL).sum())
                resumen.append({"Modulo":lab,"N":len(v),"Media":round(v.mean(),1),
                    "Mediana":round(v.median(),1),"Alerta":a,
                    "%":f"{a/len(v)*100:.1f}%" if len(v)>0 else "0%"})
        st.dataframe(pd.DataFrame(resumen), hide_index=True)

    with t2:
        sp = st.selectbox("Programa:", ["Todos"]+programas, key="prog_sel")
        filt = df_est if sp=="Todos" else df_est[df_est["programa"]==sp]
        r1,r2,r3 = st.columns(3)
        r1.metric("Estudiantes", len(filt))
        r2.metric("En riesgo", int(filt["en_riesgo"].sum()))
        n1c = sum(1 for _,r in filt.iterrows() if any(r.get(f"niv_{k}")==1 for k in MODULOS))
        r3.metric("Nivel 1", n1c)
        st.plotly_chart(chart_programa(df_est, sp), use_container_width=True)
        stats = []
        for k, lab in MODULOS.items():
            c=f"mod_{k}"; nc=f"niv_{k}"
            if c in filt.columns:
                v=filt[c].dropna(); a=int((v<UMBRAL).sum())
                n1=int((filt[nc]==1).sum()) if nc in filt.columns else 0
                n2=int((filt[nc]==2).sum()) if nc in filt.columns else 0
                stats.append({"Modulo":lab,"N":len(v),"Media":round(v.mean(),1),
                    "Alerta":a,"N1":n1,"N2":n2})
        if stats: st.dataframe(pd.DataFrame(stats), hide_index=True)

    with t3:
        tc1,tc2,tc3 = st.columns([2,1,1])
        buscar = tc1.text_input("Buscar", "", key="search_t")
        fr = tc2.selectbox("Estado:", ["Todos","Riesgo","OK"], key="filtro_r")
        fp = tc3.selectbox("Programa:", ["Todos"]+programas, key="filtro_p")
        disp = df_est.copy()
        if buscar:
            q=buscar.lower()
            disp=disp[disp["nombre"].str.lower().str.contains(q,na=False)|disp["codigo"].str.lower().str.contains(q,na=False)]
        if fr=="Riesgo": disp=disp[disp["en_riesgo"]]
        elif fr=="OK": disp=disp[~disp["en_riesgo"]]
        if fp!="Todos": disp=disp[disp["programa"]==fp]
        st.caption(f"{len(disp)} resultados")
        rename={"nombre":"Nombre","codigo":"Codigo","programa":"Programa","puntaje_global":"Puntaje","en_riesgo":"Riesgo","razones":"Razon"}
        for k,v in MODULOS.items(): rename[f"mod_{k}"]=v.split()[0]
        cols=[c for c in ["nombre","codigo","programa","puntaje_global"]+[f"mod_{k}" for k in MODULOS]+["en_riesgo","razones"] if c in disp.columns]
        st.dataframe(disp[cols].rename(columns=rename), hide_index=True, height=500)

    with t4:
        a1,a2 = st.columns([3,1])
        a1.markdown(f"### {len(en_riesgo)} estudiantes en riesgo")
        a1.caption(f"Puntaje < {UMBRAL} | Total < {UMBRAL_TOTAL} | Nivel 1")
        excel = exportar_excel(df_est, programas)
        a2.download_button("Exportar Excel", data=excel, file_name="alertas.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", type="primary")

        if len(en_riesgo) > 0:
            pcounts = en_riesgo.groupby("programa").size().sort_values(ascending=False)
            cols_p = st.columns(min(len(pcounts), 5))
            for i,(p,cnt) in enumerate(pcounts.items()):
                tp = len(df_est[df_est["programa"]==p])
                cols_p[i%len(cols_p)].metric(p[:20], f"{cnt}/{tp}")
            st.markdown("---")
            for _, e in en_riesgo.sort_values("puntaje_global").iterrows():
                crits = [f"{MODULOS[k].split()[0]} ({e.get(f'mod_{k}',0):.0f})" for k in MODULOS if e.get(f"mod_{k}") is not None and e.get(f"mod_{k}") < UMBRAL]
                st.markdown(f"""<div class="alert-card">
                    <span class="score">{e['puntaje_global']:.1f}</span>
                    <div class="name">{e['nombre']}</div>
                    <div class="meta">{e['codigo']} | {e['programa']}</div>
                    <div class="reason">{e['razones']}</div>
                    {"<div style='font-size:0.7rem;color:#991b1b;margin-top:3px;'>"+", ".join(crits)+"</div>" if crits else ""}
                </div>""", unsafe_allow_html=True)
        else:
            st.success("Ningun estudiante en riesgo.")


if __name__ == "__main__":
    main()
