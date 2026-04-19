# -*- coding: utf-8 -*-
"""
SaberAnalítica — Backend principal (FastAPI)
Rutas REST para el procesamiento de archivos Saber Pro.
"""

from __future__ import annotations
import io
import json
import logging
from datetime import datetime
from typing import Optional
import mimetypes

# Fix para contenedores Docker "slim" que no traen /etc/mime.types
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("image/svg+xml", ".svg")

from fastapi import FastAPI, File, UploadFile, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from backend.config import MAX_FILE_SIZE_MB, ALLOWED_EXTENSIONS, NOMBRES_COMPONENTES, COLORES_COMPONENTES
from backend.modules.detector import detectar_hoja_principal, construir_mapeo_completo
from backend.modules.validador import validar_archivo, Severidad
from backend.modules.limpiador import limpiar_todo
from backend.modules.transformador import transformar
from backend.modules.motor_diagnostico import generar_diagnostico
from backend.utils.exportador_excel import exportar_excel
from backend.utils.exportador_pdf import exportar_pdf

# ──────────────────────────────────────────────────────────────────────────────
# Configuración de logging (sin datos personales)
# ──────────────────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("saberanalytica")

# ──────────────────────────────────────────────────────────────────────────────
# Aplicación FastAPI
# ──────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="SaberAnalítica API",
    description="Sistema de diagnóstico inteligente para resultados Saber Pro",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url=None,
)

# CORS — permite al frontend (en cualquier origen en desarrollo) llamar a la API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, restringir al dominio del frontend
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────────────────────────────────────
# Almacenamiento en memoria para la sesión actual
# (En Fase 2, se reemplaza por Firestore + Firebase Storage)
# ──────────────────────────────────────────────────────────────────────────────
_sesiones: dict = {}   # {session_id: {resultado_completo}}


def _nueva_session_id() -> str:
    from uuid import uuid4
    return str(uuid4())


def _validar_extension(nombre: str) -> bool:
    return any(nombre.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS)


def _serializar_resultado(modelo: dict, diagnostico: dict, resumen_val: dict, nombre_archivo: str) -> dict:
    """
    Construye el JSON final que se envía al frontend.
    Excluye el DataFrame (no serializable).
    """
    meta = modelo.get("meta", {})
    return {
        "procesable": True,          # ← CRÍTICO: siempre presente para que el frontend lo valide
        "archivo": nombre_archivo,
        "fecha_procesamiento": datetime.now().isoformat(),
        "meta": meta,
        "validacion": resumen_val,
        "calidad": diagnostico.get("calidad", {}),
        "puntaje_total_global": modelo.get("puntaje_total_global", {}),
        "componentes": modelo.get("componentes", {}),
        "por_programa": modelo.get("por_programa", {}),
        "por_jornada": modelo.get("por_jornada", {}),
        "alertas_criticas": modelo.get("alertas_criticas", []),
        "diagnostico": {
            "confianza": diagnostico.get("confianza", {}),
            "fortalezas": diagnostico.get("fortalezas", []),
            "brechas": diagnostico.get("brechas", []),
            "insights": diagnostico.get("insights", []),
            "recomendaciones": diagnostico.get("recomendaciones", []),
        },
        "config": {
            "componentes_info": {
                k: {"nombre": v, "color": COLORES_COMPONENTES.get(k, "#6366f1")}
                for k, v in NOMBRES_COMPONENTES.items()
            }
        },
    }


# ──────────────────────────────────────────────────────────────────────────────
# RUTAS
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    """Endpoint de salud. Usado para verificar que el backend está activo."""
    return {"status": "ok", "version": "1.0.0", "sistema": "SaberAnalítica"}


@app.post("/api/procesar")
async def procesar_archivo(archivo: UploadFile = File(...)):
    """
    Endpoint principal: recibe el Excel, lo procesa y retorna el diagnóstico completo.

    Flujo:
      1. Validar extensión y tamaño
      2. Detectar hoja principal
      3. Validar estructura
      4. Limpiar datos
      5. Transformar al modelo interno
      6. Generar diagnóstico
      7. Retornar JSON + session_id para exportaciones
    """
    # ── Validaciones previas ──────────────────────────────────────────────
    if not _validar_extension(archivo.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "mensaje_usuario": (
                    f"El archivo '{archivo.filename}' no tiene un formato válido. "
                    f"Solo se aceptan archivos .xlsx o .xls."
                ),
                "codigo": "EXTENSION_INVALIDA",
            }
        )

    contenido = await archivo.read()
    tamaño_mb = len(contenido) / (1024 * 1024)

    if tamaño_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={
                "mensaje_usuario": (
                    f"El archivo pesa {tamaño_mb:.1f} MB, "
                    f"pero el máximo permitido es {MAX_FILE_SIZE_MB} MB."
                ),
                "codigo": "ARCHIVO_MUY_GRANDE",
            }
        )

    logger.info(f"Procesando archivo: {archivo.filename[:50]} | {tamaño_mb:.2f} MB")

    # ── Pipeline de procesamiento ─────────────────────────────────────────
    buffer = io.BytesIO(contenido)

    try:
        # 1. Detectar hoja
        df_raw, mapeo_inicial, nombre_hoja = detectar_hoja_principal(buffer)
        mapeo = construir_mapeo_completo(mapeo_inicial)
        logger.info(f"Hoja detectada: '{nombre_hoja}' | Columnas mapeadas: {len(mapeo)}")

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"mensaje_usuario": str(e), "codigo": "HOJA_NO_DETECTADA"}
        )

    # 2. Validar
    resumen_val = validar_archivo(df_raw, mapeo, nombre_hoja)

    if not resumen_val.procesable:
        logger.warning(f"Archivo bloqueado: {[b.codigo for b in resumen_val.bloqueantes]}")
        return JSONResponse(
            status_code=422,
            content={
                "procesable": False,
                "validacion": resumen_val.to_dict(),
                "mensaje_usuario": (
                    "El archivo no puede procesarse porque le falta información clave. "
                    "Revisa los errores indicados y sube una versión corregida."
                ),
            }
        )

    try:
        # 3. Limpiar
        df_limpio, estadisticas_limp, reporte_limp = limpiar_todo(df_raw.copy(), mapeo)
        logger.info(f"Limpieza completada: {reporte_limp.get('filas_eliminadas', 0)} filas eliminadas")

        # 4. Transformar
        modelo = transformar(df_limpio, mapeo, estadisticas_limp)

        # 5. Diagnóstico
        advertencias_count = len(resumen_val.advertencias)
        diagnostico = generar_diagnostico(modelo, advertencias_count)

    except Exception as e:
        logger.error(f"Error en pipeline de procesamiento: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "procesable": False,
                "mensaje_usuario": (
                    f"Ocurrió un error interno al procesar el archivo. "
                    f"Detalle técnico: {str(e)[:200]}"
                ),
                "validacion": {"procesable": False, "bloqueantes": [
                    {"severidad": "bloqueante", "codigo": "ERROR_INTERNO",
                     "mensaje_usuario": str(e)[:300], "campo": None, "count": 0}
                ], "advertencias": [], "infos": [], "total_problemas": 1},
            }
        )

    # 6. Guardar sesión (para exportaciones posteriores)
    session_id = _nueva_session_id()
    _sesiones[session_id] = {
        "modelo": modelo,
        "diagnostico": diagnostico,
        "nombre_archivo": archivo.filename,
    }
    # Limpiar sesiones antiguas (máx 10 en memoria)
    if len(_sesiones) > 10:
        oldest = next(iter(_sesiones))
        del _sesiones[oldest]

    # 7. Serializar y responder
    resultado = _serializar_resultado(modelo, diagnostico, resumen_val.to_dict(), archivo.filename)
    resultado["session_id"] = session_id

    logger.info(f"Procesamiento exitoso. Estudiantes: {modelo['meta']['total_estudiantes']}")
    return JSONResponse(content=resultado)


@app.get("/api/exportar/excel/{session_id}")
def exportar_excel_endpoint(session_id: str):
    """Genera y descarga el Excel de resultados de la sesión indicada."""
    sesion = _sesiones.get(session_id)
    if not sesion:
        raise HTTPException(
            status_code=404,
            detail={"mensaje_usuario": "Sesión no encontrada. Por favor, vuelve a procesar el archivo."}
        )

    try:
        datos = exportar_excel(sesion["modelo"], sesion["diagnostico"])
        nombre = f"diagnostico_saber_pro_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
        return StreamingResponse(
            io.BytesIO(datos),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={nombre}"}
        )
    except Exception as e:
        logger.error(f"Error al exportar Excel: {e}")
        raise HTTPException(status_code=500, detail={"mensaje_usuario": "Error al generar el Excel."})


@app.get("/api/exportar/pdf/{session_id}")
def exportar_pdf_endpoint(session_id: str):
    """Genera y descarga el PDF del diagnóstico de la sesión indicada."""
    sesion = _sesiones.get(session_id)
    if not sesion:
        raise HTTPException(
            status_code=404,
            detail={"mensaje_usuario": "Sesión no encontrada. Por favor, vuelve a procesar el archivo."}
        )

    try:
        datos = exportar_pdf(sesion["modelo"], sesion["diagnostico"])
        nombre = f"diagnostico_saber_pro_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
        return StreamingResponse(
            io.BytesIO(datos),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={nombre}"}
        )
    except Exception as e:
        logger.error(f"Error al exportar PDF: {e}")
        raise HTTPException(status_code=500, detail={"mensaje_usuario": "Error al generar el PDF."})


@app.get("/api/plantilla")
def descargar_plantilla():
    """Descarga la plantilla de referencia Excel."""
    import os
    ruta = os.path.join(os.path.dirname(__file__), "..", "frontend", "assets", "plantilla_saber_pro.xlsx")
    if os.path.exists(ruta):
        return FileResponse(ruta, filename="plantilla_saber_pro.xlsx")

    # Si no existe el archivo físico, generar uno mínimo
    datos = _generar_plantilla_minima()
    return StreamingResponse(
        io.BytesIO(datos),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=plantilla_saber_pro.xlsx"}
    )


def _generar_plantilla_minima() -> bytes:
    """Genera una plantilla Excel básica con las columnas requeridas."""
    import xlsxwriter
    output = io.BytesIO()
    wb = xlsxwriter.Workbook(output, {"in_memory": True})
    ws = wb.add_worksheet("Datos")

    fmt_h = wb.add_format({
        "bold": True, "bg_color": "#1e3a5f", "font_color": "white",
        "border": 1, "align": "center", "text_wrap": True
    })
    fmt_e = wb.add_format({"bg_color": "#dbeafe", "border": 1, "italic": True, "font_color": "#64748b"})

    columnas = [
        "Número de identificación", "Programa", "Jornada",
        "Razonamiento Cuantitativo Puntaje", "Lectura Crítica Puntaje",
        "Competencias Ciudadanas Puntaje", "Inglés Puntaje",
        "Comunicación Escrita Puntaje", "Puntaje total",
        "Nivel de desempeño Razonamiento Cuantitativo",
        "Nivel de desempeño Lectura Crítica",
        "Nivel de desempeño Competencias Ciudadanas",
        "Nivel de desempeño Inglés",
        "Nivel de desempeño Comunicación Escrita",
    ]

    ws.set_row(0, 40)
    for i, col in enumerate(columnas):
        ws.write(0, i, col, fmt_h)
        ws.set_column(i, i, max(len(col) // 2, 12))

    # Fila de ejemplo
    ejemplo = [
        "1234567890", "Gestión Empresarial", "Diurno",
        158, 162, 155, 145, "IA", "",
        "Nivel 3", "Nivel 3", "Nivel 2", "Nivel 2", "IA"
    ]
    for i, val in enumerate(ejemplo):
        ws.write(1, i, val, fmt_e)

    wb.close()
    return output.getvalue()


# ──────────────────────────────────────────────────────────────────────────────
# Servir el frontend estático desde / (solo en desarrollo local)
# En producción, Firebase Hosting sirve el frontend directamente.
# ──────────────────────────────────────────────────────────────────────────────
import os
_serve_frontend = os.environ.get("SERVE_FRONTEND", "true").lower() == "true"
frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
if _serve_frontend and os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

