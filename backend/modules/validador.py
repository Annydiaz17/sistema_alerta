# -*- coding: utf-8 -*-
"""
Módulo validador — Verifica estructura y calidad del archivo.
Produce una lista de resultados con severidad: BLOQUEANTE, ADVERTENCIA, INFO.
"""

from __future__ import annotations
import pandas as pd
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from backend.config import (
    COLUMNAS_CRITICAS,
    MIN_COLUMNAS_PUNTAJE,
    ORDEN_COMPONENTES,
    NOMBRES_COMPONENTES,
    VALOR_IA,
)


class Severidad(str, Enum):
    BLOQUEANTE = "bloqueante"
    ADVERTENCIA = "advertencia"
    INFO = "info"


@dataclass
class ResultadoValidacion:
    severidad: Severidad
    codigo: str
    mensaje: str                     # Mensaje técnico (para logs)
    mensaje_usuario: str             # Mensaje en español claro para el usuario
    campo: Optional[str] = None      # Columna o campo afectado
    valor: Optional[str] = None      # Valor problemático, si aplica
    count: int = 0                   # Cuántos registros afectados


@dataclass
class ResumenValidacion:
    bloqueantes: list[ResultadoValidacion] = field(default_factory=list)
    advertencias: list[ResultadoValidacion] = field(default_factory=list)
    infos: list[ResultadoValidacion] = field(default_factory=list)
    procesable: bool = True

    def agregar(self, r: ResultadoValidacion):
        if r.severidad == Severidad.BLOQUEANTE:
            self.bloqueantes.append(r)
            self.procesable = False
        elif r.severidad == Severidad.ADVERTENCIA:
            self.advertencias.append(r)
        else:
            self.infos.append(r)

    def to_dict(self) -> dict:
        return {
            "procesable": self.procesable,
            "bloqueantes": [_rv_to_dict(r) for r in self.bloqueantes],
            "advertencias": [_rv_to_dict(r) for r in self.advertencias],
            "infos": [_rv_to_dict(r) for r in self.infos],
            "total_problemas": len(self.bloqueantes) + len(self.advertencias),
        }


def _rv_to_dict(r: ResultadoValidacion) -> dict:
    return {
        "severidad": r.severidad.value,
        "codigo": r.codigo,
        "mensaje_usuario": r.mensaje_usuario,
        "campo": r.campo,
        "count": r.count,
    }


def validar_archivo(
    df: pd.DataFrame,
    mapeo: dict,
    nombre_hoja: str,
) -> ResumenValidacion:
    """
    Ejecuta todas las reglas de validación sobre el DataFrame y el mapeo.
    Retorna un ResumenValidacion con todos los hallazgos.
    """
    resumen = ResumenValidacion()

    # ── 1. Columnas críticas ────────────────────────────────────────────────
    for col_critica in COLUMNAS_CRITICAS:
        if col_critica not in mapeo:
            resumen.agregar(ResultadoValidacion(
                severidad=Severidad.BLOQUEANTE,
                codigo="COL_CRITICA_AUSENTE",
                mensaje=f"Columna crítica '{col_critica}' no detectada",
                mensaje_usuario=(
                    f"No se encontró la columna de "
                    f"{'número de identificación' if col_critica == 'numero_identificacion' else col_critica} "
                    f"en el archivo. Esta columna es obligatoria para el análisis."
                ),
                campo=col_critica,
            ))

    # ── 2. Columnas de puntajes ─────────────────────────────────────────────
    puntajes_detectados = mapeo.get("_puntajes_detectados", [])
    puntajes_faltantes = [c for c in ORDEN_COMPONENTES if c not in puntajes_detectados]

    if len(puntajes_detectados) < MIN_COLUMNAS_PUNTAJE:
        resumen.agregar(ResultadoValidacion(
            severidad=Severidad.BLOQUEANTE,
            codigo="PUNTAJES_INSUFICIENTES",
            mensaje=f"Solo {len(puntajes_detectados)} columnas de puntaje detectadas",
            mensaje_usuario=(
                f"Se encontraron solo {len(puntajes_detectados)} de 5 módulos de puntaje. "
                f"Se necesitan al menos {MIN_COLUMNAS_PUNTAJE} para generar el diagnóstico."
            ),
        ))
    elif puntajes_faltantes:
        nombres_faltantes = [NOMBRES_COMPONENTES[c] for c in puntajes_faltantes]
        resumen.agregar(ResultadoValidacion(
            severidad=Severidad.ADVERTENCIA,
            codigo="PUNTAJES_PARCIALES",
            mensaje=f"Columnas de puntaje no detectadas: {puntajes_faltantes}",
            mensaje_usuario=(
                f"No se detectaron las columnas de puntaje para: "
                f"{', '.join(nombres_faltantes)}. "
                f"El diagnóstico se generará con los módulos disponibles."
            ),
            count=len(puntajes_faltantes),
        ))

    # Si el archivo no es procesable, no seguir validando
    if not resumen.procesable:
        return resumen

    # ── 3. Filas completamente vacías ───────────────────────────────────────
    filas_vacias = df.isnull().all(axis=1).sum()
    if filas_vacias > 0:
        resumen.agregar(ResultadoValidacion(
            severidad=Severidad.INFO,
            codigo="FILAS_VACIAS",
            mensaje=f"{filas_vacias} filas completamente vacías",
            mensaje_usuario=f"Se encontraron {filas_vacias} fila(s) completamente vacías. Se eliminarán automáticamente.",
            count=int(filas_vacias),
        ))

    # ── 4. Duplicados por número de identificación ──────────────────────────
    col_id = mapeo.get("numero_identificacion")
    if col_id and col_id in df.columns:
        ids_no_nulos = df[col_id].dropna()
        duplicados = int(ids_no_nulos.duplicated().sum())
        if duplicados > 0:
            resumen.agregar(ResultadoValidacion(
                severidad=Severidad.ADVERTENCIA,
                codigo="DUPLICADOS",
                mensaje=f"{duplicados} identificaciones duplicadas",
                mensaje_usuario=(
                    f"Se encontraron {duplicados} número(s) de identificación repetidos. "
                    f"Se conservará solo el primer registro de cada estudiante."
                ),
                campo=col_id,
                count=duplicados,
            ))

    # ── 5. Nulos por componente ─────────────────────────────────────────────
    total_filas = len(df)
    for comp in puntajes_detectados:
        col = mapeo.get(comp)
        if not col or col not in df.columns:
            continue

        # Contar IA (no es nulo, pero no es numérico)
        col_serie = df[col].astype(str).str.strip().str.lower()
        es_ia = col_serie == VALOR_IA
        count_ia = int(es_ia.sum())

        # Nulos reales (excluyendo IA)
        col_num = pd.to_numeric(df.loc[~es_ia, col], errors="coerce")
        count_nulos = int(col_num.isna().sum())
        pct_nulos = (count_nulos + count_ia) / total_filas if total_filas > 0 else 0

        if count_ia > 0 and comp == "comunicacion_escrita":
            resumen.agregar(ResultadoValidacion(
                severidad=Severidad.INFO,
                codigo="VALOR_IA",
                mensaje=f"{count_ia} valores IA en {NOMBRES_COMPONENTES[comp]}",
                mensaje_usuario=(
                    f"Se encontraron {count_ia} estudiante(s) con valor 'IA' "
                    f"(Inhabilitado/Ausente) en {NOMBRES_COMPONENTES[comp]}. "
                    f"Esta es una categoría oficial del ICFES y se excluirá de los cálculos numéricos."
                ),
                campo=col,
                count=count_ia,
            ))
        elif count_ia > 0:
            resumen.agregar(ResultadoValidacion(
                severidad=Severidad.ADVERTENCIA,
                codigo="VALOR_IA_INESPERADO",
                mensaje=f"{count_ia} valores IA en columna inesperada: {col}",
                mensaje_usuario=(
                    f"Se encontraron {count_ia} valor(es) 'IA' en {NOMBRES_COMPONENTES.get(comp, col)}, "
                    f"donde no se esperaba. Se excluirán de los cálculos."
                ),
                campo=col,
                count=count_ia,
            ))

        if count_nulos > 0:
            pct = count_nulos / total_filas * 100
            resumen.agregar(ResultadoValidacion(
                severidad=Severidad.ADVERTENCIA,
                codigo="NULOS_PUNTAJE",
                mensaje=f"{count_nulos} nulos en {col}",
                mensaje_usuario=(
                    f"{count_nulos} de {total_filas} estudiantes ({pct:.1f}%) no tienen puntaje "
                    f"en {NOMBRES_COMPONENTES[comp]}. Esto es normal en Saber Pro: "
                    f"no todos presentan todos los módulos. Se excluirán del cálculo."
                ),
                campo=col,
                count=count_nulos,
            ))

    # ── 6. Columnas de niveles vs puntajes (consistencia) ───────────────────
    niveles_detectados = mapeo.get("_niveles_detectados", [])
    for comp in puntajes_detectados:
        if comp not in niveles_detectados:
            resumen.agregar(ResultadoValidacion(
                severidad=Severidad.INFO,
                codigo="NIVEL_NO_DETECTADO",
                mensaje=f"Columna de nivel no detectada para {comp}",
                mensaje_usuario=(
                    f"No se encontró la columna de nivel de desempeño para "
                    f"{NOMBRES_COMPONENTES[comp]}. "
                    f"El sistema calculará los niveles automáticamente con la tabla ICFES."
                ),
                campo=comp,
            ))

    return resumen
