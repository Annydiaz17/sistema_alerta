/**
 * SaberAnalítica — Página de historial de cargas (historial.js)
 */

const pageHistorial = {
  _KEY: 'sa_historial',

  render() {
    const items = this._cargar();
    return `
      <div class="page">
        <div class="container" style="max-width: 800px;">
          <div class="flex-between mb-8 anim-fadeInUp">
            <div>
              <h1 style="color: var(--primary-700);">Historial de análisis</h1>
              <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.25rem;">
                Archivos procesados en esta sesión del navegador
              </p>
            </div>
            ${items.length > 0 ? `
              <button class="btn btn-ghost btn-sm" onclick="pageHistorial.limpiar()">
                🗑️ Limpiar historial
              </button>
            ` : ''}
          </div>

          <div id="historial-lista" class="anim-fadeInUp anim-delay-100">
            ${items.length === 0
              ? this._renderVacio()
              : items.reverse().map((item, i) => this._renderItem(item, i)).join('')
            }
          </div>
        </div>
      </div>
    `;
  },

  _renderVacio() {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <h3>Sin archivos analizados aún</h3>
        <p>Cuando proceses un archivo Excel, aparecerá aquí para que puedas volver a verlo.</p>
        <button class="btn btn-primary" onclick="app.navigate('upload')">
          📤 Cargar mi primer archivo
        </button>
      </div>
    `;
  },

  _renderItem(item, idx) {
    const fecha = new Date(item.fecha).toLocaleString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    const confianzaClass = item.confianza === 'Alto' ? 'badge-ok'
      : item.confianza === 'Medio' ? 'badge-warn' : 'badge-error';

    return `
      <div class="historial-item anim-fadeInUp" style="animation-delay: ${idx * 60}ms;"
           onclick="pageHistorial.verResultado(${idx})">
        <div class="historial-icon">📊</div>
        <div class="historial-info">
          <div class="historial-nombre">${item.nombre}</div>
          <div class="historial-meta">
            ${fecha} · ${item.estudiantes} estudiantes · ${item.programas} programa(s)
          </div>
        </div>
        <span class="badge ${confianzaClass}">${item.confianza || 'N/D'}</span>
        <span style="color: var(--text-muted); font-size: 1.2rem;">›</span>
      </div>
    `;
  },

  verResultado(idxReverso) {
    const items = this._cargar();
    const item = items.reverse()[idxReverso];
    if (!item?.resultado) {
      ui.toast('No se encontraron los datos de este análisis. Por favor, sube el archivo nuevamente.', 'warn');
      return;
    }
    app.estado.resultado = item.resultado;
    app.estado.sessionId = item.resultado.session_id;
    app.navigate('dashboard');
  },

  guardar(item) {
    const items = this._cargar();
    // Mantener máximo 15 registros
    if (items.length >= 15) items.shift();
    items.push(item);
    try {
      sessionStorage.setItem(this._KEY, JSON.stringify(items));
    } catch { /* sessionStorage puede estar deshabilitado */ }
  },

  _cargar() {
    try {
      return JSON.parse(sessionStorage.getItem(this._KEY) || '[]');
    } catch {
      return [];
    }
  },

  limpiar() {
    sessionStorage.removeItem(this._KEY);
    const lista = document.getElementById('historial-lista');
    if (lista) lista.innerHTML = this._renderVacio();
    ui.toast('Historial limpiado.', 'ok');
  }
};
