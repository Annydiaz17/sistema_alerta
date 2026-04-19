/**
 * SaberAnalítica — Filtros interactivos (filtros.js)
 */

const filtros = {
  estado: { programa: 'Todos', jornada: 'Todos' },
  callbacks: [],

  inicializar(programas, jornadas, onCambio) {
    this.callbacks = [onCambio];
    this.estado = { programa: 'Todos', jornada: 'Todos' };
    this._renderizar(programas, jornadas);
  },

  _renderizar(programas, jornadas) {
    const bar = document.getElementById('filtros-bar');
    if (!bar) return;

    bar.innerHTML = `
      <span class="filtro-label">🔍 Filtrar por:</span>
      <select class="filtro-select" id="filtro-programa" onchange="filtros._cambiar('programa', this.value)">
        <option value="Todos">Todos los programas</option>
        ${programas.map(p => `<option value="${p}">${p}</option>`).join('')}
      </select>
      <select class="filtro-select" id="filtro-jornada" onchange="filtros._cambiar('jornada', this.value)">
        <option value="Todos">Todas las jornadas</option>
        ${jornadas.map(j => `<option value="${j}">${j}</option>`).join('')}
      </select>
      <button class="filtro-reset" onclick="filtros.resetear()">✕ Limpiar filtros</button>
    `;
  },

  _cambiar(tipo, valor) {
    this.estado[tipo] = valor;
    this.callbacks.forEach(fn => fn(this.estado));
  },

  resetear() {
    this.estado = { programa: 'Todos', jornada: 'Todos' };
    const sp = document.getElementById('filtro-programa');
    const sj = document.getElementById('filtro-jornada');
    if (sp) sp.value = 'Todos';
    if (sj) sj.value = 'Todos';
    this.callbacks.forEach(fn => fn(this.estado));
  }
};
