# -*- coding: utf-8 -*-
"""
Módulo transformador — Construye el modelo interno a partir del DataFrame limpio.
Recalcula puntajes totales y niveles de desempeño usando la tabla ICFES de config.py.

IMPORTANTE:
  - El puntaje total del Excel se IGNORA. Siempre se recalcula.
  - Los niveles de desempeño del Excel se verifican y recalculan.
  - Los nulos y valores IA se excluyen de todos los cálculos numéricos.
"""

from __future__ import annotations
import numpy as np
import pandas as pd
from typing import Optional

from backend.config import (
    RANGOS_NIVELES,
    NOMBRES_COMPONENTES,
    COLORES_COMPONENTES,
    ORDEN_COMPONENTES,
    UMBRAL_PUNTAJE_MODULO_BAJO,
    UMBRAL_PUNTAJE_TOTAL_BAJO,
)


def _calcular_nivel(puntaje: float, componente: str) -> Optional[int]:
    """
    Calcula el nivel de desempeño ICFES para un puntaje dado.
    Retorna 1, 2, 3 o 4, o None si el puntaje es inválido.
    """
    if puntaje is None or (isinstance(puntaje, float) and np.isnan(puntaje)):
        return None
    rangos = RANGOS_NIVELES.get(componente, [])
    for min_val, max_val, nivel in rangos:
        if min_val <= puntaje <= max_val:
            return nivel
    return None


def _calcular_puntaje_total(row: pd.Series, columnas: dict) -> Optional[float]:
    """
    Calcula el promedio de los puntajes disponibles (excluye NaN e IA).
    El puntaje total del Excel se ignora completamente.
    """
    valores = []
    for comp in ORDEN_COMPONENTES:
        col = columnas.get(comp)
        if col and col in row.index:
            val = row[col]
            if pd.notna(val):
                try:
                    valores.append(float(val))
                except (TypeError, ValueError):
                    pass
    if not valores:
        return None
    return round(sum(valores) / len(valores), 2)


def _estadisticas_serie(serie: pd.Series) -> dict:
    """Calcula estadísticas descriptivas de una serie numérica."""
    s = serie.dropna()
    if len(s) == 0:
        return {
            "n_validos": 0,
            "promedio": None,
            "mediana": None,
            "desviacion": None,
            "minimo": None,
            "maximo": None,
        }
    return {
        "n_validos": int(len(s)),
        "promedio": round(float(s.mean()), 2),
        "mediana": round(float(s.median()), 2),
        "desviacion": round(float(s.std()), 2),
        "minimo": round(float(s.min()), 2),
        "maximo": round(float(s.max()), 2),
    }


def _distribucion_niveles(serie_niveles: pd.Series) -> dict:
    """Cuenta la frecuencia de cada nivel (1-4)."""
    resultado = {"1": 0, "2": 0, "3": 0, "4": 0}
    for nivel in [1, 2, 3, 4]:
        resultado[str(nivel)] = int((serie_niveles == nivel).sum())
    return resultado


def _histograma(serie: pd.Series, bins: int = 12) -> dict:
    """Genera bins y counts para un histograma de distribución de puntajes."""
    s = serie.dropna()
    if len(s) < 2:
        return {"bins": [], "counts": []}
    counts, edges = np.histogram(s, bins=bins)
    return {
        "bins": [round(float(e), 1) for e in edges],
        "counts": [int(c) for c in counts],
    }


def procesar_componente(
    df: pd.DataFrame,
    mapeo: dict,
    comp: str,
) -> dict:
    """
    Procesa un componente completo: puntajes, niveles y distribuciones.
    """
    col_puntaje = mapeo.get(comp)
    col_nivel = mapeo.get(f"nivel_{comp}")

    # Serie de puntajes numérica (ya limpia, IA → NaN)
    if col_puntaje and col_puntaje in df.columns:
        serie_puntaje = df[col_puntaje].dropna()
    else:
        serie_puntaje = pd.Series(dtype="float64")

    # Calcular niveles desde los puntajes (tabla ICFES)
    niveles_calculados = serie_puntaje.apply(
        lambda p: _calcular_nivel(p, comp)
    )

    estadisticas = _estadisticas_serie(serie_puntaje)
    dist_niveles = _distribucion_niveles(niveles_calculados)
    histograma = _histograma(serie_puntaje)

    return {
        "clave": comp,
        "nombre": NOMBRES_COMPONENTES[comp],
        "color": COLORES_COMPONENTES[comp],
        **estadisticas,
        "distribucion_niveles": dist_niveles,
        "histograma": histograma,
        "n_total": int(len(df)),
    }


def procesar_grupo(
    df_grupo: pd.DataFrame,
    mapeo: dict,
    nombre_grupo: str,
    puntajes_detectados: list[str],
) -> dict:
    """Procesa las métricas de un subgrupo (programa o jornada)."""
    # Serie de puntajes totales del grupo
    totales = df_grupo["_puntaje_total"].dropna()
    stats_total = _estadisticas_serie(totales)

    componentes_grupo = {}
    for comp in puntajes_detectados:
        col = mapeo.get(comp)
        if col and col in df_grupo.columns:
            serie = df_grupo[col].dropna()
            stats = _estadisticas_serie(serie)
            niveles = serie.apply(lambda p: _calcular_nivel(p, comp))
            componentes_grupo[comp] = {
                "nombre": NOMBRES_COMPONENTES[comp],
                **stats,
                "distribucion_niveles": _distribucion_niveles(niveles),
            }

    return {
        "nombre": nombre_grupo,
        "n": int(len(df_grupo)),
        "puntaje_total": stats_total,
        "componentes": componentes_grupo,
    }


def transformar(
    df: pd.DataFrame,
    mapeo: dict,
    estadisticas_limpieza: dict,
) -> dict:
    """
    Pipeline principal de transformación.
    Retorna el modelo interno completo listo para el motor de diagnóstico.
    """
    puntajes_detectados = mapeo.get("_puntajes_detectados", [])
    col_programa = mapeo.get("programa")
    col_jornada = mapeo.get("jornada")

    # ── Recalcular puntaje total por estudiante ────────────────────────────
    df["_puntaje_total"] = df.apply(
        lambda row: _calcular_puntaje_total(row, mapeo), axis=1
    )

    # ── Recalcular nivel por componente ────────────────────────────────────
    for comp in puntajes_detectados:
        col = mapeo.get(comp)
        if col and col in df.columns:
            df[f"_nivel_{comp}"] = df[col].apply(
                lambda p: _calcular_nivel(p, comp) if pd.notna(p) else None
            )

    # ── Metadatos generales ─────────────────────────────────────────────────
    programas = []
    if col_programa and col_programa in df.columns:
        programas = sorted(df[col_programa].dropna().unique().tolist())

    jornadas = []
    if col_jornada and col_jornada in df.columns:
        jornadas = sorted(df[col_jornada].dropna().unique().tolist())

    meta = {
        "total_estudiantes": int(len(df)),
        "programas": programas,
        "jornadas": jornadas,
        "componentes_disponibles": [NOMBRES_COMPONENTES[c] for c in puntajes_detectados],
    }

    # ── Métricas globales por componente ────────────────────────────────────
    componentes_global = {}
    for comp in puntajes_detectados:
        componentes_global[comp] = procesar_componente(df, mapeo, comp)

    # Estadísticas del puntaje total
    total_stats = _estadisticas_serie(df["_puntaje_total"])

    # ── Por programa ────────────────────────────────────────────────────────
    por_programa = {}
    if col_programa and col_programa in df.columns:
        for prog in programas:
            df_prog = df[df[col_programa] == prog]
            por_programa[prog] = procesar_grupo(df_prog, mapeo, prog, puntajes_detectados)

    # ── Por jornada ─────────────────────────────────────────────────────────
    por_jornada = {}
    if col_jornada and col_jornada in df.columns:
        for jorn in jornadas:
            df_jorn = df[df[col_jornada] == jorn]
            por_jornada[jorn] = procesar_grupo(df_jorn, mapeo, jorn, puntajes_detectados)

    # ── Alertas críticas (anonimizadas) ─────────────────────────────────────
    alertas = _construir_alertas(df, mapeo, puntajes_detectados)

    # ── Alertas multicriterio (4 reglas obligatorias) ──────────────────────
    alertas_multi = _construir_alertas_multicriterio(df, mapeo, puntajes_detectados)

    # ── Datos para gráficas Plotly (arrays individuales) ───────────────────
    datos_plotly = _construir_datos_plotly(df, mapeo, puntajes_detectados)

    return {
        "df": df,                          # DataFrame enriquecido (para exportación)
        "meta": meta,
        "puntaje_total_global": total_stats,
        "componentes": componentes_global,
        "por_programa": por_programa,
        "por_jornada": por_jornada,
        "estadisticas_limpieza": estadisticas_limpieza,
        "alertas_criticas": alertas,
        "alertas_multicriterio": alertas_multi,
        "datos_plotly": datos_plotly,
    }


def _construir_alertas(
    df: pd.DataFrame,
    mapeo: dict,
    puntajes_detectados: list[str],
) -> list[dict]:
    """
    Construye la lista de alertas críticas (estudiantes con Nivel 1 en algún módulo
    o puntaje total muy bajo). Los IDs se anonimizan con un índice de sesión.
    """
    alertas = []
    col_programa = mapeo.get("programa")
    col_jornada = mapeo.get("jornada")

    for idx, row in df.iterrows():
        razones = []
        for comp in puntajes_detectados:
            nivel = row.get(f"_nivel_{comp}")
            if nivel == 1:
                razones.append(f"Nivel 1 en {NOMBRES_COMPONENTES[comp]}")

        puntaje_total = row.get("_puntaje_total")
        if puntaje_total is not None and pd.notna(puntaje_total) and puntaje_total < 120:
            razones.append(f"Puntaje total ({puntaje_total:.1f}) por debajo de 120")

        if razones:
            alertas.append({
                "id_anonimizado": f"EST-{str(idx + 1).zfill(4)}",
                "programa": str(row.get(col_programa, "Sin programa")) if col_programa else "Sin programa",
                "jornada": str(row.get(col_jornada, "-")) if col_jornada else "-",
                "puntaje_total": round(float(puntaje_total), 1) if puntaje_total and pd.notna(puntaje_total) else None,
                "razones": razones,
            })

    # Ordenar por puntaje total ascendente
    alertas.sort(key=lambda a: a["puntaje_total"] if a["puntaje_total"] is not None else 999)
    return alertas


def _construir_datos_plotly(
    df: pd.DataFrame,
    mapeo: dict,
    puntajes_detectados: list[str],
) -> dict:
    """
    Construye arrays de valores individuales para las gráficas Plotly.
    Cada array tiene un valor por estudiante (o null si no tiene dato).
    """
    col_programa = mapeo.get("programa")
    col_jornada = mapeo.get("jornada")

    puntajes_individuales = {}
    for comp in puntajes_detectados:
        col = mapeo.get(comp)
        if col and col in df.columns:
            serie = df[col].where(df[col].notna(), None)
            puntajes_individuales[comp] = [
                round(float(v), 1) if v is not None and pd.notna(v) else None
                for v in serie
            ]
        else:
            puntajes_individuales[comp] = []

    puntaje_total = [
        round(float(v), 2) if v is not None and pd.notna(v) else None
        for v in df["_puntaje_total"]
    ]

    programas = []
    if col_programa and col_programa in df.columns:
        programas = [str(v) if pd.notna(v) else "Sin programa" for v in df[col_programa]]

    jornadas = []
    if col_jornada and col_jornada in df.columns:
        jornadas = [str(v) if pd.notna(v) else "-" for v in df[col_jornada]]

    ids_anon = [f"EST-{str(i + 1).zfill(4)}" for i in range(len(df))]

    return {
        "puntajes_individuales": puntajes_individuales,
        "puntaje_total": puntaje_total,
        "programas_por_estudiante": programas,
        "jornadas_por_estudiante": jornadas,
        "ids_anonimizados": ids_anon,
    }


def _construir_alertas_multicriterio(
    df: pd.DataFrame,
    mapeo: dict,
    puntajes_detectados: list[str],
) -> dict:
    """
    Construye alertas multicriterio con las 4 reglas obligatorias:
      1. Puntaje de módulo < 120
      2. Puntaje total < 130
      3. Nivel 1 en Lectura Crítica
      4. Nivel 1 en Razonamiento Cuantitativo

    Retorna resumen + detalle por estudiante.
    """
    col_programa = mapeo.get("programa")
    col_jornada = mapeo.get("jornada")
    detalle = []

    conteo_criterio = {
        "puntaje_modulo_bajo": 0,
        "puntaje_total_bajo": 0,
        "nivel1_lectura": 0,
        "nivel1_razonamiento": 0,
    }
    por_programa = {}

    for idx, row in df.iterrows():
        criterios = []
        puntajes_est = {}
        niveles_est = {}

        # Recopilar puntajes y niveles del estudiante
        for comp in puntajes_detectados:
            col = mapeo.get(comp)
            if col and col in df.columns:
                val = row[col]
                if pd.notna(val):
                    puntajes_est[comp] = round(float(val), 1)
                    # Regla 1: puntaje de módulo < 120
                    if float(val) < UMBRAL_PUNTAJE_MODULO_BAJO:
                        criterios.append({
                            "codigo": "PUNTAJE_MODULO_BAJO",
                            "modulo": NOMBRES_COMPONENTES[comp],
                            "valor": round(float(val), 1),
                        })

            nivel_col = f"_nivel_{comp}"
            if nivel_col in row.index and pd.notna(row[nivel_col]):
                niveles_est[comp] = int(row[nivel_col])

        # Regla 2: puntaje total < 130
        pt = row.get("_puntaje_total")
        if pt is not None and pd.notna(pt) and float(pt) < UMBRAL_PUNTAJE_TOTAL_BAJO:
            criterios.append({
                "codigo": "PUNTAJE_TOTAL_BAJO",
                "modulo": "Puntaje Total",
                "valor": round(float(pt), 1),
            })

        # Regla 3: Nivel 1 en Lectura Crítica
        nivel_lc = row.get("_nivel_lectura_critica")
        if nivel_lc is not None and pd.notna(nivel_lc) and int(nivel_lc) == 1:
            criterios.append({
                "codigo": "NIVEL1_LC",
                "modulo": "Lectura Crítica",
                "nivel": 1,
            })

        # Regla 4: Nivel 1 en Razonamiento Cuantitativo
        nivel_rc = row.get("_nivel_razonamiento_cuantitativo")
        if nivel_rc is not None and pd.notna(nivel_rc) and int(nivel_rc) == 1:
            criterios.append({
                "codigo": "NIVEL1_RC",
                "modulo": "Razonamiento Cuantitativo",
                "nivel": 1,
            })

        if not criterios:
            continue

        # Contabilizar
        for c in criterios:
            if c["codigo"] == "PUNTAJE_MODULO_BAJO":
                conteo_criterio["puntaje_modulo_bajo"] += 1
            elif c["codigo"] == "PUNTAJE_TOTAL_BAJO":
                conteo_criterio["puntaje_total_bajo"] += 1
            elif c["codigo"] == "NIVEL1_LC":
                conteo_criterio["nivel1_lectura"] += 1
            elif c["codigo"] == "NIVEL1_RC":
                conteo_criterio["nivel1_razonamiento"] += 1

        cantidad = len(criterios)
        tipo_riesgo = "multiple" if cantidad >= 2 else "simple"
        programa = str(row.get(col_programa, "Sin programa")) if col_programa else "Sin programa"
        jornada = str(row.get(col_jornada, "-")) if col_jornada else "-"

        # Acumular por programa
        if programa not in por_programa:
            por_programa[programa] = {"total": 0, "simple": 0, "multiple": 0}
        por_programa[programa]["total"] += 1
        por_programa[programa][tipo_riesgo] += 1

        detalle.append({
            "id_anonimizado": f"EST-{str(idx + 1).zfill(4)}",
            "programa": programa,
            "jornada": jornada,
            "puntaje_total": round(float(pt), 1) if pt is not None and pd.notna(pt) else None,
            "puntajes": puntajes_est,
            "niveles": niveles_est,
            "criterios_alerta": criterios,
            "cantidad_alertas": cantidad,
            "tipo_riesgo": tipo_riesgo,
        })

    detalle.sort(key=lambda a: a["cantidad_alertas"], reverse=True)

    total_riesgo = len(detalle)
    riesgo_simple = sum(1 for d in detalle if d["tipo_riesgo"] == "simple")
    riesgo_multiple = sum(1 for d in detalle if d["tipo_riesgo"] == "multiple")

    return {
        "resumen": {
            "total_en_riesgo": total_riesgo,
            "riesgo_simple": riesgo_simple,
            "riesgo_multiple": riesgo_multiple,
            "por_criterio": conteo_criterio,
            "por_programa": por_programa,
        },
        "detalle": detalle,
    }
