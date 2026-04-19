/**
 * SaberAnalítica — Gráficas interactivas con Plotly.js (plotly_charts.js)
 * 5 visualizaciones: boxplot, promedio, alertas por programa, histograma, boxplot por programa.
 */

const PLOTLY_LAYOUT_BASE = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(0,0,0,0)',
  font: { family: 'Inter, sans-serif', size: 12, color: '#334155' },
  margin: { l: 60, r: 30, t: 40, b: 60 },
  autosize: true,
};

const PLOTLY_CONFIG = {
  responsive: true,
  displaylogo: false,
  modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'],
  toImageButtonOptions: { format: 'png', filename: 'saberanalytica_grafica', scale: 2 },
  locale: 'es',
};

const COMP_COLORES = {
  razonamiento_cuantitativo: '#8b5cf6',
  lectura_critica: '#3b82f6',
  competencias_ciudadanas: '#f59e0b',
  ingles: '#10b981',
  comunicacion_escrita: '#f43f5e',
};

const COMP_NOMBRES = {
  razonamiento_cuantitativo: 'Razonamiento Cuantitativo',
  lectura_critica: 'Lectura Crítica',
  competencias_ciudadanas: 'Competencias Ciudadanas',
  ingles: 'Inglés',
  comunicacion_escrita: 'Comunicación Escrita',
};

const plotlyCharts = {

  /**
   * G1 — Boxplot por componente
   * Muestra dispersión, mediana, Q1, Q3 y outliers de cada módulo.
   */
  boxplotComponentes(containerId, datosPlotly, filtroPrograma, filtroJornada) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const puntajes = datosPlotly.puntajes_individuales || {};
    const programas = datosPlotly.programas_por_estudiante || [];
    const jornadas = datosPlotly.jornadas_por_estudiante || [];
    const comps = Object.keys(puntajes);

    const traces = comps.map(comp => {
      let vals = puntajes[comp] || [];

      // Aplicar filtros
      if (filtroPrograma && filtroPrograma !== 'Todos') {
        vals = vals.filter((_, i) => programas[i] === filtroPrograma);
      }
      if (filtroJornada && filtroJornada !== 'Todos') {
        vals = vals.filter((_, i) => jornadas[i] === filtroJornada);
      }

      vals = vals.filter(v => v !== null && v !== undefined);

      return {
        y: vals,
        type: 'box',
        name: (COMP_NOMBRES[comp] || comp).split(' ')[0],
        marker: { color: COMP_COLORES[comp] || '#6366f1' },
        boxmean: 'sd',
        jitter: 0.3,
        pointpos: -1.5,
        boxpoints: 'outliers',
        hovertemplate: '%{y:.1f} puntos<extra></extra>',
      };
    });

    const layout = {
      ...PLOTLY_LAYOUT_BASE,
      title: { text: 'Distribución de puntajes por módulo', font: { size: 14 } },
      yaxis: { title: 'Puntaje', range: [0, 310], gridcolor: '#f1f5f9' },
      xaxis: { gridcolor: '#f1f5f9' },
      showlegend: false,
    };

    Plotly.newPlot(el, traces, layout, PLOTLY_CONFIG);
  },

  /**
   * G2 — Promedio por componente (barras)
   */
  promedioComponentes(containerId, componentes) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const comps = Object.keys(componentes).filter(k => componentes[k]);
    const nombres = comps.map(k => (COMP_NOMBRES[k] || k).split(' ').slice(0, 2).join(' '));
    const promedios = comps.map(k => componentes[k]?.promedio || 0);
    const colores = comps.map(k => COMP_COLORES[k] || '#6366f1');

    const trace = {
      x: promedios,
      y: nombres,
      type: 'bar',
      orientation: 'h',
      marker: {
        color: colores.map(c => c + 'aa'),
        line: { color: colores, width: 2 },
      },
      text: promedios.map(p => p.toFixed(1)),
      textposition: 'outside',
      hovertemplate: '%{y}: %{x:.1f} puntos<extra></extra>',
    };

    const layout = {
      ...PLOTLY_LAYOUT_BASE,
      title: { text: 'Promedio por componente', font: { size: 14 } },
      xaxis: { range: [0, 300], gridcolor: '#f1f5f9', title: 'Puntaje' },
      yaxis: { automargin: true },
      showlegend: false,
    };

    Plotly.newPlot(el, [trace], layout, PLOTLY_CONFIG);
  },

  /**
   * G3 — Alertas por programa (barras agrupadas: simple vs múltiple)
   */
  alertasPorPrograma(containerId, alertasMulti) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const porPrograma = alertasMulti?.resumen?.por_programa || {};
    const programas = Object.keys(porPrograma).sort();

    if (programas.length === 0) {
      el.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;">No hay alertas</p>';
      return;
    }

    const traceSimple = {
      x: programas,
      y: programas.map(p => porPrograma[p].simple),
      name: 'Riesgo simple',
      type: 'bar',
      marker: { color: '#f59e0b99', line: { color: '#f59e0b', width: 1.5 } },
      hovertemplate: '%{x}: %{y} estudiantes<extra>Riesgo simple</extra>',
    };

    const traceMultiple = {
      x: programas,
      y: programas.map(p => porPrograma[p].multiple),
      name: 'Riesgo múltiple',
      type: 'bar',
      marker: { color: '#ef444499', line: { color: '#ef4444', width: 1.5 } },
      hovertemplate: '%{x}: %{y} estudiantes<extra>Riesgo múltiple</extra>',
    };

    const layout = {
      ...PLOTLY_LAYOUT_BASE,
      title: { text: 'Distribución de alertas por programa', font: { size: 14 } },
      barmode: 'stack',
      xaxis: { tickangle: -25, automargin: true },
      yaxis: { title: 'Estudiantes en riesgo', gridcolor: '#f1f5f9' },
      legend: { orientation: 'h', y: -0.2 },
    };

    Plotly.newPlot(el, [traceSimple, traceMultiple], layout, PLOTLY_CONFIG);
  },

  /**
   * G4 — Histograma de puntaje total
   */
  histogramaPuntajeTotal(containerId, datosPlotly, filtroPrograma, filtroJornada) {
    const el = document.getElementById(containerId);
    if (!el) return;

    let puntajes = datosPlotly.puntaje_total || [];
    const programas = datosPlotly.programas_por_estudiante || [];
    const jornadas = datosPlotly.jornadas_por_estudiante || [];

    // Aplicar filtros
    if (filtroPrograma && filtroPrograma !== 'Todos') {
      puntajes = puntajes.filter((_, i) => programas[i] === filtroPrograma);
    }
    if (filtroJornada && filtroJornada !== 'Todos') {
      puntajes = puntajes.filter((_, i) => jornadas[i] === filtroJornada);
    }

    puntajes = puntajes.filter(v => v !== null && v !== undefined);

    const trace = {
      x: puntajes,
      type: 'histogram',
      nbinsx: 15,
      marker: {
        color: '#3b82f666',
        line: { color: '#3b82f6', width: 1.5 },
      },
      hovertemplate: 'Rango: %{x}<br>Estudiantes: %{y}<extra></extra>',
    };

    // Línea vertical del umbral de riesgo (130)
    const umbral = {
      type: 'line', x0: 130, x1: 130, y0: 0, y1: 1,
      yref: 'paper', line: { color: '#ef4444', width: 2, dash: 'dash' },
    };

    const layout = {
      ...PLOTLY_LAYOUT_BASE,
      title: { text: 'Distribución del puntaje total', font: { size: 14 } },
      xaxis: { title: 'Puntaje total promedio', gridcolor: '#f1f5f9' },
      yaxis: { title: 'Cantidad de estudiantes', gridcolor: '#f1f5f9' },
      shapes: [umbral],
      annotations: [{
        x: 130, y: 1, yref: 'paper', text: 'Umbral riesgo (130)',
        showarrow: true, arrowhead: 0, ax: 60, ay: -20,
        font: { color: '#ef4444', size: 10 },
      }],
      showlegend: false,
    };

    Plotly.newPlot(el, [trace], layout, PLOTLY_CONFIG);
  },

  /**
   * G5 — Boxplot por programa (con puntos individuales)
   */
  boxplotPorPrograma(containerId, datosPlotly, componente) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const comp = componente || 'lectura_critica';
    const puntajes = datosPlotly.puntajes_individuales?.[comp] || [];
    const programas = datosPlotly.programas_por_estudiante || [];
    const ids = datosPlotly.ids_anonimizados || [];

    // Agrupar por programa
    const porProg = {};
    for (let i = 0; i < puntajes.length; i++) {
      if (puntajes[i] === null || puntajes[i] === undefined) continue;
      const prog = programas[i] || 'Sin programa';
      if (!porProg[prog]) porProg[prog] = { vals: [], ids: [] };
      porProg[prog].vals.push(puntajes[i]);
      porProg[prog].ids.push(ids[i] || `EST-${i}`);
    }

    const paleta = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e', '#06b6d4', '#ec4899', '#14b8a6'];
    const traces = Object.keys(porProg).sort().map((prog, i) => ({
      y: porProg[prog].vals,
      type: 'box',
      name: prog.length > 20 ? prog.substring(0, 18) + '…' : prog,
      marker: { color: paleta[i % paleta.length] },
      boxpoints: 'all',
      jitter: 0.4,
      pointpos: 0,
      boxmean: true,
      text: porProg[prog].ids,
      hovertemplate: '<b>%{text}</b><br>Puntaje: %{y:.1f}<br>Programa: ' + prog + '<extra></extra>',
    }));

    // Línea horizontal del umbral (120)
    const umbral = {
      type: 'line', x0: -0.5, x1: traces.length - 0.5, y0: 120, y1: 120,
      line: { color: '#ef4444', width: 2, dash: 'dash' },
    };

    const layout = {
      ...PLOTLY_LAYOUT_BASE,
      title: { text: `${COMP_NOMBRES[comp] || comp} — Distribución por programa`, font: { size: 14 } },
      yaxis: { title: 'Puntaje', range: [0, 310], gridcolor: '#f1f5f9' },
      xaxis: { tickangle: -20, automargin: true },
      shapes: [umbral],
      showlegend: false,
    };

    Plotly.newPlot(el, traces, layout, PLOTLY_CONFIG);
  },
};
