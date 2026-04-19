/**
 * SaberAnalítica — Dashboard principal (dashboard.js)
 * Renderiza el diagnóstico completo con gráficos, filtros y exportación.
 */

const pageDashboard = {
  _resultado: null,
  _orden: ['razonamiento_cuantitativo', 'lectura_critica', 'competencias_ciudadanas', 'ingles', 'comunicacion_escrita'],

  render() {
    const r = app.estado.resultado;
    if (!r) {
      return `
        <div class="page">
          <div class="container">
            <div class="empty-state" style="padding-top: 6rem;">
              <div class="empty-state-icon">📊</div>
              <h3>No hay resultados disponibles</h3>
              <p>Carga un archivo Excel para generar el diagnóstico.</p>
              <button class="btn btn-primary" onclick="app.navigate('upload')">
                📤 Cargar archivo
              </button>
            </div>
          </div>
        </div>
      `;
    }

    this._resultado = r;
    const meta = r.meta || {};
    const confianza = r.diagnostico?.confianza || {};
    const sessionId = app.estado.sessionId;

    return `
      <!-- Header del dashboard -->
      <div class="dashboard-header">
        <div class="container">
          <div class="dashboard-header-inner">
            <div class="dashboard-title-block">
              <h1 class="page-title">📊 Diagnóstico Saber Pro</h1>
              <div class="dashboard-meta">
                <span>${meta.total_estudiantes} estudiantes</span>
                <span>${meta.programas?.length} programa(s)</span>
                <span>${meta.jornadas?.length} jornada(s)</span>
                <span>Procesado hoy</span>
              </div>
            </div>
            <div class="dashboard-actions">
              <button class="btn-export-pdf" id="btn-pdf" onclick="pageDashboard.exportarPDF()">
                📄 Exportar PDF
              </button>
              <button class="btn-export-excel" id="btn-excel" onclick="pageDashboard.exportarExcel()">
                📊 Exportar Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Cuerpo del dashboard -->
      <div class="container" style="padding-top: var(--space-6); padding-bottom: var(--space-16);">

        <!-- Banner de confianza -->
        <div class="confianza-banner ${confianza.nivel} anim-fadeIn">
          <div class="confianza-banner-icon">${confianza.nivel === 'Alto' ? '💪' : confianza.nivel === 'Medio' ? '📊' : '⚠️'}</div>
          <div class="confianza-banner-body">
            <h4>Confianza del diagnóstico: <span class="confianza-badge ${confianza.nivel}">${confianza.nivel}</span></h4>
            <p>${confianza.explicacion || ''}</p>
          </div>
        </div>

        <!-- KPIs principales -->
        <div class="grid-5 mb-6 anim-fadeInUp anim-delay-100" id="kpis-container">
          ${this._renderKPIs(r)}
        </div>

        <!-- Filtros -->
        <div class="filtros-bar" id="filtros-bar"></div>

        <!-- Tabs de navegación -->
        <div class="tabs anim-fadeInUp anim-delay-200">
          <button class="tab-btn active" onclick="pageDashboard.cambiarTab('general', this)">🎯 General</button>
          <button class="tab-btn" onclick="pageDashboard.cambiarTab('programa', this)">🏫 Por Programa</button>
          <button class="tab-btn" onclick="pageDashboard.cambiarTab('jornada', this)">🕐 Por Jornada</button>
          <button class="tab-btn" onclick="pageDashboard.cambiarTab('alertas', this)">⚠️ Alertas (${(r.alertas_criticas || []).length})</button>
          <button class="tab-btn" onclick="pageDashboard.cambiarTab('calidad', this)">📋 Calidad del dato</button>
        </div>

        <!-- Contenido de tabs -->
        <div id="tab-general"   class="tab-content active">${this._tabGeneral(r)}</div>
        <div id="tab-programa"  class="tab-content">${this._tabPrograma(r)}</div>
        <div id="tab-jornada"   class="tab-content">${this._tabJornada(r)}</div>
        <div id="tab-alertas"   class="tab-content">${this._tabAlertas(r)}</div>
        <div id="tab-calidad"   class="tab-content">${this._tabCalidad(r)}</div>
      </div>
    `;
  },

  afterRender() {
    const r = this._resultado;
    if (!r) return;

    const meta = r.meta || {};
    filtros.inicializar(
      meta.programas || [],
      meta.jornadas  || [],
      estado => this._aplicarFiltros(estado)
    );

    this._renderGraficos(r);
  },

  _renderKPIs(r) {
    const meta = r.meta || {};
    const global = r.puntaje_total_global || {};
    const alertas = (r.alertas_criticas || []).length;

    return `
      ${this._kpi('👥', meta.total_estudiantes || 0, 'Total estudiantes', '#3b82f6')}
      ${this._kpi('🏫', meta.programas?.length || 0, 'Programas', '#8b5cf6')}
      ${this._kpi('📈', global.promedio ? global.promedio.toFixed(1) : '-', 'Promedio global', '#10b981')}
      ${this._kpi('⚠️', alertas, 'Alertas críticas', alertas > 0 ? '#ef4444' : '#10b981')}
      ${this._kpi('🕐', meta.jornadas?.length || 0, 'Jornadas', '#f59e0b')}
    `;
  },

  _kpi(icon, valor, label, color) {
    return `
      <div class="kpi-card" style="--kpi-color: ${color};">
        <div class="kpi-label">${label}</div>
        <div class="kpi-value">${valor}</div>
        <div class="kpi-icon">${icon}</div>
      </div>
    `;
  },

  // ─── TAB GENERAL ────────────────────────────────────────────────────────

  _tabGeneral(r) {
    const comps = r.componentes || {};
    const diag  = r.diagnostico || {};

    return `
      <!-- Tarjetas por componente -->
      <div class="dashboard-section">
        <div class="dashboard-section-title">🎯 Resultados por Componente</div>
        <div class="grid-5" id="comp-cards">
          ${this._renderCompCards(comps)}
        </div>
      </div>

      <!-- Gráficos principales -->
      <div class="dash-grid-2 dashboard-section">
        <div class="chart-card">
          <div class="chart-title">📊 Promedio por componente</div>
          <div class="chart-container" style="height: 260px;">
            <canvas id="chart-promedio"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-title">📊 Distribución de niveles de desempeño</div>
          <div class="chart-container" style="height: 260px;">
            <canvas id="chart-niveles"></canvas>
          </div>
        </div>
      </div>

      <!-- Tabla de resumen -->
      <div class="dashboard-section chart-card">
        <div class="chart-title">📋 Resumen estadístico por componente</div>
        <div class="tabla-comparativa-wrap mt-4">
          <table class="tabla-comparativa">
            <thead>
              <tr>
                <th>Componente</th>
                <th>N Válidos</th>
                <th>Promedio</th>
                <th>Mediana</th>
                <th>Desv.</th>
                <th>Mín.</th>
                <th>Máx.</th>
                <th>Distribución de Niveles</th>
              </tr>
            </thead>
            <tbody>
              ${this._orden.map(k => {
                const c = comps[k];
                if (!c) return '';
                const dist = c.distribucion_niveles || {};
                const total = Object.values(dist).reduce((a, b) => a + b, 0);
                return `
                  <tr>
                    <td class="nombre-grupo">
                      <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${c.color};margin-right:6px;"></span>
                      ${c.nombre}
                    </td>
                    <td style="text-align:center;">${c.n_validos}</td>
                    <td style="text-align:center;">${c.promedio?.toFixed(1) || '-'}</td>
                    <td style="text-align:center;">${c.mediana?.toFixed(1) || '-'}</td>
                    <td style="text-align:center;">${c.desviacion?.toFixed(1) || '-'}</td>
                    <td style="text-align:center;">${c.minimo?.toFixed(0) || '-'}</td>
                    <td style="text-align:center;">${c.maximo?.toFixed(0) || '-'}</td>
                    <td>
                      <div class="nivel-resumen">
                        ${[1,2,3,4].map(n => `<span class="nivel-chip n${n}">N${n}: ${dist[n]||0}</span>`).join('')}
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Hallazgos -->
      <div class="dashboard-section">
        <div class="dashboard-section-title">💡 Hallazgos automáticos</div>
        <div class="grid-2">
          ${this._hallazgoCard('💪', 'Fortalezas', diag.fortalezas, 'var(--ok-bg)', 'var(--ok)')}
          ${this._hallazgoCard('⚠️', 'Áreas de mejora', diag.brechas, 'var(--warn-bg)', 'var(--warn)')}
          ${this._hallazgoCard('💡', 'Insights comparativos', diag.insights, 'var(--info-bg)', 'var(--info)')}
          ${this._hallazgoCard('📋', 'Recomendaciones', diag.recomendaciones, 'var(--primary-50)', 'var(--primary-700)')}
        </div>
      </div>
    `;
  },

  _hallazgoCard(icon, titulo, items, bg, color) {
    const lista = (items || []).length > 0
      ? items.map(i => `<li>${i}</li>`).join('')
      : `<li style="color: var(--text-muted); font-style: italic;">Sin hallazgos en esta categoría.</li>`;

    return `
      <div class="hallazgo-card" style="border-top: 3px solid ${color}; background: ${bg}20;">
        <div class="hallazgo-icon">${icon}</div>
        <div class="hallazgo-titulo" style="color: ${color};">${titulo}</div>
        <ul class="hallazgo-lista">${lista}</ul>
      </div>
    `;
  },

  _renderCompCards(comps) {
    return this._orden.map(k => {
      const c = comps[k];
      if (!c) return '';
      const dist = c.distribucion_niveles || {};
      const total = c.n_validos || 1;
      const nivelMax = [4,3,2,1].find(n => (dist[n]||0) > 0) || 1;

      const pcts = [1,2,3,4].map(n => (dist[n]||0) / total * 100);

      return `
        <div class="comp-card">
          <div class="comp-card-header">
            <div class="comp-dot" style="background: ${c.color};"></div>
            <div class="comp-name">${c.nombre}</div>
          </div>
          <div class="comp-promedio" style="color: ${c.color};">
            ${c.promedio?.toFixed(1) || '—'}
          </div>
          <div class="comp-nivel-badge" style="background: ${c.color}22; color: ${c.color};">
            Nivel predominante: ${nivelMax}
          </div>
          <div class="comp-dist">
            ${[1,2,3,4].map((n,i) => `
              <div class="comp-dist-seg" style="width: ${pcts[i].toFixed(1)}%; background: ${{1:'#ef4444',2:'#f59e0b',3:'#10b981',4:'#059669'}[n]};"></div>
            `).join('')}
          </div>
          <div class="comp-dist-legend">
            ${[1,2,3,4].map(n => `
              <span class="comp-dist-legend-item">
                <span class="comp-dist-legend-dot" style="background: ${{1:'#ef4444',2:'#f59e0b',3:'#10b981',4:'#059669'}[n]};"></span>
                N${n}: ${dist[n]||0}
              </span>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
  },

  // ─── TAB PROGRAMA ───────────────────────────────────────────────────────

  _tabPrograma(r) {
    const porPrograma = r.por_programa || {};
    const comps = r.componentes || {};

    if (Object.keys(porPrograma).length === 0) {
      return `<div class="empty-state"><div class="empty-state-icon">🏫</div><p>No se detectó la columna de programa en el archivo.</p></div>`;
    }

    return `
      <div class="dashboard-section">
        <div class="dashboard-section-title">🏫 Comparativo por Programa</div>
        <div class="dash-grid-2">
          <div class="chart-card">
            <div class="chart-title">📊 Radar comparativo</div>
            <div class="chart-container" style="height:300px;"><canvas id="chart-radar-prog"></canvas></div>
          </div>
          <div class="chart-card">
            <div class="chart-title">📊 Promedio total por programa</div>
            <div class="chart-container" style="height:300px;"><canvas id="chart-bar-prog"></canvas></div>
          </div>
        </div>
        <div class="chart-card mt-6">
          <div class="chart-title">📋 Detalle por programa y componente</div>
          <div class="tabla-comparativa-wrap mt-4">
            <table class="tabla-comparativa">
              <thead>
                <tr>
                  <th>Programa</th>
                  <th>N</th>
                  ${this._orden.map(k => `<th>${comps[k]?.nombre?.split(' ')[0] || k}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${Object.entries(porPrograma).map(([prog, datos]) => {
                  const compsGrupo = datos.componentes || {};
                  return `
                    <tr>
                      <td class="nombre-grupo">${prog}</td>
                      <td style="text-align:center;">${datos.n}</td>
                      ${this._orden.map(k => {
                        const prom = compsGrupo[k]?.promedio;
                        return `<td style="text-align:center;">${prom ? `<span class="celda-puntaje ${this._classPuntaje(prom)}">${prom.toFixed(1)}</span>` : '-'}</td>`;
                      }).join('')}
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  // ─── TAB JORNADA ────────────────────────────────────────────────────────

  _tabJornada(r) {
    const porJornada = r.por_jornada || {};
    const comps = r.componentes || {};

    if (Object.keys(porJornada).length === 0) {
      return `<div class="empty-state"><div class="empty-state-icon">🕐</div><p>No se detectó la columna de jornada en el archivo.</p></div>`;
    }

    return `
      <div class="dashboard-section">
        <div class="dashboard-section-title">🕐 Comparativo por Jornada</div>
        <div class="chart-card mb-6">
          <div class="chart-title">📊 Promedio por componente y jornada</div>
          <div class="chart-container" style="height:300px;"><canvas id="chart-jornadas"></canvas></div>
        </div>
        <div class="grid-${Math.min(Object.keys(porJornada).length, 3)}" style="gap: 1rem;">
          ${Object.entries(porJornada).map(([jorn, datos]) => `
            <div class="card">
              <h3 style="color: var(--primary-700); margin-bottom: 1rem;">🕐 ${jorn}</h3>
              <div style="font-size: 2rem; font-weight: 900; color: var(--text-primary); margin-bottom: 0.25rem;">
                ${datos.n} est.
              </div>
              <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
                Prom. total: ${datos.puntaje_total?.promedio?.toFixed(1) || '-'}
              </div>
              ${this._orden.map(k => {
                const cd = datos.componentes?.[k];
                if (!cd) return '';
                return `
                  <div style="display:flex; justify-content:space-between; font-size:0.82rem; padding: 0.3rem 0; border-bottom: 1px solid var(--border);">
                    <span>${comps[k]?.nombre?.split(' ')[0]}</span>
                    <span class="celda-puntaje ${this._classPuntaje(cd.promedio)}">${cd.promedio?.toFixed(1) || '-'}</span>
                  </div>
                `;
              }).join('')}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  // ─── TAB ALERTAS ────────────────────────────────────────────────────────

  _tabAlertas(r) {
    const alertas = r.alertas_criticas || [];

    if (alertas.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">✅</div>
          <h3>¡Sin alertas críticas!</h3>
          <p>Ningún estudiante fue identificado con Nivel 1 en algún módulo ni con puntaje total muy bajo.</p>
        </div>
      `;
    }

    return `
      <div class="dashboard-section">
        <div class="section-header">
          <div>
            <div class="dashboard-section-title">⚠️ Alertas Críticas</div>
            <div class="section-subtitle">Estudiantes con Nivel 1 o puntaje total muy bajo (IDs anonimizados por privacidad)</div>
          </div>
          <span class="badge badge-error" style="font-size: 0.88rem;">${alertas.length} estudiantes</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          ${alertas.map(a => `
            <div class="alerta-row">
              <span class="alerta-id">${a.id_anonimizado}</span>
              <span class="alerta-programa">${a.programa}</span>
              <span class="badge badge-info" style="font-size: 0.75rem; white-space:nowrap;">${a.jornada}</span>
              <span class="alerta-puntaje">${a.puntaje_total?.toFixed(1) || '-'}</span>
              <span class="alerta-razones">${a.razones?.join(' · ')}</span>
            </div>
          `).join('')}
        </div>
        <p class="text-xs text-muted mt-6">
          🔒 Los IDs mostrados son anonimizados. No corresponden a los números de identificación reales de los estudiantes.
        </p>
      </div>
    `;
  },

  // ─── TAB CALIDAD ────────────────────────────────────────────────────────

  _tabCalidad(r) {
    const calidad = r.diagnostico?.calidad || {};
    const nulos   = calidad.nulos_por_componente || {};
    const validacion = r.validacion || {};

    return `
      <div class="dashboard-section">
        <div class="dashboard-section-title">📋 Calidad del archivo procesado</div>

        <div class="chart-card mb-6">
          <div class="chart-title mb-4">Registros sin dato por componente</div>
          ${Object.entries(nulos).map(([comp, info]) => {
            const pct = info.pct_sin_dato || 0;
            const colorClass = pct > 25 ? 'danger' : pct > 10 ? 'warn' : 'ok';
            const icono = pct > 25 ? '🔴' : pct > 10 ? '🟡' : '🟢';
            return `
              <div class="calidad-row">
                <span class="calidad-estado">${icono}</span>
                <span class="calidad-nombre">${info.nombre}</span>
                <div class="calidad-bar">
                  <div class="progress-bar">
                    <div class="progress-fill ${colorClass}" style="width: ${pct}%;"></div>
                  </div>
                </div>
                <span class="calidad-pct">${pct.toFixed(1)}%</span>
                <span class="text-xs text-muted">${info.nulos > 0 ? `${info.nulos} nulos` : ''}${info.ia > 0 ? ` · ${info.ia} IA` : ''}</span>
              </div>
            `;
          }).join('')}
        </div>

        ${validacion.advertencias?.length > 0 ? `
          <div class="chart-card mb-6">
            <div class="chart-title mb-4">Advertencias del archivo</div>
            <div class="val-list">
              ${validacion.advertencias.map(a => `
                <div class="val-item advertencia">
                  <span class="val-item-icon">⚠️</span>
                  <div class="val-item-msg">${a.mensaje_usuario}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${validacion.infos?.length > 0 ? `
          <div class="chart-card">
            <div class="chart-title mb-4">Correcciones automáticas aplicadas</div>
            <div class="val-list">
              ${validacion.infos.map(i => `
                <div class="val-item info">
                  <span class="val-item-icon">✅</span>
                  <div class="val-item-msg">${i.mensaje_usuario}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  },

  // ─── Gráficos ────────────────────────────────────────────────────────────

  _renderGraficos(r) {
    const comps = r.componentes || {};
    const orden = this._orden.filter(k => comps[k]);
    const config = r.config?.componentes_info || {};

    // Tab general
    requestAnimationFrame(() => {
      charts.promedioComponentes('chart-promedio', comps, orden);
      charts.distribucionNiveles('chart-niveles', comps, orden);

      // Tab programa
      const porProg = r.por_programa || {};
      if (Object.keys(porProg).length > 0) {
        charts.radarProgramas('chart-radar-prog', porProg, orden, comps);
        this._chartBarProgramas('chart-bar-prog', porProg);
      }

      // Tab jornada
      const porJorn = r.por_jornada || {};
      if (Object.keys(porJorn).length > 0) {
        charts.promedioJornadas('chart-jornadas', porJorn, orden, comps);
      }
    });
  },

  _chartBarProgramas(canvasId, porProg) {
    charts._destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const labels = Object.keys(porProg);
    const datos  = labels.map(p => porProg[p].puntaje_total?.promedio || 0);
    const paleta = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e', '#06b6d4'];

    charts._save(canvasId, new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Promedio total',
          data: datos,
          backgroundColor: paleta.map((c, i) => c + '99'),
          borderColor: paleta,
          borderWidth: 2,
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y.toFixed(1)} puntos` } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 30 } },
          y: { min: 0, max: 300, grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } }
        }
      }
    }));
  },

  // ─── Filtros ─────────────────────────────────────────────────────────────

  _aplicarFiltros(estado) {
    // En esta versión, los filtros actualizan las tarjetas de componentes
    // mostrando datos del subgrupo seleccionado
    const r = this._resultado;
    if (!r) return;

    let datos = r;
    const prog = estado.programa;
    const jorn = estado.jornada;

    if (prog !== 'Todos' && r.por_programa?.[prog]) {
      // Mostrar componentes del programa seleccionado
      const compCards = document.getElementById('comp-cards');
      if (compCards) {
        const comps = r.por_programa[prog].componentes || {};
        // Adaptar al formato de comp-cards (usando datos del programa)
        compCards.innerHTML = this._orden.map(k => {
          const c = comps[k];
          const cBase = r.componentes[k];
          if (!c || !cBase) return '';
          const dist = c.distribucion_niveles || {};
          const total = c.n_validos || 1;
          const nivelMax = [4,3,2,1].find(n => (dist[n]||0) > 0) || 1;
          const pcts = [1,2,3,4].map(n => (dist[n]||0) / total * 100);
          return `
            <div class="comp-card">
              <div class="comp-card-header">
                <div class="comp-dot" style="background: ${cBase.color};"></div>
                <div class="comp-name">${cBase.nombre}</div>
              </div>
              <div class="comp-promedio" style="color: ${cBase.color};">
                ${c.promedio?.toFixed(1) || '—'}
              </div>
              <div class="comp-nivel-badge" style="background: ${cBase.color}22; color: ${cBase.color};">
                Nivel predominante: ${nivelMax}
              </div>
              <div class="comp-dist">
                ${[1,2,3,4].map((n,i) => `
                  <div class="comp-dist-seg" style="width: ${pcts[i].toFixed(1)}%; background: ${{1:'#ef4444',2:'#f59e0b',3:'#10b981',4:'#059669'}[n]};"></div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('');
      }
    } else {
      // Restaurar datos globales
      const compCards = document.getElementById('comp-cards');
      if (compCards) {
        compCards.innerHTML = this._renderCompCards(r.componentes);
      }
    }
  },

  // ─── Helpers ─────────────────────────────────────────────────────────────

  _classPuntaje(prom) {
    if (!prom) return '';
    if (prom >= 180) return 'alto';
    if (prom >= 155) return 'medio-alto';
    if (prom >= 125) return 'medio';
    return 'bajo';
  },

  cambiarTab(nombre, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    const tab = document.getElementById(`tab-${nombre}`);
    if (tab) tab.classList.add('active');

    // Re-renderizar gráficos si cambia de tab (canvas puede estar oculto)
    requestAnimationFrame(() => {
      const r = this._resultado;
      if (!r) return;
      const orden = this._orden.filter(k => r.componentes[k]);
      if (nombre === 'general') {
        charts.promedioComponentes('chart-promedio', r.componentes, orden);
        charts.distribucionNiveles('chart-niveles', r.componentes, orden);
      } else if (nombre === 'programa') {
        charts.radarProgramas('chart-radar-prog', r.por_programa || {}, orden, r.componentes);
        this._chartBarProgramas('chart-bar-prog', r.por_programa || {});
      } else if (nombre === 'jornada') {
        charts.promedioJornadas('chart-jornadas', r.por_jornada || {}, orden, r.componentes);
      }
    });
  },

  async exportarPDF() {
    const sessionId = app.estado.sessionId;
    if (!sessionId) {
      ui.toast('No hay sesión activa. Vuelve a procesar el archivo.', 'warn');
      return;
    }
    const btn = document.getElementById('btn-pdf');
    if (btn) btn.textContent = '⏳ Generando PDF...';
    try {
      await api.descargarPDF(sessionId);
      ui.toast('PDF descargado correctamente.', 'ok');
    } catch (e) {
      ui.toast(e.message, 'error');
    } finally {
      if (btn) btn.textContent = '📄 Exportar PDF';
    }
  },

  async exportarExcel() {
    const sessionId = app.estado.sessionId;
    if (!sessionId) {
      ui.toast('No hay sesión activa. Vuelve a procesar el archivo.', 'warn');
      return;
    }
    const btn = document.getElementById('btn-excel');
    if (btn) btn.textContent = '⏳ Generando Excel...';
    try {
      await api.descargarExcel(sessionId);
      ui.toast('Excel descargado correctamente.', 'ok');
    } catch (e) {
      ui.toast(e.message, 'error');
    } finally {
      if (btn) btn.textContent = '📊 Exportar Excel';
    }
  }
};
