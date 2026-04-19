/**
 * SaberAnalítica — Router y estado global (app.js)
 * Punto de entrada de la SPA.
 */

// ─── Estado global ─────────────────────────────────────────────────────────
const app = {
  estado: {
    paginaActual: 'landing',
    resultado: null,
    sessionId: null,
    archivoActual: null,
  },

  _paginas: {
    landing:    { modulo: pageLanding,    titulo: 'Inicio',             navbar: false },
    upload:     { modulo: pageUpload,     titulo: 'Cargar archivo',      navbar: false },
    validacion: { modulo: pageValidacion, titulo: 'Validando...',        navbar: false },
    dashboard:  { modulo: pageDashboard,  titulo: 'Dashboard',           navbar: true  },
    historial:  { modulo: pageHistorial,  titulo: 'Historial',           navbar: false },
  },

  /**
   * Navega a una página. `params` es un objeto opcional de parámetros.
   */
  navigate(pagina, params = {}) {
    if (!this._paginas[pagina]) {
      console.warn(`SaberAnalítica: página desconocida '${pagina}'`);
      return;
    }

    // Destruir todos los gráficos al cambiar de página
    charts.destroyAll();

    this.estado.paginaActual = pagina;

    const config   = this._paginas[pagina];
    const root     = document.getElementById('app-root');
    const modulo   = config.modulo;

    // Actualizar el título del documento
    document.title = `SaberAnalítica — ${config.titulo}`;

    // Renderizar la página
    root.innerHTML = modulo.render(params);

    // Ejecutar post-render si el módulo lo tiene
    if (typeof modulo.afterRender === 'function') {
      modulo.afterRender(params);
    }

    // Actualizar navbar
    this._actualizarNavbar(pagina);

    // Scroll al inicio
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  _actualizarNavbar(paginaActual) {
    // Activar/desactivar clase activa en los links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });

    const mapNavLink = {
      'landing':   'nav-inicio',
      'upload':    'nav-cargar',
      'dashboard': 'nav-dashboard',
      'historial': 'nav-historial',
    };

    const linkId = mapNavLink[paginaActual];
    if (linkId) {
      const el = document.getElementById(linkId);
      if (el) el.classList.add('active');
    }

    // Mostrar/ocultar el botón "Nuevo archivo" y link de dashboard
    const btnNuevo = document.getElementById('btn-nuevo-archivo');
    const navDash  = document.getElementById('nav-dashboard');

    if (this.estado.resultado) {
      if (btnNuevo) btnNuevo.classList.remove('hidden');
      if (navDash) navDash.classList.remove('hidden');
    } else {
      if (btnNuevo) btnNuevo.classList.add('hidden');
      if (navDash) navDash.classList.add('hidden');
    }
  },

  init() {
    // Arrancar en la página de inicio
    this.navigate('landing');
  }
};

// ─── UI Utilities ──────────────────────────────────────────────────────────
const ui = {
  toast(mensaje, tipo = 'info', duracion = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const iconos = { ok: '✅', warn: '⚠️', error: '❌', info: 'ℹ️' };
    const el = document.createElement('div');
    el.className = `toast toast-${tipo}`;
    el.innerHTML = `
      <span style="font-size: 1.1rem; flex-shrink:0;">${iconos[tipo] || 'ℹ️'}</span>
      <span style="flex:1; line-height:1.4;">${mensaje}</span>
      <button onclick="this.closest('.toast').remove()"
              style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:1.1rem;flex-shrink:0;">✕</button>
    `;
    container.appendChild(el);

    setTimeout(() => {
      el.style.animation = 'fadeOut 0.3s forwards';
      el.addEventListener('animationend', () => el.remove());
    }, duracion);
  },

  showModal(htmlContent) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    if (content) content.innerHTML = htmlContent;
    if (overlay) overlay.classList.remove('hidden');
  },

  closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.add('hidden');
  }
};

// ─── Inicializar la aplicación ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
