# -*- coding: utf-8 -*-
"""
Módulo limpiador — Limpia y normaliza el DataFrame.

Política explícita:
  - Se corrige automáticamente (INFO):  espacios, mayúsculas, dos puntos en encabezados,
                                         filas vacías, tipos numéricos donde sea seguro.
  - Se marca como ADVERTENCIA:          nulos (no se imputan), valor IA.
  - Bloquea el procesamiento:           gestionado por el validador, no por este módulo.

IMPORTANTE: Los nulos en puntajes NO se imputan con medianas.
            Se excluyen de los cálculos numéricos de forma transparente.
"""

from __future__ import annotations
import unicodedata
import pandas as pd

from backend.config import VALOR_IA, ORDEN_COMPONENTES, NOMBRES_COMPONENTES


def _normalizar_texto(texto: str) -> str:
    """Normaliza un string: strip, minúsculas, sin tildes."""
    texto = texto.strip().lower()
    nfkd = unicodedata.normalize("NFD", texto)
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def _es_valor_ia(val) -> bool:
    """Devuelve True si el valor es la categoría especial IA."""
    if pd.isna(val):
        return False
    return str(val).strip().lower() == VALOR_IA


def limpiar_encabezados(df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    """
    Limpia los nombres de columnas:
      - Elimina espacios al inicio/fin
      - Elimina dos puntos al final (Programa: → Programa)
      - Normaliza espacios internos

    Retorna el DataFrame con encabezados limpios y la lista de correcciones aplicadas.
    """
    correcciones = []
    nuevos_nombres = {}
    for col in df.columns:
        col_str = str(col)
        limpio = col_str.strip()
        if limpio.endswith(":"):
            limpio = limpio[:-1].strip()
        limpio = " ".join(limpio.split())
        if limpio != col_str:
            correcciones.append(f"'{col_str}' → '{limpio}'")
            nuevos_nombres[col_str] = limpio

    if nuevos_nombres:
        df = df.rename(columns=nuevos_nombres)

    return df, correcciones


def limpiar_categoricos(df: pd.DataFrame, mapeo: dict) -> tuple[pd.DataFrame, list[str]]:
    """
    Normaliza columnas categóricas (programa, jornada):
      - Strip de espacios
      - Capitalización consistente (Title Case)
      - Unifica "nan" y "NaN" → None
    """
    correcciones = []
    for clave in ["programa", "jornada"]:
        col = mapeo.get(clave)
        if col and col in df.columns:
            original = df[col].copy()
            df[col] = df[col].astype(str).str.strip()
            # Reemplazar strings "nan"/"none" por NaN real
            df[col] = df[col].replace({"nan": pd.NA, "None": pd.NA, "": pd.NA})
            df[col] = df[col].str.title()
            cambios = int((original.astype(str) != df[col].fillna("").astype(str)).sum())
            if cambios > 0:
                correcciones.append(f"Columna '{col}': {cambios} valores normalizados")
    return df, correcciones


def limpiar_puntajes(df: pd.DataFrame, mapeo: dict) -> tuple[pd.DataFrame, dict, list[str]]:
    """
    Normaliza columnas de puntaje:
      - Preserva el valor IA como string especial
      - Convierte el resto a numérico (float), dejando nulos como NaN
      - NO imputa medianas

    Retorna:
      - DataFrame modificado
      - Diccionario {componente: {"ia": count, "nulos": count, "validos": count}}
      - Lista de correcciones aplicadas
    """
    estadisticas = {}
    correcciones = []

    for comp in ORDEN_COMPONENTES:
        col = mapeo.get(comp)
        if not col or col not in df.columns:
            continue

        serie = df[col].copy()

        # Identificar IA antes de convertir a numérico
        mascara_ia = serie.astype(str).str.strip().str.lower() == VALOR_IA
        count_ia = int(mascara_ia.sum())

        # Crear nueva serie: numérica donde no es IA, NaN donde es IA o no numérico
        nueva_serie = pd.Series(index=df.index, dtype="float64")
        nueva_serie[~mascara_ia] = pd.to_numeric(serie[~mascara_ia], errors="coerce")
        # Los IA quedan como NaN en la columna numérica

        count_nulos = int((~mascara_ia & nueva_serie.isna()).sum())
        count_validos = int((~nueva_serie.isna() & ~mascara_ia).sum())

        df[col] = nueva_serie

        estadisticas[comp] = {
            "ia": count_ia,
            "nulos": count_nulos,
            "validos": count_validos,
            "total": len(df),
        }

        if count_ia > 0 or count_nulos > 0:
            correcciones.append(
                f"{NOMBRES_COMPONENTES[comp]}: "
                f"{count_validos} válidos, {count_nulos} nulos, {count_ia} IA"
            )

    return df, estadisticas, correcciones


def eliminar_filas_vacias(df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    """Elimina filas completamente vacías."""
    n_antes = len(df)
    df = df.dropna(how="all").reset_index(drop=True)
    return df, n_antes - len(df)


def eliminar_duplicados(df: pd.DataFrame, mapeo: dict) -> tuple[pd.DataFrame, int]:
    """
    Elimina duplicados por número de identificación.
    Conserva el primer registro de cada estudiante.
    """
    col_id = mapeo.get("numero_identificacion")
    if not col_id or col_id not in df.columns:
        return df, 0

    n_antes = len(df)
    df = df.drop_duplicates(subset=[col_id], keep="first").reset_index(drop=True)
    return df, n_antes - len(df)


def limpiar_todo(
    df: pd.DataFrame,
    mapeo: dict,
) -> tuple[pd.DataFrame, dict, dict]:
    """
    Pipeline completo de limpieza.

    Retorna:
      - DataFrame limpio
      - Estadísticas de calidad por componente
      - Reporte de correcciones aplicadas
    """
    reporte = {
        "encabezados": [],
        "categoricos": [],
        "puntajes": [],
        "filas_eliminadas": 0,
        "duplicados_eliminados": 0,
    }

    # 1. Encabezados
    df, corr_enc = limpiar_encabezados(df)
    reporte["encabezados"] = corr_enc

    # 2. Filas vacías
    df, filas_elim = eliminar_filas_vacias(df)
    reporte["filas_eliminadas"] = filas_elim

    # 3. Categoricos
    df, corr_cat = limpiar_categoricos(df, mapeo)
    reporte["categoricos"] = corr_cat

    # 4. Duplicados
    df, dupl_elim = eliminar_duplicados(df, mapeo)
    reporte["duplicados_eliminados"] = dupl_elim

    # 5. Puntajes (sin imputar medianas)
    df, estadisticas, corr_punt = limpiar_puntajes(df, mapeo)
    reporte["puntajes"] = corr_punt

    return df, estadisticas, reporte
