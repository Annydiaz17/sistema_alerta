/**
 * SaberAnalítica — Capa de comunicación con el backend (api.js)
 * Toda llamada HTTP pasa por aquí. Maneja errores y mensajes en español.
 */

// En desarrollo local → http://localhost:8000
// En producción Firebase → '' (rutas relativas; Firebase Hosting reescribe /api/** a Cloud Run)
const API_BASE = (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
) ? 'http://localhost:8000' : '';


const api = {
  /**
   * Procesa un archivo Excel y retorna el diagnóstico completo.
   * @param {File} file
   * @returns {Promise<Object>}
   */
  async procesarArchivo(file) {
    const formData = new FormData();
    formData.append('archivo', file);

    const response = await fetch(`${API_BASE}/api/procesar`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data?.detail?.mensaje_usuario
        || data?.mensaje_usuario
        || 'Ocurrió un error inesperado al procesar el archivo.';
      throw new ApiError(msg, response.status, data?.detail?.codigo);
    }

    return data;
  },

  /**
   * Descarga el Excel de resultados de la sesión actual.
   * @param {string} sessionId
   */
  async descargarExcel(sessionId) {
    const response = await fetch(`${API_BASE}/api/exportar/excel/${sessionId}`);
    if (!response.ok) {
      throw new ApiError('No se pudo descargar el Excel. Intenta procesar el archivo nuevamente.');
    }
    const blob = await response.blob();
    _descargarBlob(blob, `diagnostico_saber_pro_${_fechaHoy()}.xlsx`);
  },

  /**
   * Descarga el PDF de resultados de la sesión actual.
   * @param {string} sessionId
   */
  async descargarPDF(sessionId) {
    const response = await fetch(`${API_BASE}/api/exportar/pdf/${sessionId}`);
    if (!response.ok) {
      throw new ApiError('No se pudo generar el PDF. Intenta procesar el archivo nuevamente.');
    }
    const blob = await response.blob();
    _descargarBlob(blob, `diagnostico_saber_pro_${_fechaHoy()}.pdf`);
  },

  /**
   * Descarga la plantilla de referencia Excel.
   */
  async descargarPlantilla() {
    const response = await fetch(`${API_BASE}/api/plantilla`);
    if (!response.ok) throw new ApiError('No se pudo descargar la plantilla.');
    const blob = await response.blob();
    _descargarBlob(blob, 'plantilla_saber_pro.xlsx');
  },

  /**
   * Verifica que el backend esté disponible.
   * @returns {Promise<boolean>}
   */
  async verificarSalud() {
    try {
      const response = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(3000) });
      return response.ok;
    } catch {
      return false;
    }
  },

  /**
   * Descarga un archivo genérico del backend.
   * @param {string} ruta — ruta relativa del endpoint (ej: /api/exportar/excel-alertas/123)
   * @param {string} nombre — nombre para el archivo descargado
   */
  async descargarArchivo(ruta, nombre) {
    const response = await fetch(`${API_BASE}${ruta}`);
    if (!response.ok) {
      throw new ApiError('No se pudo descargar el archivo. Intenta de nuevo.');
    }
    const blob = await response.blob();
    _descargarBlob(blob, nombre);
  },
};

class ApiError extends Error {
  constructor(mensaje, status = 0, codigo = null) {
    super(mensaje);
    this.name = 'ApiError';
    this.status = status;
    this.codigo = codigo;
  }
}

function _descargarBlob(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

function _fechaHoy() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}
