# -*- coding: utf-8 -*-
"""
Exportador PDF — Genera un reporte PDF del diagnóstico usando ReportLab.
"""

from __future__ import annotations
import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

from backend.config import NOMBRES_COMPONENTES, ORDEN_COMPONENTES


# ──────────────────────────────────────────────────────────────────────────────
# Colores institucionales
# ──────────────────────────────────────────────────────────────────────────────
AZUL_PRIMARIO = colors.HexColor("#1e3a5f")
AZUL_CLARO = colors.HexColor("#dbeafe")
VERDE = colors.HexColor("#10b981")
AMARILLO = colors.HexColor("#f59e0b")
ROJO = colors.HexColor("#e63946")
GRIS_CLARO = colors.HexColor("#f8fafc")
GRIS_BORDE = colors.HexColor("#e2e8f0")


def _estilos():
    """Retorna el diccionario de estilos del documento."""
    base = getSampleStyleSheet()
    return {
        "titulo": ParagraphStyle(
            "titulo", parent=base["Title"], fontName="Helvetica-Bold",
            fontSize=20, textColor=AZUL_PRIMARIO, spaceAfter=6, alignment=TA_CENTER
        ),
        "subtitulo": ParagraphStyle(
            "subtitulo", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=13, textColor=AZUL_PRIMARIO, spaceAfter=4, spaceBefore=12
        ),
        "cuerpo": ParagraphStyle(
            "cuerpo", parent=base["Normal"], fontName="Helvetica",
            fontSize=10, textColor=colors.HexColor("#334155"), spaceAfter=4, leading=14
        ),
        "kpi_label": ParagraphStyle(
            "kpi_label", parent=base["Normal"], fontName="Helvetica",
            fontSize=9, textColor=colors.HexColor("#64748b"), alignment=TA_CENTER
        ),
        "kpi_valor": ParagraphStyle(
            "kpi_valor", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=18, textColor=AZUL_PRIMARIO, alignment=TA_CENTER
        ),
        "item": ParagraphStyle(
            "item", parent=base["Normal"], fontName="Helvetica",
            fontSize=10, textColor=colors.HexColor("#334155"), leftIndent=12,
            spaceAfter=3, leading=14, bulletIndent=6
        ),
        "nota": ParagraphStyle(
            "nota", parent=base["Normal"], fontName="Helvetica-Oblique",
            fontSize=9, textColor=colors.HexColor("#64748b"), spaceAfter=4
        ),
        "header_tabla": ParagraphStyle(
            "header_tabla", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=9, textColor=colors.white, alignment=TA_CENTER
        ),
        "celda_tabla": ParagraphStyle(
            "celda_tabla", parent=base["Normal"], fontName="Helvetica",
            fontSize=9, textColor=colors.HexColor("#334155"), alignment=TA_CENTER
        ),
    }


def _tabla_style_base():
    return TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), AZUL_PRIMARIO),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [GRIS_CLARO, colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, GRIS_BORDE),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
    ])


def exportar_pdf(modelo: dict, diagnostico: dict, nombre_archivo: str = "diagnostico") -> bytes:
    """
    Genera el PDF del diagnóstico completo.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2.5 * cm,
        bottomMargin=2 * cm,
        title="Diagnóstico Saber Pro",
        author="SaberAnalítica",
    )

    estilos = _estilos()
    historia = []

    meta = modelo.get("meta", {})
    diag = diagnostico
    confianza = diag.get("confianza", {})

    # ── Portada ──────────────────────────────────────────────────────────────
    historia.append(Spacer(1, 1.5 * cm))
    historia.append(Paragraph("📊 Diagnóstico Saber Pro", estilos["titulo"]))
    historia.append(Paragraph("SaberAnalítica — Informe de Resultados", estilos["nota"]))
    historia.append(Spacer(1, 0.5 * cm))
    historia.append(HRFlowable(width="100%", thickness=2, color=AZUL_PRIMARIO))
    historia.append(Spacer(1, 0.3 * cm))
    historia.append(Paragraph(
        f"Fecha de generación: {datetime.now().strftime('%d/%m/%Y %H:%M')} | "
        f"Confianza del diagnóstico: <b>{confianza.get('nivel', '-')}</b>",
        estilos["nota"]
    ))
    historia.append(Spacer(1, 1 * cm))

    # ── KPIs principales ─────────────────────────────────────────────────────
    historia.append(Paragraph("Resumen Ejecutivo", estilos["subtitulo"]))
    kpi_data = [
        [
            Paragraph(str(meta.get("total_estudiantes", 0)), estilos["kpi_valor"]),
            Paragraph(str(len(meta.get("programas", []))), estilos["kpi_valor"]),
            Paragraph(str(len(meta.get("jornadas", []))), estilos["kpi_valor"]),
            Paragraph(confianza.get("nivel", "-"), estilos["kpi_valor"]),
        ],
        [
            Paragraph("Estudiantes", estilos["kpi_label"]),
            Paragraph("Programas", estilos["kpi_label"]),
            Paragraph("Jornadas", estilos["kpi_label"]),
            Paragraph("Confianza", estilos["kpi_label"]),
        ],
    ]
    t_kpi = Table(kpi_data, colWidths=[4 * cm, 4 * cm, 4 * cm, 4 * cm])
    t_kpi.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), AZUL_CLARO),
        ("BOX", (0, 0), (-1, -1), 1, AZUL_PRIMARIO),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, GRIS_BORDE),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    historia.append(t_kpi)
    historia.append(Spacer(1, 0.3 * cm))
    historia.append(Paragraph(confianza.get("explicacion", ""), estilos["nota"]))
    historia.append(Spacer(1, 0.5 * cm))

    # ── Métricas por componente ───────────────────────────────────────────────
    historia.append(Paragraph("Métricas por Componente", estilos["subtitulo"]))
    headers_comp = ["Componente", "N Válidos", "Promedio", "Mediana", "Desv. Típica", "Mín.", "Máx.",
                    "Niv. 1", "Niv. 2", "Niv. 3", "Niv. 4"]
    filas_comp = [headers_comp]
    componentes = modelo.get("componentes", {})
    for comp in ORDEN_COMPONENTES:
        datos = componentes.get(comp)
        if not datos:
            continue
        dist = datos.get("distribucion_niveles", {})
        filas_comp.append([
            NOMBRES_COMPONENTES[comp],
            str(datos.get("n_validos", 0)),
            f"{datos.get('promedio') or '-':.1f}" if datos.get("promedio") else "-",
            f"{datos.get('mediana') or '-':.1f}" if datos.get("mediana") else "-",
            f"{datos.get('desviacion') or '-':.1f}" if datos.get("desviacion") else "-",
            f"{datos.get('minimo') or '-':.0f}" if datos.get("minimo") else "-",
            f"{datos.get('maximo') or '-':.0f}" if datos.get("maximo") else "-",
            str(dist.get("1", 0)),
            str(dist.get("2", 0)),
            str(dist.get("3", 0)),
            str(dist.get("4", 0)),
        ])

    col_widths = [4.5 * cm] + [1.4 * cm] * 10
    t_comp = Table(filas_comp, colWidths=col_widths, repeatRows=1)
    t_comp.setStyle(_tabla_style_base())
    historia.append(t_comp)
    historia.append(Spacer(1, 0.5 * cm))

    # ── Por programa ─────────────────────────────────────────────────────────
    por_programa = modelo.get("por_programa", {})
    if por_programa:
        historia.append(Paragraph("Resultados por Programa", estilos["subtitulo"]))
        headers_prog = ["Programa", "N"] + [NOMBRES_COMPONENTES[c][:12] for c in ORDEN_COMPONENTES]
        filas_prog = [headers_prog]
        for prog, datos in por_programa.items():
            fila = [prog[:30], str(datos.get("n", 0))]
            for comp in ORDEN_COMPONENTES:
                prom = datos.get("componentes", {}).get(comp, {}).get("promedio")
                fila.append(f"{prom:.1f}" if prom else "-")
            filas_prog.append(fila)
        col_w_prog = [5 * cm, 1.2 * cm] + [2.0 * cm] * 5
        t_prog = Table(filas_prog, colWidths=col_w_prog, repeatRows=1)
        t_prog.setStyle(_tabla_style_base())
        historia.append(t_prog)
        historia.append(Spacer(1, 0.5 * cm))

    # ── Diagnóstico automático ────────────────────────────────────────────────
    historia.append(PageBreak())
    historia.append(Paragraph("Hallazgos y Diagnóstico Automático", estilos["subtitulo"]))
    historia.append(HRFlowable(width="100%", thickness=1, color=GRIS_BORDE))
    historia.append(Spacer(1, 0.2 * cm))

    if diag.get("fortalezas"):
        historia.append(Paragraph("💪 Fortalezas Identificadas", estilos["subtitulo"]))
        for f in diag["fortalezas"]:
            historia.append(Paragraph(f"• {f}", estilos["item"]))
        historia.append(Spacer(1, 0.3 * cm))

    if diag.get("brechas"):
        historia.append(Paragraph("⚠️ Áreas de Mejora (Brechas)", estilos["subtitulo"]))
        for b in diag["brechas"]:
            historia.append(Paragraph(f"• {b}", estilos["item"]))
        historia.append(Spacer(1, 0.3 * cm))

    if diag.get("insights"):
        historia.append(Paragraph("💡 Insights Comparativos", estilos["subtitulo"]))
        for insight in diag["insights"]:
            historia.append(Paragraph(f"• {insight}", estilos["item"]))
        historia.append(Spacer(1, 0.3 * cm))

    if diag.get("recomendaciones"):
        historia.append(Paragraph("📋 Recomendaciones", estilos["subtitulo"]))
        for rec in diag["recomendaciones"]:
            historia.append(Paragraph(f"• {rec}", estilos["item"]))
        historia.append(Spacer(1, 0.3 * cm))

    # ── Nota de privacidad ───────────────────────────────────────────────────
    historia.append(Spacer(1, 0.5 * cm))
    historia.append(HRFlowable(width="100%", thickness=0.5, color=GRIS_BORDE))
    historia.append(Paragraph(
        "⚠️ Este reporte no contiene información personal identificable de los estudiantes. "
        "Los análisis se realizan sobre datos agregados. Generado por SaberAnalítica.",
        estilos["nota"]
    ))

    doc.build(historia)
    return buffer.getvalue()
