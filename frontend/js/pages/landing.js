/**
 * SaberAnalítica — Página de inicio / landing (landing.js)
 */

const pageLanding = {
  render() {
    return `
      <!-- Hero -->
      <section class="landing-hero">
        <div class="container">
          <div class="hero-badge anim-fadeIn">
            📊 Herramienta institucional · Saber Pro
          </div>
          <h1 class="hero-title anim-fadeInUp">
            Diagnóstico automático de<br/>
            <span>resultados Saber Pro</span>
          </h1>
          <p class="hero-subtitle anim-fadeInUp anim-delay-100">
            Carga tu archivo Excel, el sistema lo valida, limpia y genera un 
            diagnóstico institucional completo con gráficos, comparativos y 
            recomendaciones — en segundos.
          </p>
          <div class="hero-actions anim-fadeInUp anim-delay-200">
            <button class="btn-hero-primary" id="btn-hero-cargar" onclick="app.navigate('upload')">
              📤 Cargar mi archivo Excel
            </button>
            <button class="btn-hero-secondary" id="btn-hero-plantilla" onclick="pageLanding.descargarPlantilla()">
              📥 Descargar plantilla
            </button>
          </div>
          <div class="hero-stats anim-fadeInUp anim-delay-300">
            <div>
              <div class="hero-stat-num">5</div>
              <div class="hero-stat-label">Módulos analizados</div>
            </div>
            <div>
              <div class="hero-stat-num">4</div>
              <div class="hero-stat-label">Niveles ICFES</div>
            </div>
            <div>
              <div class="hero-stat-num">100%</div>
              <div class="hero-stat-label">Automático</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Características -->
      <section class="features-section">
        <div class="container">
          <div class="text-center mb-8 anim-fadeInUp">
            <h2 style="color: var(--primary-700);">¿Cómo funciona?</h2>
            <p style="color: var(--text-secondary); margin-top: 0.5rem; max-width: 500px; margin-left: auto; margin-right: auto;">
              El sistema hace el trabajo técnico por ti. Solo necesitas subir tu archivo Excel.
            </p>
          </div>
          <div class="features-grid">
            ${pageLanding._feature('📤', 'Sube tu archivo', 'Arrastra tu Excel o selecciónalo. El sistema acepta cualquier nombre de hoja y variaciones menores en los nombres de columna.')}
            ${pageLanding._feature('🔍', 'Validación automática', 'El sistema verifica la estructura, detecta valores especiales como "IA", identifica datos faltantes y te explica cualquier problema en lenguaje claro.')}
            ${pageLanding._feature('🧹', 'Limpieza inteligente', 'Se normalizan los encabezados, se eliminan filas vacías y se detectan duplicados. Los nulos se tratan con transparencia, nunca con relleno inventado.')}
            ${pageLanding._feature('📊', 'Dashboard interactivo', 'Promedios, distribución de niveles, comparativo por programa y jornada. Filtra los gráficos en tiempo real.')}
            ${pageLanding._feature('💡', 'Diagnóstico con insights', 'El sistema identifica fortalezas y brechas automáticamente y genera recomendaciones en lenguaje entendible para no técnicos.')}
            ${pageLanding._feature('📥', 'Exporta tus resultados', 'Descarga el diagnóstico completo en PDF o en Excel con cuatro hojas de resultados organizadas.')}
          </div>

          <!-- Información de privacidad -->
          <div class="card mt-8" style="background: var(--primary-50); border-color: var(--primary-200); max-width: 680px; margin: 2rem auto 0;">
            <div class="flex gap-3 align-items:flex-start">
              <span style="font-size: 1.6rem; flex-shrink:0;">🔒</span>
              <div>
                <h4 style="color: var(--primary-700); margin-bottom: 0.25rem;">Privacidad ante todo</h4>
                <p style="font-size: 0.88rem; color: var(--text-secondary); margin: 0;">
                  Los números de identificación de los estudiantes nunca se exponen en URLs ni en los reportes exportados. 
                  El procesamiento ocurre en tu servidor local. Los datos no se comparten con terceros.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA final -->
      <section style="background: var(--primary-900); padding: var(--space-16) 0; text-align: center;">
        <div class="container">
          <h2 style="color: white; margin-bottom: 1rem;">Listo para analizar tu archivo</h2>
          <p style="color: hsla(255,255,255,.7); margin-bottom: 2rem; font-size: 1rem;">
            No necesitas instalar nada más. Solo sube tu Excel y obtén el diagnóstico.
          </p>
          <button class="btn-hero-primary" id="btn-cta-cargar" onclick="app.navigate('upload')">
            Comenzar análisis ➜
          </button>
        </div>
      </section>
    `;
  },

  _feature(icon, titulo, desc) {
    return `
      <div class="feature-card anim-fadeInUp">
        <span class="feature-icon">${icon}</span>
        <div class="feature-title">${titulo}</div>
        <div class="feature-desc">${desc}</div>
      </div>
    `;
  },

  async descargarPlantilla() {
    try {
      await api.descargarPlantilla();
      ui.toast('Plantilla descargada correctamente.', 'ok');
    } catch (e) {
      ui.toast(e.message, 'error');
    }
  }
};
