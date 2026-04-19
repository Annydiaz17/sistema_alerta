/**
 * SaberAnalítica — Dashboard principal (dashboard.js)
 * Renderiza el diagnóstico completo con gráficos Plotly + Chart.js, filtros y exportación.
 */

const pageDashboard = {
  _resultado: null,
  _orden: ['razonamiento_cuantitativo', 'lectura_critica', 'competencias_ciudadanas', 'ingles', 'comunicacion_escrita'],
  _compSeleccionado: 'lectura_critica',

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
    const alertasMulti = r.alertas_multicriterio || {};
    const resumenAlertas = alertasMulti.resumen || {};

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
          <button class="tab-btn" onclick="pageDashboard.cambiarTab('alertas', this)">⚠️ Alertas (${resumenAlertas.total_en_riesgo || 0})</button>
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
    const resumenAlertas = r.alertas_multicriterio?.resumen || {};
    const totalRiesgo = resumenAlertas.total_en_riesgo || 0;
    const riesgoMultiple = resumenAlertas.riesgo_multiple || 0;

    return `
      ${this._kpi('👥', meta.total_estudiantes || 0, 'Total estudiantes', '#3b82f6')}
      ${this._kpi('🏫', meta.programas?.length || 0, 'Programas', '#8b5cf6')}
      ${this._kpi('📈', global.promedio ? global.promedio.toFixed(1) : '-', 'Promedio global', '#10b981')}
      ${this._kpi('⚠️', totalRiesgo, 'En riesgo', totalRiesgo > 0 ? '#ef4444' : '#10b981')}
      ${this._kpi('🔴', riesgoMultiple, 'Riesgo múltiple', riesgoMultiple > 0 ? '#dc2626' : '#10b981')}
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

      <!-- Gráficos Plotly: Boxplot + Promedio -->
      <div class="dash-grid-2 dashboard-section">
        <div class="chart-card">
          <div class="chart-title">📊 Distribución de puntajes (Boxplot interactivo)</div>
          <div class="plotly-container" id="plotly-boxplot-comp"></div>
        </div>
        <div class="chart-card">
          <div class="chart-title">📊 Promedio por componente</div>
          <div class="plotly-container" id="plotly-promedio-comp"></div>
        </div>
      </div>

      <!-- Histograma Plotly -->
      <div class="dashboard-section">
        <div class="chart-card">
          <div class="chart-title">📊 Distribución del puntaje total (histograma interactivo)</div>
          <div class="plotly-container" id="plotly-histograma-total"></div>
        </div>
      </div>

      <!-- Niveles - gráfico Chart.js -->
      <div class="dashboard-section">
        <div class="chart-card">
          <div class="chart-title">📊 Distribución de niveles de desempeño</div>
          <div class="chart-container" style="height: 280px;">
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
      const n1pct = (dist[1]||0) / total * 100;

      return `
        <div class="comp-card ${n1pct >= 30 ? 'comp-card-alerta' : ''}">
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
          ${n1pct >= 30 ? `<div class="comp-n1-warning">⚠️ ${n1pct.toFixed(0)}% en Nivel 1</div>` : ''}
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
        <div class="dashboard-section-title">🏫 Análisis por Programa</div>

        <!-- Selector de componente para boxplot -->
        <div class="comp-selector-bar mb-4">
          <label>Componente para boxplot:</label>
          <select id="select-comp-boxplot" class="comp-selector" onchange="pageDashboard._cambiarCompBoxplot(this.value)">
            ${this._orden.map(k => `<option value="${k}" ${k === this._compSeleccionado ? 'selected' : ''}>${comps[k]?.nombre || k}</option>`).join('')}
          </select>
        </div>

        <!-- Boxplot por programa (Plotly G5) -->
        <div class="chart-card mb-6">
          <div class="chart-title">📊 Distribución por programa (cada punto = un estudiante)</div>
          <div class="plotly-container plotly-tall" id="plotly-boxplot-programa"></div>
        </div>

        <!-- Tabla comparativa -->
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

  _cambiarCompBoxplot(comp) {
    this._compSeleccionado = comp;
    const r = this._resultado;
    if (r && r.datos_plotly) {
      plotlyCharts.boxplotPorPrograma('plotly-boxplot-programa', r.datos_plotly, comp);
    }
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
    const alertasMulti = r.alertas_multicriterio || {};
    const resumen = alertasMulti.resumen || {};
    const detalle = alertasMulti.detalle || [];
    const porCriterio = resumen.por_criterio || {};

    if (detalle.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">✅</div>
          <h3>¡Sin alertas!</h3>
          <p>Ningún estudiante cumple los criterios de riesgo.</p>
        </div>
      `;
    }

    return `
      <div class="dashboard-section">
        <!-- Resumen de alertas -->
        <div class="section-header">
          <div>
            <div class="dashboard-section-title">⚠️ Alertas Multicriterio</div>
            <div class="section-subtitle">4 reglas: puntaje módulo &lt; 120, total &lt; 130, Nivel 1 en LC y RC</div>
          </div>
          <div class="alertas-resumen-badges">
            <span class="badge badge-error">${resumen.total_en_riesgo} en riesgo</span>
            <span class="badge badge-riesgo-multiple">🔴 ${resumen.riesgo_multiple} múltiple</span>
            <span class="badge badge-riesgo-simple">🟡 ${resumen.riesgo_simple} simple</span>
          </div>
        </div>

        <!-- KPIs de criterios -->
        <div class="grid-4 mb-6">
          ${this._kpi('📉', porCriterio.puntaje_modulo_bajo || 0, 'Módulo < 120', '#f59e0b')}
          ${this._kpi('📊', porCriterio.puntaje_total_bajo || 0, 'Total < 130', '#ef4444')}
          ${this._kpi('📖', porCriterio.nivel1_lectura || 0, 'N1 Lectura Crít.', '#dc2626')}
          ${this._kpi('🔢', porCriterio.nivel1_razonamiento || 0, 'N1 Razon. Cuant.', '#b91c1c')}
        </div>

        <!-- Gráfica Plotly: alertas por programa -->
        <div class="chart-card mb-6">
          <div class="chart-title">📊 Alertas por programa (riesgo simple vs múltiple)</div>
          <div class="plotly-container" id="plotly-alertas-programa"></div>
        </div>

        <!-- Botón exportar Excel de alertas -->
        <div class="mb-6" style="text-align: right;">
          <button class="btn-export-excel" id="btn-excel-alertas" onclick="pageDashboard.exportarExcelAlertas()">
            📋 Exportar Excel de alertas por programa
          </button>
        </div>

        <!-- Tabla de detalle -->
        <div class="chart-card">
          <div class="chart-title mb-4">📋 Detalle de estudiantes en riesgo (${detalle.length})</div>
          <div style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 600px; overflow-y: auto;">
            ${detalle.map(a => {
              const esMultiple = a.tipo_riesgo === 'multiple';
              const razonesTexto = a.criterios_alerta.map(c =>
                c.codigo === 'PUNTAJE_MODULO_BAJO' ? `${c.modulo}: ${c.valor} pts` :
                c.codigo === 'PUNTAJE_TOTAL_BAJO' ? `Total: ${c.valor} pts` :
                `N1 ${c.modulo}`
              ).join(' · ');

              return `
                <div class="alerta-row ${esMultiple ? 'alerta-multiple' : 'alerta-simple'}">
                  <span class="alerta-id">${a.id_anonimizado}</span>
                  <span class="alerta-programa">${a.programa}</span>
                  <span class="badge ${esMultiple ? 'badge-riesgo-multiple' : 'badge-riesgo-simple'}" style="font-size:0.7rem;">
                    ${esMultiple ? '🔴 Múlt.' : '🟡 Simple'} (${a.cantidad_alertas})
                  </span>
                  <span class="alerta-puntaje">${a.puntaje_total?.toFixed(1) || '-'}</span>
                  <span class="alerta-razones">${razonesTexto}</span>
                </div>
              `;
            }).join('')}
          </div>
          <p class="text-xs text-muted mt-6">
            🔒 Los IDs mostrados son anonimizados. No corresponden a los números de identificación reales.
          </p>
        </div>
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

    requestAnimationFrame(() => {
      // Chart.js
      charts.distribucionNiveles('chart-niveles', comps, orden);

      // Tab jornada
      const porJorn = r.por_jornada || {};
      if (Object.keys(porJorn).length > 0) {
        charts.promedioJornadas('chart-jornadas', porJorn, orden, comps);
      }

      // Plotly — Tab General
      if (r.datos_plotly) {
        plotlyCharts.boxplotComponentes('plotly-boxplot-comp', r.datos_plotly);
        plotlyCharts.promedioComponentes('plotly-promedio-comp', comps);
        plotlyCharts.histogramaPuntajeTotal('plotly-histograma-total', r.datos_plotly);
      }

      // Plotly — Tab Programa
      if (r.datos_plotly) {
        plotlyCharts.boxplotPorPrograma('plotly-boxplot-programa', r.datos_plotly, this._compSeleccionado);
      }

      // Plotly — Tab Alertas
      if (r.alertas_multicriterio) {
        plotlyCharts.alertasPorPrograma('plotly-alertas-programa', r.alertas_multicriterio);
      }
    });
  },

  // ─── Filtros ─────────────────────────────────────────────────────────────

  _aplicarFiltros(estado) {
    const r = this._resultado;
    if (!r) return;

    const prog = estado.programa;
    const jorn = estado.jornada;

    // Actualizar gráficos Plotly con filtros
    if (r.datos_plotly) {
      plotlyCharts.boxplotComponentes('plotly-boxplot-comp', r.datos_plotly, prog, jorn);
      plotlyCharts.histogramaPuntajeTotal('plotly-histograma-total', r.datos_plotly, prog, jorn);
    }

    if (prog !== 'Todos' && r.por_programa?.[prog]) {
      const compCards = document.getElementById('comp-cards');
      if (compCards) {
        const comps = r.por_programa[prog].componentes || {};
        compCards.innerHTML = this._orden.map(k => {
          const c = comps[k];
          const cBase = r.componentes[k];
          if (!c || !cBase) return '';
          const dist = c.distribucion_niveles || {};
          const total = c.n_validos || 1;
          const nivelMax = [4,3,2,1].find(n => (dist[n]||0) > 0) || 1;
          const pcts = [1,2,3,4].map(n => (dist[n]||0) / total * 100);
          const n1pct = (dist[1]||0) / total * 100;
          return `
            <div class="comp-card ${n1pct >= 30 ? 'comp-card-alerta' : ''}">
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
              ${n1pct >= 30 ? `<div class="comp-n1-warning">⚠️ ${n1pct.toFixed(0)}% en Nivel 1</div>` : ''}
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

    requestAnimationFrame(() => {
      const r = this._resultado;
      if (!r) return;
      const orden = this._orden.filter(k => r.componentes[k]);
      if (nombre === 'general') {
        charts.distribucionNiveles('chart-niveles', r.componentes, orden);
        if (r.datos_plotly) {
          plotlyCharts.boxplotComponentes('plotly-boxplot-comp', r.datos_plotly);
          plotlyCharts.promedioComponentes('plotly-promedio-comp', r.componentes);
          plotlyCharts.histogramaPuntajeTotal('plotly-histograma-total', r.datos_plotly);
        }
      } else if (nombre === 'programa') {
        if (r.datos_plotly) {
          plotlyCharts.boxplotPorPrograma('plotly-boxplot-programa', r.datos_plotly, this._compSeleccionado);
        }
      } else if (nombre === 'jornada') {
        charts.promedioJornadas('chart-jornadas', r.por_jornada || {}, orden, r.componentes);
      } else if (nombre === 'alertas') {
        if (r.alertas_multicriterio) {
          plotlyCharts.alertasPorPrograma('plotly-alertas-programa', r.alertas_multicriterio);
        }
      }
    });
  },

  async exportarPDF() {
    const sessionId = app.estado.sessionId;
    if (!sessionId) { ui.toast('No hay sesión activa.', 'warn'); return; }
    const btn = document.getElementById('btn-pdf');
    if (btn) btn.textContent = '⏳ Generando PDF...';
    try {
      await api.descargarPDF(sessionId);
      ui.toast('PDF descargado correctamente.', 'ok');
    } catch (e) { ui.toast(e.message, 'error'); }
    finally { if (btn) btn.textContent = '📄 Exportar PDF'; }
  },

  async exportarExcel() {
    const sessionId = app.estado.sessionId;
    if (!sessionId) { ui.toast('No hay sesión activa.', 'warn'); return; }
    const btn = document.getElementById('btn-excel');
    if (btn) btn.textContent = '⏳ Generando Excel...';
    try {
      await api.descargarExcel(sessionId);
      ui.toast('Excel descargado correctamente.', 'ok');
    } catch (e) { ui.toast(e.message, 'error'); }
    finally { if (btn) btn.textContent = '📊 Exportar Excel'; }
  },

  async exportarExcelAlertas() {
    const sessionId = app.estado.sessionId;
    if (!sessionId) { ui.toast('No hay sesión activa.', 'warn'); return; }
    const btn = document.getElementById('btn-excel-alertas');
    if (btn) btn.textContent = '⏳ Generando...';
    try {
      await api.descargarArchivo(`/api/exportar/excel-alertas/${sessionId}`, 'alertas_por_programa.xlsx');
      ui.toast('Excel de alertas descargado correctamente.', 'ok');
    } catch (e) { ui.toast(e.message, 'error'); }
    finally { if (btn) btn.textContent = '📋 Exportar Excel de alertas por programa'; }
  }
};
