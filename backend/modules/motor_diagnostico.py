# -*- coding: utf-8 -*-
"""
Motor de diagnóstico — Genera insights automáticos, fortalezas, brechas,
recomendaciones y nivel de confianza del diagnóstico en lenguaje claro.
"""

from __future__ import annotations
import pandas as pd

from backend.config import (
    NOMBRES_COMPONENTES,
    ORDEN_COMPONENTES,
    UMBRAL_CONFIANZA_ALTO,
    UMBRAL_CONFIANZA_MEDIO,
    UMBRAL_FORTALEZA_PCT,
    UMBRAL_BRECHA_PCT,
    UMBRAL_DIFERENCIA_PROG,
    UMBRAL_DIFERENCIA_JORN,
)


def _calcular_confianza(estadisticas_limpieza: dict, advertencias_count: int) -> dict:
    """
    Calcula el nivel de confianza del diagnóstico según calidad del archivo.
    Retorna {"nivel": "Alto"|"Medio"|"Bajo", "explicacion": str, "pct_nulos_promedio": float}
    """
    pcts = []
    for comp, stats in estadisticas_limpieza.items():
        total = stats.get("total", 0)
        nulos = stats.get("nulos", 0)
        ia = stats.get("ia", 0)
        if total > 0:
            pcts.append((nulos + ia) / total)

    pct_promedio = sum(pcts) / len(pcts) if pcts else 0.0

    if pct_promedio <= UMBRAL_CONFIANZA_ALTO and advertencias_count == 0:
        nivel = "Alto"
        explicacion = (
            f"El {(1 - pct_promedio) * 100:.0f}% de los registros tiene información completa. "
            f"Los resultados del diagnóstico son altamente confiables."
        )
    elif pct_promedio <= UMBRAL_CONFIANZA_MEDIO:
        nivel = "Medio"
        pct_sin = pct_promedio * 100
        explicacion = (
            f"En promedio, el {pct_sin:.1f}% de los estudiantes no tiene puntaje en algún módulo. "
            f"Esto es normal en Saber Pro, pero puede afectar levemente los promedios calculados."
        )
    else:
        nivel = "Bajo"
        pct_sin = pct_promedio * 100
        explicacion = (
            f"Más del {pct_sin:.0f}% de los puntajes están vacíos en promedio. "
            f"Los resultados deben interpretarse con cautela. "
            f"Se recomienda verificar la completitud del archivo original."
        )

    return {
        "nivel": nivel,
        "explicacion": explicacion,
        "pct_nulos_promedio": round(pct_promedio * 100, 1),
    }


def _identificar_fortalezas_y_brechas(componentes: dict) -> tuple[list[str], list[str]]:
    """
    Identifica fortalezas (≥50% en Nivel 3+4) y brechas (≥30% en Nivel 1).
    """
    fortalezas = []
    brechas = []

    for comp in ORDEN_COMPONENTES:
        datos = componentes.get(comp)
        if not datos or datos.get("n_validos", 0) == 0:
            continue

        n_validos = datos["n_validos"]
        dist = datos.get("distribucion_niveles", {})
        n3 = dist.get("3", 0)
        n4 = dist.get("4", 0)
        n1 = dist.get("1", 0)

        pct_alto = (n3 + n4) / n_validos
        pct_nivel1 = n1 / n_validos
        nombre = NOMBRES_COMPONENTES[comp]

        if pct_alto >= UMBRAL_FORTALEZA_PCT:
            fortalezas.append(
                f"{nombre}: el {pct_alto * 100:.0f}% de los estudiantes alcanzó Nivel 3 o 4."
            )

        if pct_nivel1 >= UMBRAL_BRECHA_PCT:
            brechas.append(
                f"{nombre}: el {pct_nivel1 * 100:.0f}% de los estudiantes se ubicó en Nivel 1 "
                f"(el nivel más bajo)."
            )

    return fortalezas, brechas


def _generar_insights_programa(por_programa: dict, puntajes_detectados: list) -> list[str]:
    """Genera insights comparativos entre programas."""
    insights = []
    if len(por_programa) < 2:
        return insights

    for comp in puntajes_detectados:
        nombre = NOMBRES_COMPONENTES[comp]
        promedios = {}
        for prog, datos in por_programa.items():
            comp_data = datos.get("componentes", {}).get(comp, {})
            prom = comp_data.get("promedio")
            if prom is not None:
                promedios[prog] = prom

        if len(promedios) < 2:
            continue

        max_prog = max(promedios, key=promedios.get)
        min_prog = min(promedios, key=promedios.get)
        diferencia = promedios[max_prog] - promedios[min_prog]

        if diferencia >= UMBRAL_DIFERENCIA_PROG:
            insights.append(
                f"En {nombre}, existe una brecha de {diferencia:.1f} puntos entre "
                f"'{max_prog}' (promedio {promedios[max_prog]:.1f}) y "
                f"'{min_prog}' (promedio {promedios[min_prog]:.1f})."
            )

    return insights


def _generar_insights_jornada(por_jornada: dict, puntajes_detectados: list) -> list[str]:
    """Genera insights comparativos entre jornadas."""
    insights = []
    if len(por_jornada) < 2:
        return insights

    for comp in puntajes_detectados:
        nombre = NOMBRES_COMPONENTES[comp]
        promedios = {}
        for jorn, datos in por_jornada.items():
            comp_data = datos.get("componentes", {}).get(comp, {})
            prom = comp_data.get("promedio")
            if prom is not None:
                promedios[jorn] = prom

        if len(promedios) < 2:
            continue

        jornadas_list = list(promedios.items())
        for i in range(len(jornadas_list)):
            for j in range(i + 1, len(jornadas_list)):
                j1, p1 = jornadas_list[i]
                j2, p2 = jornadas_list[j]
                diferencia = abs(p1 - p2)
                if diferencia >= UMBRAL_DIFERENCIA_JORN:
                    mayor = j1 if p1 > p2 else j2
                    menor = j2 if p1 > p2 else j1
                    pm = max(p1, p2)
                    insights.append(
                        f"En {nombre}, la jornada {mayor} supera por {diferencia:.1f} puntos "
                        f"a la jornada {menor} (promedio {pm:.1f} vs {min(p1, p2):.1f})."
                    )

    return insights


def _generar_recomendaciones(
    fortalezas: list,
    brechas: list,
    insights_programa: list,
    insights_jornada: list,
) -> list[str]:
    """Genera recomendaciones accionables en lenguaje simple."""
    recomendaciones = []

    if not brechas and not fortalezas:
        recomendaciones.append(
            "El desempeño es relativamente homogéneo entre módulos. "
            "Se recomienda revisar los resultados por programa para identificar necesidades específicas."
        )
        return recomendaciones

    if brechas:
        modulos_brecha = []
        for b in brechas:
            modulo = b.split(":")[0]
            modulos_brecha.append(modulo)

        recomendaciones.append(
            f"Se recomienda diseñar estrategias de fortalecimiento para: "
            f"{', '.join(modulos_brecha)}. Estos módulos muestran la mayor concentración "
            f"de estudiantes en el nivel más bajo de desempeño."
        )

    if insights_jornada:
        recomendaciones.append(
            "Existe una diferencia significativa de resultados entre jornadas. "
            "Se recomienda revisar si hay diferencias en la atención o recursos disponibles "
            "para cada jornada."
        )

    if insights_programa:
        recomendaciones.append(
            "Se identificaron brechas importantes entre programas académicos. "
            "Se recomienda socializar estos resultados con los directores de programa "
            "para generar planes de mejora focalizados."
        )

    if fortalezas:
        modulos_fortaleza = [f.split(":")[0] for f in fortalezas]
        recomendaciones.append(
            f"{', '.join(modulos_fortaleza)} muestran resultados destacados. "
            f"Se recomienda identificar y documentar las buenas prácticas de estos módulos "
            f"para replicarlas en otros."
        )

    return recomendaciones


def generar_diagnostico(modelo: dict, advertencias_count: int) -> dict:
    """
    Genera el diagnóstico completo a partir del modelo interno.

    Args:
        modelo: resultado de transformador.transformar()
        advertencias_count: número de advertencias del validador

    Returns:
        Diccionario con el diagnóstico completo.
    """
    estadisticas_limpieza = modelo.get("estadisticas_limpieza", {})
    componentes = modelo.get("componentes", {})
    por_programa = modelo.get("por_programa", {})
    por_jornada = modelo.get("por_jornada", {})
    puntajes_detectados = [
        c for c in ORDEN_COMPONENTES if c in componentes
    ]

    # Confianza
    confianza = _calcular_confianza(estadisticas_limpieza, advertencias_count)

    # Fortalezas y brechas
    fortalezas, brechas = _identificar_fortalezas_y_brechas(componentes)

    # Insights comparativos
    insights_programa = _generar_insights_programa(por_programa, puntajes_detectados)
    insights_jornada = _generar_insights_jornada(por_jornada, puntajes_detectados)

    # Consolidar todos los insights
    todos_insights = insights_programa + insights_jornada
    if not todos_insights and not fortalezas and not brechas:
        todos_insights = [
            "El desempeño general de los estudiantes es consistente en todos los módulos evaluados."
        ]

    # Recomendaciones
    recomendaciones = _generar_recomendaciones(
        fortalezas, brechas, insights_programa, insights_jornada
    )

    # Resumen de calidad del archivo
    calidad = _construir_calidad(estadisticas_limpieza, modelo.get("meta", {}))

    return {
        "confianza": confianza,
        "fortalezas": fortalezas,
        "brechas": brechas,
        "insights": todos_insights,
        "recomendaciones": recomendaciones,
        "calidad": calidad,
    }


def _construir_calidad(estadisticas_limpieza: dict, meta: dict) -> dict:
    """Construye el bloque de calidad del archivo para el frontend."""
    nulos_por_componente = {}
    for comp, stats in estadisticas_limpieza.items():
        total = stats.get("total", 0)
        nulos = stats.get("nulos", 0)
        ia = stats.get("ia", 0)
        pct = round((nulos + ia) / total * 100, 1) if total > 0 else 0
        nulos_por_componente[comp] = {
            "nombre": NOMBRES_COMPONENTES.get(comp, comp),
            "nulos": nulos,
            "ia": ia,
            "total": total,
            "pct_sin_dato": pct,
        }

    return {
        "nulos_por_componente": nulos_por_componente,
        "total_estudiantes": meta.get("total_estudiantes", 0),
        "total_programas": len(meta.get("programas", [])),
        "total_jornadas": len(meta.get("jornadas", [])),
    }
