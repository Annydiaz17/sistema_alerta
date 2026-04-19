/**
 * SaberAnalítica — Wrappers de Chart.js (charts.js)
 * Todos los gráficos del dashboard se crean desde aquí.
 */

const NIVEL_COLORS = {
  1: '#ef4444',
  2: '#f59e0b',
  3: '#10b981',
  4: '#059669',
};

const charts = {
  _instancias: {},

  _destroy(id) {
    if (this._instancias[id]) {
      this._instancias[id].destroy();
      delete this._instancias[id];
    }
  },

  _save(id, chart) {
    this._instancias[id] = chart;
    return chart;
  },

  /**
   * Barras horizontales — Promedio por componente
   */
  promedioComponentes(canvasId, componentes, orden) {
    this._destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const labels = orden.map(k => componentes[k]?.nombre || k);
    const datos  = orden.map(k => componentes[k]?.promedio || 0);
    const colors = orden.map(k => componentes[k]?.color || '#6366f1');

    return this._save(canvasId, new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Promedio',
          data: datos,
          backgroundColor: colors.map(c => c + '33'),
          borderColor: colors,
          borderWidth: 2,
          borderRadius: 6,
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.parsed.x.toFixed(1)} puntos`
            }
          }
        },
        scales: {
          x: {
            min: 0, max: 300,
            grid: { color: '#f1f5f9' },
            ticks: { font: { size: 11 } }
          },
          y: {
            grid: { display: false },
            ticks: { font: { size: 11 } }
          }
        }
      }
    }));
  },

  /**
   * Stacked barras — Distribución de niveles por componente
   */
  distribucionNiveles(canvasId, componentes, orden) {
    this._destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const labels = orden.map(k => componentes[k]?.nombre || k);

    const datasets = [1, 2, 3, 4].map(nivel => ({
      label: `Nivel ${nivel}`,
      data: orden.map(k => {
        const dist = componentes[k]?.distribucion_niveles || {};
        const total = Object.values(dist).reduce((a, b) => a + b, 0);
        return total > 0 ? ((dist[nivel] || 0) / total * 100) : 0;
      }),
      backgroundColor: NIVEL_COLORS[nivel],
      borderRadius: nivel === 1 ? { topLeft: 0, bottomLeft: 4 } : nivel === 4 ? { topRight: 4, bottomRight: 4 } : 0,
    }));

    return this._save(canvasId, new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { size: 11 }, padding: 12 }
          },
          tooltip: {
            callbacks: {
              label: ctx => ` Nivel ${ctx.datasetIndex + 1}: ${ctx.parsed.y.toFixed(1)}%`
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { font: { size: 10 }, maxRotation: 30 }
          },
          y: {
            stacked: true,
            min: 0, max: 100,
            grid: { color: '#f1f5f9' },
            ticks: { font: { size: 11 }, callback: v => v + '%' }
          }
        }
      }
    }));
  },

  /**
   * Radar — Comparativo de promedios entre programas
   */
  radarProgramas(canvasId, porPrograma, orden, componentes) {
    this._destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const labels = orden.map(k => componentes[k]?.nombre?.split(' ')[0] || k);
    const paleta = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e', '#06b6d4'];

    const datasets = Object.entries(porPrograma).map(([prog, datos], i) => {
      const comps = datos.componentes || {};
      return {
        label: prog,
        data: orden.map(k => comps[k]?.promedio || 0),
        backgroundColor: paleta[i % paleta.length] + '22',
        borderColor: paleta[i % paleta.length],
        borderWidth: 2,
        pointBackgroundColor: paleta[i % paleta.length],
        pointRadius: 4,
      };
    });

    return this._save(canvasId, new Chart(ctx, {
      type: 'radar',
      data: { labels, datasets },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { size: 10 }, padding: 10, boxWidth: 10 }
          }
        },
        scales: {
          r: {
            min: 0, max: 300,
            ticks: { display: false },
            grid: { color: '#e2e8f0' },
            pointLabels: { font: { size: 10 } }
          }
        }
      }
    }));
  },

  /**
   * Donut — Distribución de niveles de un componente
   */
  donutNiveles(canvasId, distribucion) {
    this._destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const data   = [1, 2, 3, 4].map(n => distribucion[n] || 0);
    const colors = [NIVEL_COLORS[1], NIVEL_COLORS[2], NIVEL_COLORS[3], NIVEL_COLORS[4]];

    return this._save(canvasId, new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Nivel 1', 'Nivel 2', 'Nivel 3', 'Nivel 4'],
        datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }]
      },
      options: {
        responsive: true,
        cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed} estudiantes` } }
        }
      }
    }));
  },

  /**
   * Histograma — Distribución de puntajes de un componente
   */
  histograma(canvasId, histData, color, componenteNombre) {
    this._destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const bins   = histData.bins || [];
    const counts = histData.counts || [];
    const labels = bins.slice(0, -1).map((b, i) => `${Math.round(b)}–${Math.round(bins[i + 1])}`);

    return this._save(canvasId, new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: componenteNombre,
          data: counts,
          backgroundColor: color + '88',
          borderColor: color,
          borderWidth: 1.5,
          borderRadius: 3,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} estudiantes` } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 45 } },
          y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 }, precision: 0 } }
        }
      }
    }));
  },

  /**
   * Barras agrupadas — Comparativa de promedio por jornada
   */
  promedioJornadas(canvasId, porJornada, orden, componentes) {
    this._destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const jornadas = Object.keys(porJornada);
    const labels   = orden.map(k => componentes[k]?.nombre?.split(' ')[0] || k);
    const paleta   = ['#3b82f6', '#f59e0b', '#10b981', '#f43f5e'];

    const datasets = jornadas.map((jorn, i) => ({
      label: jorn,
      data: orden.map(k => porJornada[jorn]?.componentes?.[k]?.promedio || 0),
      backgroundColor: paleta[i % paleta.length] + '99',
      borderColor: paleta[i % paleta.length],
      borderWidth: 2,
      borderRadius: 4,
    }));

    return this._save(canvasId, new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 10 } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}` } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: { min: 0, max: 300, grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } }
        }
      }
    }));
  },

  destroyAll() {
    Object.keys(this._instancias).forEach(id => this._destroy(id));
  }
};
