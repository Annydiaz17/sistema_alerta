/**
 * SaberAnalítica — Página de carga de archivo (upload.js)
 */

const pageUpload = {
  _archivoSeleccionado: null,

  render() {
    return `
      <div class="page">
        <div class="container upload-page">
          <div class="anim-fadeInUp">
            <h1 class="upload-title">Cargar archivo de resultados</h1>
            <p style="color: var(--text-secondary); margin-bottom: var(--space-6);">
              Sube tu archivo Excel con los resultados Saber Pro. 
              El sistema detectará automáticamente la hoja y las columnas.
            </p>
          </div>

          <!-- Zona de carga -->
          <div class="card anim-fadeInUp anim-delay-100">
            <div class="dropzone" id="dropzone">
              <input type="file" id="file-input" accept=".xlsx,.xls"
                     onchange="pageUpload.onFileSelect(event)" />
              <div class="dropzone-icon">📂</div>
              <div class="dropzone-title">Arrastra tu archivo aquí</div>
              <div class="dropzone-sub">o haz clic para seleccionarlo</div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">
                Formatos aceptados: .xlsx · .xls · Máximo 10 MB
              </div>
            </div>

            <!-- Archivo seleccionado -->
            <div class="dropzone-selected" id="archivo-seleccionado">
              <span style="font-size: 1.4rem;">📄</span>
              <div style="flex:1; min-width:0;">
                <div id="archivo-nombre" style="font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"></div>
                <div id="archivo-meta" style="font-size:0.75rem; color: var(--text-muted);"></div>
              </div>
              <button class="btn btn-ghost btn-sm" onclick="pageUpload.limpiar()">✕ Quitar</button>
            </div>
          </div>

          <!-- Instrucciones -->
          <div class="instrucciones anim-fadeInUp anim-delay-200">
            <h4>ℹ️ Antes de subir tu archivo</h4>
            <ul>
              <li>El archivo debe tener una hoja con los resultados de los 5 módulos Saber Pro.</li>
              <li>No es necesario usar un nombre específico en la hoja — el sistema la detecta automáticamente.</li>
              <li>El valor "IA" en Comunicación Escrita es válido. El sistema lo reconocerá sin errores.</li>
              <li>Las celdas vacías en los puntajes son normales y no bloquean el análisis.</li>
              <li>Si no tienes el formato exacto, descarga la <button class="btn btn-ghost btn-sm" onclick="pageUpload.descargarPlantilla()" style="display:inline-flex;">plantilla de referencia</button>.</li>
            </ul>
          </div>

          <!-- Acciones -->
          <div class="flex gap-4 anim-fadeInUp anim-delay-300" style="flex-wrap:wrap; align-items:center;">
            <button class="btn btn-primary btn-lg" id="btn-analizar"
                    onclick="pageUpload.analizar()" disabled>
              <span>🔍</span> Analizar archivo
            </button>
            <button class="btn btn-ghost" onclick="pageUpload.descargarPlantilla()">
              📥 Descargar plantilla
            </button>
            <button class="btn btn-ghost" onclick="app.navigate('landing')">
              ← Volver
            </button>
          </div>

          <!-- Advertencia de privacidad -->
          <p class="text-xs text-muted mt-8" style="max-width: 500px;">
            🔒 El archivo se procesa localmente en tu servidor. Los números de identificación 
            de los estudiantes nunca se exponen en URLs ni en los reportes.
          </p>
        </div>
      </div>
    `;
  },

  afterRender() {
    this._añadirEventosDragDrop();
    this._verificarBackend();
  },

  _añadirEventosDragDrop() {
    const dropzone = document.getElementById('dropzone');
    if (!dropzone) return;

    dropzone.addEventListener('dragover', e => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('drag-over');
    });

    dropzone.addEventListener('drop', e => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      const files = e.dataTransfer?.files;
      if (files?.length > 0) this._procesarArchivo(files[0]);
    });
  },

  async _verificarBackend() {
    const disponible = await api.verificarSalud();
    if (!disponible) {
      ui.toast(
        'El servidor no está disponible. Asegúrate de que el backend esté corriendo en el puerto 8000.',
        'warn',
        8000
      );
    }
  },

  onFileSelect(event) {
    const file = event.target.files?.[0];
    if (file) this._procesarArchivo(file);
  },

  _procesarArchivo(file) {
    const extensiones = ['.xlsx', '.xls'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();

    if (!extensiones.includes(ext)) {
      ui.toast(
        `El archivo "${file.name}" no tiene un formato válido. Solo se aceptan archivos .xlsx o .xls.`,
        'error'
      );
      return;
    }

    const mb = file.size / 1024 / 1024;
    if (mb > 10) {
      ui.toast(`El archivo pesa ${mb.toFixed(1)} MB. El máximo permitido es 10 MB.`, 'error');
      return;
    }

    this._archivoSeleccionado = file;
    this._mostrarArchivoSeleccionado(file, mb);
  },

  _mostrarArchivoSeleccionado(file, mb) {
    const contenedor = document.getElementById('archivo-seleccionado');
    const nombre     = document.getElementById('archivo-nombre');
    const meta       = document.getElementById('archivo-meta');
    const btnAnalizar = document.getElementById('btn-analizar');

    if (contenedor) contenedor.classList.add('show');
    if (nombre) nombre.textContent = file.name;
    if (meta) meta.textContent = `${mb.toFixed(2)} MB · ${new Date().toLocaleString('es-CO')}`;
    if (btnAnalizar) btnAnalizar.disabled = false;
  },

  limpiar() {
    this._archivoSeleccionado = null;
    const input = document.getElementById('file-input');
    if (input) input.value = '';
    const contenedor = document.getElementById('archivo-seleccionado');
    if (contenedor) contenedor.classList.remove('show');
    const btn = document.getElementById('btn-analizar');
    if (btn) btn.disabled = true;
  },

  async analizar() {
    if (!this._archivoSeleccionado) {
      ui.toast('Por favor selecciona un archivo Excel antes de continuar.', 'warn');
      return;
    }

    const btn = document.getElementById('btn-analizar');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<div class="spinner spinner-sm"></div> Analizando...';
    }

    // Guardar archivo en estado global para posible re-procesamiento
    app.estado.archivoActual = this._archivoSeleccionado;

    // Navegar a pantalla de validación/carga (con el archivo)
    app.navigate('validacion', { archivo: this._archivoSeleccionado });
  },

  async descargarPlantilla() {
    try {
      await api.descargarPlantilla();
      ui.toast('Plantilla descargada.', 'ok');
    } catch (e) {
      ui.toast(e.message, 'warn');
    }
  }
};
