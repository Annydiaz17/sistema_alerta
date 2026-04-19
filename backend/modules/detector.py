# -*- coding: utf-8 -*-
"""
Módulo detector — Identifica la hoja principal y mapea las columnas del Excel.
La hoja se detecta por estructura de columnas, NUNCA por nombre.
"""

import unicodedata
import openpyxl
import pandas as pd
from typing import Optional

from backend.config import COLUMN_ALIASES, MIN_SHEET_COLUMN_SCORE, ORDEN_COMPONENTES


def _normalizar(texto: str) -> str:
    """Convierte a minúsculas, elimina tildes y caracteres no alfanuméricos."""
    texto = texto.strip().lower()
    nfkd = unicodedata.normalize("NFD", texto)
    sin_tildes = "".join(c for c in nfkd if not unicodedata.combining(c))
    # Reemplazar dos puntos y guiones por espacio, luego colapsar espacios
    sin_tildes = sin_tildes.replace(":", " ").replace("-", " ").replace("_", " ")
    return " ".join(sin_tildes.split())


def _calcular_score_hoja(columnas_raw: list[str]) -> dict:
    """
    Calcula el score de coincidencia entre las columnas de una hoja
    y las columnas esperadas del sistema.
    Retorna el mapeo detectado y el score (0.0 – 1.0).
    """
    columnas_norm = {_normalizar(c): c for c in columnas_raw}
    mapeo = {}

    for clave_interna, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            alias_norm = _normalizar(alias)
            if alias_norm in columnas_norm:
                mapeo[clave_interna] = columnas_norm[alias_norm]
                break

    # Score basado en columnas clave detectadas
    columnas_esperadas = set(COLUMN_ALIASES.keys())
    score = len(set(mapeo.keys()) & columnas_esperadas) / len(columnas_esperadas)
    return {"mapeo": mapeo, "score": score}


def detectar_hoja_principal(ruta_o_buffer) -> tuple[pd.DataFrame, dict, str]:
    """
    Lee todas las hojas del Excel y devuelve la que más se parece
    a la estructura esperada (score ≥ MIN_SHEET_COLUMN_SCORE).

    Returns:
        (df_hoja, mapeo_columnas, nombre_hoja)

    Raises:
        ValueError: si ninguna hoja tiene score suficiente.
    """
    wb = openpyxl.load_workbook(ruta_o_buffer, read_only=True, data_only=True)
    hojas = wb.sheetnames
    wb.close()

    mejor_hoja = None
    mejor_score = -1.0
    mejor_mapeo = {}

    for nombre_hoja in hojas:
        try:
            df = pd.read_excel(ruta_o_buffer, sheet_name=nombre_hoja, engine="openpyxl", nrows=5)
        except Exception:
            continue

        if df.empty or len(df.columns) < 3:
            continue

        resultado = _calcular_score_hoja(df.columns.tolist())
        if resultado["score"] > mejor_score:
            mejor_score = resultado["score"]
            mejor_hoja = nombre_hoja
            mejor_mapeo = resultado["mapeo"]

    if mejor_hoja is None or mejor_score < MIN_SHEET_COLUMN_SCORE:
        raise ValueError(
            f"No se encontró ninguna hoja con la estructura esperada. "
            f"Mayor coincidencia: {mejor_score:.0%}. "
            f"Verifique que el archivo tenga las columnas de resultados Saber Pro."
        )

    # Leer la hoja completa
    df_completo = pd.read_excel(ruta_o_buffer, sheet_name=mejor_hoja, engine="openpyxl")
    return df_completo, mejor_mapeo, mejor_hoja


def construir_mapeo_completo(mapeo: dict) -> dict:
    """
    Enriquece el mapeo con información de los componentes detectados.
    Retorna el mapeo con listas de puntajes y niveles disponibles.
    """
    puntajes_detectados = [
        comp for comp in ORDEN_COMPONENTES if comp in mapeo
    ]
    niveles_detectados = [
        comp for comp in ORDEN_COMPONENTES
        if f"nivel_{comp}" in mapeo
    ]
    mapeo["_puntajes_detectados"] = puntajes_detectados
    mapeo["_niveles_detectados"] = niveles_detectados
    return mapeo
