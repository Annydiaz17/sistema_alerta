# -*- coding: utf-8 -*-
"""
Exportador Excel — Genera un archivo .xlsx con 4 hojas de resultados.
Los datos de estudiantes individuales se presentan con IDs anonimizados.
"""

from __future__ import annotations
import io
import pandas as pd
import xlsxwriter

from backend.config import NOMBRES_COMPONENTES, ORDEN_COMPONENTES


def exportar_excel(modelo: dict, diagnostico: dict) -> bytes:
    """
    Genera el archivo Excel de resultados con 4 hojas:
      1. Resumen General
      2. Por Programa
      3. Por Jornada
      4. Alertas Críticas (IDs anonimizados)
    """
    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output, {"in_memory": True})

    # Estilos
    fmt_titulo = workbook.add_format({
        "bold": True, "font_size": 14, "font_color": "#1e3a5f",
        "bg_color": "#dbeafe", "border": 1, "align": "center", "valign": "vcenter"
    })
    fmt_header = workbook.add_format({
        "bold": True, "bg_color": "#1e3a5f", "font_color": "white",
        "border": 1, "align": "center", "valign": "vcenter", "text_wrap": True
    })
    fmt_celda = workbook.add_format({"border": 1, "align": "center"})
    fmt_celda_izq = workbook.add_format({"border": 1, "align": "left"})
    fmt_numero = workbook.add_format({"border": 1, "align": "center", "num_format": "0.0"})
    fmt_pct = workbook.add_format({"border": 1, "align": "center", "num_format": "0.0%"})
    fmt_alerta = workbook.add_format({
        "bold": True, "bg_color": "#fee2e2", "font_color": "#991b1b",
        "border": 1, "align": "center"
    })

    _hoja_resumen(workbook, modelo, diagnostico, fmt_titulo, fmt_header, fmt_celda, fmt_numero, fmt_pct)
    _hoja_por_grupo(workbook, modelo.get("por_programa", {}), "Por Programa",
                    fmt_titulo, fmt_header, fmt_celda, fmt_numero)
    _hoja_por_grupo(workbook, modelo.get("por_jornada", {}), "Por Jornada",
                    fmt_titulo, fmt_header, fmt_celda, fmt_numero)
    _hoja_alertas(workbook, modelo.get("alertas_criticas", []),
                  fmt_titulo, fmt_header, fmt_celda_izq, fmt_alerta, fmt_numero)

    workbook.close()
    return output.getvalue()


def _hoja_resumen(wb, modelo, diagnostico, *fmts):
    fmt_titulo, fmt_header, fmt_celda, fmt_numero, fmt_pct = fmts
    ws = wb.add_worksheet("Resumen General")
    ws.set_column("A:A", 35)
    ws.set_column("B:H", 16)

    ws.merge_range("A1:H1", "Diagnóstico Saber Pro — Resumen General", fmt_titulo)
    ws.set_row(0, 30)

    # Metadatos
    meta = modelo.get("meta", {})
    diag = diagnostico.get("confianza", {})
    ws.write("A3", "Total estudiantes", fmt_header)
    ws.write("B3", meta.get("total_estudiantes", 0), fmt_celda)
    ws.write("D3", "Programas", fmt_header)
    ws.write("E3", len(meta.get("programas", [])), fmt_celda)
    ws.write("F3", "Confianza del diagnóstico", fmt_header)
    ws.write("G3", diag.get("nivel", "-"), fmt_celda)

    # Tabla de métricas por componente
    fila = 5
    ws.merge_range(fila, 0, fila, 7, "Métricas por Componente", fmt_titulo)
    fila += 1
    headers = ["Componente", "N Válidos", "Promedio", "Mediana", "Desviación", "Mínimo", "Máximo",
               "% Sin dato"]
    for col_i, h in enumerate(headers):
        ws.write(fila, col_i, h, fmt_header)
    fila += 1

    componentes = modelo.get("componentes", {})
    calidad = diagnostico.get("calidad", {}).get("nulos_por_componente", {})
    for comp in ORDEN_COMPONENTES:
        datos = componentes.get(comp)
        if not datos:
            continue
        ws.write(fila, 0, datos.get("nombre"), fmt_celda)
        ws.write(fila, 1, datos.get("n_validos", 0), fmt_celda)
        for col_i, key in enumerate(["promedio", "mediana", "desviacion", "minimo", "maximo"], start=2):
            val = datos.get(key)
            ws.write(fila, col_i, val if val is not None else "-", fmt_numero if val is not None else fmt_celda)
        pct_sin = calidad.get(comp, {}).get("pct_sin_dato", 0)
        ws.write(fila, 7, pct_sin / 100, fmt_pct)
        fila += 1

    # Distribución de niveles
    fila += 1
    ws.merge_range(fila, 0, fila, 4, "Distribución de Niveles de Desempeño", fmt_titulo)
    fila += 1
    for col_i, h in enumerate(["Componente", "Nivel 1", "Nivel 2", "Nivel 3", "Nivel 4"]):
        ws.write(fila, col_i, h, fmt_header)
    fila += 1

    for comp in ORDEN_COMPONENTES:
        datos = componentes.get(comp)
        if not datos:
            continue
        dist = datos.get("distribucion_niveles", {})
        ws.write(fila, 0, datos.get("nombre"), fmt_celda)
        for col_i, nivel in enumerate(["1", "2", "3", "4"], start=1):
            ws.write(fila, col_i, dist.get(nivel, 0), fmt_celda)
        fila += 1


def _hoja_por_grupo(wb, por_grupo, titulo, fmt_titulo, fmt_header, fmt_celda, fmt_numero):
    ws = wb.add_worksheet(titulo[:31])
    ws.set_column("A:A", 30)
    ws.set_column("B:Z", 14)

    ws.merge_range(0, 0, 0, 5, titulo, fmt_titulo)
    ws.set_row(0, 30)

    fila = 2
    headers = ["Grupo", "N Estudiantes", "Prom. Total"] + [
        NOMBRES_COMPONENTES[c] for c in ORDEN_COMPONENTES
    ]
    for col_i, h in enumerate(headers):
        ws.write(fila, col_i, h, fmt_header)
    fila += 1

    for nombre, datos in por_grupo.items():
        prom_total = datos.get("puntaje_total", {}).get("promedio")
        ws.write(fila, 0, nombre, fmt_celda)
        ws.write(fila, 1, datos.get("n", 0), fmt_celda)
        ws.write(fila, 2, prom_total if prom_total else "-",
                 fmt_numero if prom_total else fmt_celda)
        for col_i, comp in enumerate(ORDEN_COMPONENTES, start=3):
            comp_datos = datos.get("componentes", {}).get(comp, {})
            prom = comp_datos.get("promedio")
            ws.write(fila, col_i, prom if prom is not None else "-",
                     fmt_numero if prom is not None else fmt_celda)
        fila += 1


def _hoja_alertas(wb, alertas, fmt_titulo, fmt_header, fmt_celda, fmt_alerta, fmt_numero):
    ws = wb.add_worksheet("Alertas Críticas")
    ws.set_column("A:A", 14)
    ws.set_column("B:C", 28)
    ws.set_column("D:D", 16)
    ws.set_column("E:E", 50)

    ws.merge_range(0, 0, 0, 4, "Alertas Críticas — Estudiantes que requieren atención", fmt_titulo)
    ws.set_row(0, 30)

    fila = 2
    for col_i, h in enumerate(["ID Anónimo", "Programa", "Jornada", "Puntaje Total", "Razones"]):
        ws.write(fila, col_i, h, fmt_header)
    fila += 1

    for alerta in alertas:
        ws.write(fila, 0, alerta.get("id_anonimizado", ""), fmt_alerta)
        ws.write(fila, 1, alerta.get("programa", "-"), fmt_celda)
        ws.write(fila, 2, alerta.get("jornada", "-"), fmt_celda)
        pt = alerta.get("puntaje_total")
        ws.write(fila, 3, pt if pt is not None else "-",
                 fmt_numero if pt is not None else fmt_celda)
        ws.write(fila, 4, "; ".join(alerta.get("razones", [])), fmt_celda)
        fila += 1

    if not alertas:
        ws.merge_range(fila, 0, fila, 4, "✅ No se identificaron alertas críticas.", fmt_celda)


def exportar_excel_alertas_por_programa(modelo: dict) -> bytes:
    """
    Genera un Excel con:
      - 1 sheet por programa (solo estudiantes en riesgo)
      - 1 sheet Resumen con conteos por programa y tipo de riesgo
    """
    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output, {"in_memory": True})

    # Estilos
    fmt_titulo = workbook.add_format({
        "bold": True, "font_size": 14, "font_color": "#1e3a5f",
        "bg_color": "#dbeafe", "border": 1, "align": "center", "valign": "vcenter"
    })
    fmt_header = workbook.add_format({
        "bold": True, "bg_color": "#1e3a5f", "font_color": "white",
        "border": 1, "align": "center", "valign": "vcenter", "text_wrap": True
    })
    fmt_celda = workbook.add_format({"border": 1, "align": "center"})
    fmt_celda_izq = workbook.add_format({"border": 1, "align": "left", "text_wrap": True})
    fmt_numero = workbook.add_format({"border": 1, "align": "center", "num_format": "0.0"})
    fmt_riesgo_simple = workbook.add_format({
        "border": 1, "align": "center", "bg_color": "#fef9c3", "font_color": "#854d0e"
    })
    fmt_riesgo_multiple = workbook.add_format({
        "border": 1, "align": "center", "bg_color": "#fee2e2", "font_color": "#991b1b", "bold": True
    })

    alertas_multi = modelo.get("alertas_multicriterio", {})
    detalle = alertas_multi.get("detalle", [])
    resumen_prog = alertas_multi.get("resumen", {}).get("por_programa", {})

    # ── Agrupar alertas por programa ──
    por_programa = {}
    for est in detalle:
        prog = est.get("programa", "Sin programa")
        if prog not in por_programa:
            por_programa[prog] = []
        por_programa[prog].append(est)

    # ── Headers de cada sheet ──
    headers = [
        "ID Anónimo", "Programa", "Jornada",
        "Razon. Cuant.", "Lectura Crít.", "Comp. Ciud.", "Inglés", "Com. Escrita",
        "Puntaje Total",
        "Nivel RC", "Nivel LC", "Nivel CC", "Nivel Ing.", "Nivel CE",
        "Razones de alerta", "Cant. alertas"
    ]

    comps_orden = ORDEN_COMPONENTES

    # ── 1 sheet por programa ──
    for prog, estudiantes in sorted(por_programa.items()):
        nombre_sheet = prog[:31]  # Excel limita a 31 chars
        ws = workbook.add_worksheet(nombre_sheet)
        ws.set_column("A:A", 12)
        ws.set_column("B:B", 25)
        ws.set_column("C:C", 12)
        ws.set_column("D:I", 12)
        ws.set_column("J:N", 10)
        ws.set_column("O:O", 50)
        ws.set_column("P:P", 10)

        ws.merge_range(0, 0, 0, len(headers) - 1,
                       f"Alertas — {prog} ({len(estudiantes)} estudiantes en riesgo)", fmt_titulo)
        ws.set_row(0, 30)

        fila = 2
        for col_i, h in enumerate(headers):
            ws.write(fila, col_i, h, fmt_header)
        fila += 1

        for est in estudiantes:
            es_multiple = est["tipo_riesgo"] == "multiple"
            fmt_row = fmt_riesgo_multiple if es_multiple else fmt_riesgo_simple
            fmt_num_row = fmt_row  # Usar el mismo fondo para números

            ws.write(fila, 0, est["id_anonimizado"], fmt_row)
            ws.write(fila, 1, est["programa"], fmt_row)
            ws.write(fila, 2, est["jornada"], fmt_row)

            # Puntajes por módulo
            for col_i, comp in enumerate(comps_orden, start=3):
                val = est.get("puntajes", {}).get(comp)
                ws.write(fila, col_i, val if val is not None else "-", fmt_num_row)

            # Puntaje total
            pt = est.get("puntaje_total")
            ws.write(fila, 8, pt if pt is not None else "-", fmt_num_row)

            # Niveles por módulo
            for col_i, comp in enumerate(comps_orden, start=9):
                nivel = est.get("niveles", {}).get(comp)
                ws.write(fila, col_i, f"N{nivel}" if nivel is not None else "-", fmt_row)

            # Razones de alerta
            razones = [
                f"{c['modulo']}: {c.get('valor', '')} {c.get('nivel', '')}"
                for c in est.get("criterios_alerta", [])
            ]
            ws.write(fila, 14, "; ".join(razones), fmt_celda_izq)
            ws.write(fila, 15, est["cantidad_alertas"], fmt_row)
            fila += 1

    # ── Sheet de Resumen ──
    ws_r = workbook.add_worksheet("Resumen")
    ws_r.set_column("A:A", 30)
    ws_r.set_column("B:D", 16)

    ws_r.merge_range(0, 0, 0, 3, "Resumen de alertas por programa", fmt_titulo)
    ws_r.set_row(0, 30)

    fila = 2
    for col_i, h in enumerate(["Programa", "Total en riesgo", "Riesgo simple", "Riesgo múltiple"]):
        ws_r.write(fila, col_i, h, fmt_header)
    fila += 1

    for prog, datos in sorted(resumen_prog.items()):
        ws_r.write(fila, 0, prog, fmt_celda)
        ws_r.write(fila, 1, datos["total"], fmt_celda)
        ws_r.write(fila, 2, datos["simple"], fmt_riesgo_simple)
        ws_r.write(fila, 3, datos["multiple"], fmt_riesgo_multiple)
        fila += 1

    # Totales
    resumen_total = alertas_multi.get("resumen", {})
    ws_r.write(fila, 0, "TOTAL", fmt_header)
    ws_r.write(fila, 1, resumen_total.get("total_en_riesgo", 0), fmt_header)
    ws_r.write(fila, 2, resumen_total.get("riesgo_simple", 0), fmt_header)
    ws_r.write(fila, 3, resumen_total.get("riesgo_multiple", 0), fmt_header)

    workbook.close()
    return output.getvalue()
