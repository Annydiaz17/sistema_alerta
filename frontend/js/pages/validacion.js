/**
 * SaberAnalítica — Pantalla de validación y carga (validacion.js)
 * Muestra el progreso de procesamiento y el semáforo de calidad.
 */

const pageValidacion = {
  _pasos: [
    { id: 'detectar',    texto: 'Identificando hoja y columnas...' },
    { id: 'validar',     texto: 'Validando estructura del archivo...' },
    { id: 'limpiar',     texto: 'Limpiando y normalizando datos...' },
    { id: 'transformar', texto: 'Construyendo modelo de análisis...' },
    { id: 'diagnostico', texto: 'Generando diagnóstico automático...' },
  ],

  render() {
    return `
      <div class="page">
        <div class="container validacion-page" id="validacion-contenido">
          <div class="loading-screen" id="pantalla-cargando">
            <div class="spinner"></div>
            <div class="loading-text" id="loading-texto">Procesando tu archivo...</div>
            <div class="loading-sub">Este proceso tarda unos segundos</div>
            <div class="loading-steps" id="loading-pasos">
              ${this._pasos.map((p, i) => `
                <div class="loading-step" id="paso-${p.id}">
                  <div class="step-indicator">${i + 1}</div>
                  <span>${p.texto}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Resultado de validación (oculto hasta completar) -->
          <div class="hidden" id="resultado-validacion"></div>
        </div>
      </div>
    `;
  },

  async afterRender(params) {
    const archivo = params?.archivo || app.estado.archivoActual;
    if (!archivo) {
      app.navigate('upload');
      return;
    }
    await this._procesar(archivo);
  },

  _activarPaso(id) {
    this._pasos.forEach(p => {
      const el = document.getElementById(`paso-${p.id}`);
      if (!el) return;
      if (p.id === id) {
        el.className = 'loading-step active';
        el.querySelector('.step-indicator').textContent = '●';
      } else if (this._pasos.indexOf(p) < this._pasos.findIndex(x => x.id === id)) {
        el.className = 'loading-step done';
        el.querySelector('.step-indicator').textContent = '✓';
      }
    });
  },

  async _procesar(archivo) {
    const delay = ms => new Promise(r => setTimeout(r, ms));

    // Simular pasos visuales mientras el backend trabaja
    this._activarPaso('detectar');
    await delay(400);
    this._activarPaso('validar');
    await delay(300);
    this._activarPaso('limpiar');

    try {
      const resultado = await api.procesarArchivo(archivo);
      this._activarPaso('transformar');
      await delay(300);
      this._activarPaso('diagnostico');
      await delay(400);

      // IMPORTANTE: usar === false para no confundir undefined (éxito) con false (bloqueado)
      if (resultado.procesable === false) {
        this._mostrarBloqueado(resultado.validacion);
        return;
      }

      // Guardar resultado en estado global
      app.estado.resultado = resultado;
      app.estado.sessionId = resultado.session_id;

      // Guardar en historial
      pageHistorial.guardar({
        nombre: archivo.name,
        fecha: new Date().toISOString(),
        estudiantes: resultado.meta?.total_estudiantes,
        programas: resultado.meta?.programas?.length,
        confianza: resultado.diagnostico?.confianza?.nivel,
        resultado,
      });

      // Mostrar pantalla de calidad antes de ir al dashboard
      this._mostrarCalidad(resultado, archivo.name);

    } catch (e) {
      this._mostrarError(e.message || 'Error inesperado al procesar el archivo.');
    }
  },

  _mostrarBloqueado(validacion) {
    const el = document.getElementById('resultado-validacion');
    const cargando = document.getElementById('pantalla-cargando');
    if (cargando) cargando.classList.add('hidden');
    if (!el) return;

    const bloqueantes = validacion.bloqueantes || [];
    el.classList.remove('hidden');
    el.innerHTML = `
      <div class="semaforo-header error">
        <div class="semaforo-icon">🚫</div>
        <div>
          <div class="semaforo-title">El archivo no se puede procesar</div>
          <div class="semaforo-sub">Se encontraron ${bloqueantes.length} problema(s) que impiden el análisis. Por favor corrígelos y vuelve a intentarlo.</div>
        </div>
      </div>

      <h3 style="margin-bottom: 1rem; color: var(--error);">Problemas encontrados</h3>
      <div class="val-list">
        ${bloqueantes.map(b => `
          <div class="val-item bloqueante">
            <span class="val-item-icon">❌</span>
            <div>
              <div class="val-item-msg">${b.mensaje_usuario}</div>
              ${b.campo ? `<span class="val-item-campo">Campo: ${b.campo}</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>

      <div class="flex gap-4 mt-8">
        <button class="btn btn-primary" onclick="app.navigate('upload')">
          📤 Subir otro archivo
        </button>
        <button class="btn btn-ghost" onclick="api.descargarPlantilla().catch(() => {})">
          📥 Descargar plantilla de referencia
        </button>
      </div>
    `;
  },

  _mostrarCalidad(resultado, nombreArchivo) {
    const el = document.getElementById('resultado-validacion');
    const cargando = document.getElementById('pantalla-cargando');
    if (cargando) cargando.classList.add('hidden');
    if (!el) return;

    const validacion = resultado.validacion || {};
    const meta = resultado.meta || {};
    const confianza = resultado.diagnostico?.confianza || {};
    const advertencias = validacion.advertencias || [];
    const infos = validacion.infos || [];

    const tipoSemaforo = advertencias.length === 0 ? 'ok' :
                         advertencias.length <= 3 ? 'warn' : 'warn';
    const iconoSemaforo = tipoSemaforo === 'ok' ? '✅' : '⚠️';
    const textoSemaforo = tipoSemaforo === 'ok'
      ? 'Archivo listo para analizar'
      : `Archivo con ${advertencias.length} advertencia(s) — se puede procesar`;

    el.classList.remove('hidden');
    el.innerHTML = `
      <!-- Semáforo -->
      <div class="semaforo-header ${tipoSemaforo} anim-fadeIn">
        <div class="semaforo-icon">${iconoSemaforo}</div>
        <div>
          <div class="semaforo-title">${textoSemaforo}</div>
          <div class="semaforo-sub">${nombreArchivo} · ${meta.total_estudiantes} estudiantes · ${meta.programas?.length} programa(s)</div>
        </div>
      </div>

      <!-- Resumen rápido -->
      <div class="grid-4 mb-6" style="gap: 1rem;">
        ${this._kpiMini('👥', meta.total_estudiantes, 'Estudiantes')}
        ${this._kpiMini('🏫', meta.programas?.length, 'Programas')}
        ${this._kpiMini('🕐', meta.jornadas?.length, 'Jornadas')}
        ${this._kpiMini('🎯', confianza.nivel, 'Confianza')}
      </div>

      <!-- Correcciones automáticas -->
      ${infos.length > 0 ? `
        <h4 style="margin-bottom: 0.75rem; color: var(--info);">✅ Correcciones automáticas aplicadas</h4>
        <div class="val-list mb-6">
          ${infos.map(i => `
            <div class="val-item info">
              <span class="val-item-icon">ℹ️</span>
              <div class="val-item-msg">${i.mensaje_usuario}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Advertencias -->
      ${advertencias.length > 0 ? `
        <h4 style="margin-bottom: 0.75rem; color: var(--warn);">⚠️ Advertencias (el análisis continúa)</h4>
        <div class="val-list mb-6">
          ${advertencias.map(a => `
            <div class="val-item advertencia">
              <span class="val-item-icon">⚠️</span>
              <div>
                <div class="val-item-msg">${a.mensaje_usuario}</div>
                ${a.campo ? `<span class="val-item-campo">Campo: ${a.campo}</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Confianza -->
      <div class="confianza-banner ${confianza.nivel} mt-4 mb-8">
        <div class="confianza-banner-icon">${confianza.nivel === 'Alto' ? '💪' : confianza.nivel === 'Medio' ? '📊' : '⚠️'}</div>
        <div class="confianza-banner-body">
          <h4>Nivel de confianza del diagnóstico: <span class="confianza-badge ${confianza.nivel}" style="font-size:0.85rem;">${confianza.nivel}</span></h4>
          <p>${confianza.explicacion || ''}</p>
        </div>
      </div>

      <!-- Acciones -->
      <div class="flex gap-4" style="flex-wrap: wrap;">
        <button class="btn btn-primary btn-lg" id="btn-ver-dashboard" onclick="app.navigate('dashboard')">
          📊 Ver dashboard completo ➜
        </button>
        <button class="btn btn-ghost" onclick="app.navigate('upload')">
          ← Cargar otro archivo
        </button>
      </div>
    `;
  },

  _kpiMini(icon, valor, label) {
    return `
      <div class="card card-sm text-center" style="border-radius: var(--radius-md);">
        <div style="font-size: 1.4rem; margin-bottom: 0.25rem;">${icon}</div>
        <div style="font-size: 1.4rem; font-weight: 800; color: var(--primary-700);">${valor ?? '-'}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">${label}</div>
      </div>
    `;
  },

  _mostrarError(mensaje) {
    const el = document.getElementById('resultado-validacion');
    const cargando = document.getElementById('pantalla-cargando');
    if (cargando) cargando.classList.add('hidden');
    if (!el) return;

    el.classList.remove('hidden');
    el.innerHTML = `
      <div class="semaforo-header error">
        <div class="semaforo-icon">❌</div>
        <div>
          <div class="semaforo-title">Error al procesar el archivo</div>
          <div class="semaforo-sub">${mensaje}</div>
        </div>
      </div>
      <div class="flex gap-4 mt-6">
        <button class="btn btn-primary" onclick="app.navigate('upload')">
          📤 Intentar con otro archivo
        </button>
      </div>
    `;
  }
};
