# -*- coding: utf-8 -*-
"""
SaberAnalítica — Configuración central.
Todos los umbrales ICFES y constantes del sistema son editables aquí.
"""

# ──────────────────────────────────────────────────────────────────────────────
# RANGOS OFICIALES ICFES (Niveles de desempeño por componente)
# Formato: (puntaje_min_inclusive, puntaje_max_inclusive, nivel)
# ──────────────────────────────────────────────────────────────────────────────
RANGOS_NIVELES = {
    "razonamiento_cuantitativo": [
        (0, 125, 1), (126, 153, 2), (154, 202, 3), (203, 300, 4)
    ],
    "lectura_critica": [
        (0, 124, 1), (125, 157, 2), (158, 199, 3), (200, 300, 4)
    ],
    "competencias_ciudadanas": [
        (0, 124, 1), (125, 156, 2), (157, 199, 3), (200, 300, 4)
    ],
    "ingles": [
        (0, 120, 1), (121, 164, 2), (165, 195, 3), (196, 300, 4)
    ],
    "comunicacion_escrita": [
        (0, 115, 1), (116, 149, 2), (150, 183, 3), (184, 300, 4)
    ],
}

# Nombres legibles para mostrar en la interfaz
NOMBRES_COMPONENTES = {
    "razonamiento_cuantitativo": "Razonamiento Cuantitativo",
    "lectura_critica": "Lectura Crítica",
    "competencias_ciudadanas": "Competencias Ciudadanas",
    "ingles": "Inglés",
    "comunicacion_escrita": "Comunicación Escrita",
}

# Colores asociados a cada componente (usados en el frontend)
COLORES_COMPONENTES = {
    "razonamiento_cuantitativo": "#8b5cf6",
    "lectura_critica": "#3b82f6",
    "competencias_ciudadanas": "#f59e0b",
    "ingles": "#10b981",
    "comunicacion_escrita": "#f43f5e",
}

# Orden oficial de los componentes
ORDEN_COMPONENTES = [
    "razonamiento_cuantitativo",
    "lectura_critica",
    "competencias_ciudadanas",
    "ingles",
    "comunicacion_escrita",
]

# ──────────────────────────────────────────────────────────────────────────────
# COLUMNAS CRÍTICAS (su ausencia bloquea el procesamiento)
# ──────────────────────────────────────────────────────────────────────────────
COLUMNAS_CRITICAS = ["numero_identificacion", "programa"]

# Mínimo de columnas de puntaje para que el archivo sea procesable
MIN_COLUMNAS_PUNTAJE = 3

# ──────────────────────────────────────────────────────────────────────────────
# ALIASES PARA DETECCIÓN DE COLUMNAS
# Todos los textos en minúsculas sin tildes (se normaliza antes de comparar)
# ──────────────────────────────────────────────────────────────────────────────
COLUMN_ALIASES: dict[str, list[str]] = {
    "numero_identificacion": [
        "numero de identificacion",
        "num identificacion",
        "numero identificacion",
        "identificacion",
        "id estudiante",
        "cedula",
        "documento",
        "cod estudiante",
        "codigo estudiante",
        "no identificacion",
    ],
    "programa": [
        "programa",
        "programa:",
        "carrera",
        "facultad",
        "programa academico",
    ],
    "jornada": [
        "jornada",
        "jornada:",
        "turno",
        "modalidad",
    ],
    "razonamiento_cuantitativo": [
        "razonamiento cuantitativo puntaje",
        "razonamiento cuantitativo",
        "razonamiento cuan puntaje",
        "razon cuantitativo puntaje",
    ],
    "lectura_critica": [
        "lectura critica puntaje",
        "lectura critica",
    ],
    "competencias_ciudadanas": [
        "competencias ciudadanas puntaje",
        "competencias ciudadanas",
        "comp ciudadanas puntaje",
    ],
    "ingles": [
        "ingles puntaje",
        "ingles",
        "english puntaje",
        "idioma puntaje",
    ],
    "comunicacion_escrita": [
        "comunicacion escrita puntaje",
        "comunicacion escrita",
        "com escrita puntaje",
    ],
    "puntaje_total": [
        "puntaje total",
        "total",
        "promedio total",
        "puntaje global",
        "score total",
    ],
    "nivel_razonamiento_cuantitativo": [
        "nivel de desempeno razonamiento cuantitativo",
        "nivel desempeno razonamiento cuantitativo",
        "nivel razonamiento cuantitativo",
    ],
    "nivel_lectura_critica": [
        "nivel de desempeno lectura critica",
        "nivel desempeno lectura critica",
        "nivel lectura critica",
    ],
    "nivel_competencias_ciudadanas": [
        "nivel de desempeno competencias ciudadanas",
        "nivel desempeno competencias ciudadanas",
        "nivel competencias ciudadanas",
    ],
    "nivel_ingles": [
        "nivel de desempeno ingles",
        "nivel desempeno ingles",
        "nivel ingles",
    ],
    "nivel_comunicacion_escrita": [
        "nivel de desempeno comunicacion escrita",
        "nivel desempeno comunicacion escrita",
        "nivel comunicacion escrita",
    ],
}

# ──────────────────────────────────────────────────────────────────────────────
# VALOR ESPECIAL IA
# ──────────────────────────────────────────────────────────────────────────────
# "IA" = Inhabilitado o Ausente. Es una categoría válida del ICFES.
# Se aplica al módulo de Comunicación Escrita pero puede aparecer en otros.
VALOR_IA = "ia"  # Comparar siempre en minúsculas

# ──────────────────────────────────────────────────────────────────────────────
# UMBRALES DE CONFIANZA DEL DIAGNÓSTICO
# ──────────────────────────────────────────────────────────────────────────────
UMBRAL_CONFIANZA_ALTO = 0.10   # Promedio de nulos < 10% → Alto
UMBRAL_CONFIANZA_MEDIO = 0.25  # Promedio de nulos 10%-25% → Medio; >25% → Bajo

# ──────────────────────────────────────────────────────────────────────────────
# UMBRALES PARA FORTALEZAS Y BRECHAS
# ──────────────────────────────────────────────────────────────────────────────
UMBRAL_FORTALEZA_PCT = 0.50   # ≥ 50% en Nivel 3+4 → fortaleza
UMBRAL_BRECHA_PCT = 0.30      # ≥ 30% en Nivel 1 → brecha
UMBRAL_DIFERENCIA_PROG = 15   # Diferencia > 15 pts entre programas → insight
UMBRAL_DIFERENCIA_JORN = 20   # Diferencia > 20 pts entre jornadas → insight

# ──────────────────────────────────────────────────────────────────────────────
# ALERTAS MULTICRITERIO
# ──────────────────────────────────────────────────────────────────────────────
UMBRAL_PUNTAJE_MODULO_BAJO = 120   # Puntaje de cualquier módulo < 120 → alerta
UMBRAL_PUNTAJE_TOTAL_BAJO = 130    # Promedio total del estudiante < 130 → alerta

# ──────────────────────────────────────────────────────────────────────────────
# CONFIGURACIÓN DEL SERVIDOR
# ──────────────────────────────────────────────────────────────────────────────
MAX_FILE_SIZE_MB = 10
ALLOWED_EXTENSIONS = [".xlsx", ".xls"]

# Score mínimo de columnas detectadas para aceptar una hoja (0.0 - 1.0)
# Si la hoja tiene ≥ 60% de las columnas esperadas, se la considera válida
MIN_SHEET_COLUMN_SCORE = 0.60
