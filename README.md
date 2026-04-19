# SaberAnalítica 🎓📊

**Sistema de diagnóstico inteligente para resultados Saber Pro**

Carga, valida, limpia y analiza archivos Excel de resultados Saber Pro de forma automática. Genera un dashboard interactivo con gráficos, comparativos por programa y jornada, y diagnóstico con insights redactados en lenguaje claro.

---

## 🚀 Inicio rápido

### 1. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 2. Iniciar el servidor

```bash
# Desde la raíz del proyecto
uvicorn backend.main:app --reload --port 8000
```

### 3. Abrir la aplicación

Abre tu navegador en: **http://localhost:8000**

O si prefieres Live Server en VS Code, abre `frontend/index.html`.

---

## 📁 Estructura del proyecto

```
sistema_alerta/
├── backend/
│   ├── main.py                    # FastAPI - rutas principales
│   ├── config.py                  # Rangos ICFES y constantes configurables
│   ├── modules/
│   │   ├── detector.py            # Detecta hoja y columnas por estructura
│   │   ├── validador.py           # Valida con 3 severidades
│   │   ├── limpiador.py           # Limpieza sin imputación de medianas
│   │   ├── transformador.py       # Recalcula puntajes y niveles
│   │   └── motor_diagnostico.py   # Genera insights y diagnóstico
│   └── utils/
│       ├── exportador_excel.py    # Excel con 4 hojas
│       └── exportador_pdf.py      # PDF con ReportLab
├── frontend/
│   ├── index.html                 # SPA shell
│   ├── css/                       # Design system completo
│   └── js/                        # Router, páginas y componentes
└── requirements.txt
```

---

## ✅ Características principales

- **Detección automática de hoja** por estructura de columnas (no por nombre)
- **Valor "IA" tratado correctamente** como categoría especial ICFES, nunca como error
- **Sin imputación de medianas** — los nulos se excluyen con transparencia
- **Puntaje total siempre recalculado** desde datos crudos
- **Niveles de desempeño recalculados** con tabla ICFES configurable en `config.py`
- **Dashboard con filtros** por programa y jornada en tiempo real
- **Nivel de confianza del diagnóstico** según calidad del archivo
- **Exportación PDF y Excel** con 4 hojas organizadas
- **IDs anonimizados** en todos los reportes de alertas
- **Mensajes de error en español claro** para usuarios no técnicos

---

## 🔧 Configuración

Los rangos oficiales del ICFES y umbrales son editables en `backend/config.py`:

```python
RANGOS_NIVELES = {
    "razonamiento_cuantitativo": [(0,125,1),(126,153,2),(154,202,3),(203,300,4)],
    "lectura_critica":           [(0,124,1),(125,157,2),(158,199,3),(200,300,4)],
    ...
}
```

---

## 🌐 Despliegue online (Fase 1.5)

**Backend** → [Render](https://render.com) o [Railway](https://railway.app)
```bash
# En render.com: Start Command
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

**Frontend** → [Netlify](https://netlify.com) o [GitHub Pages]
- Cambia `API_BASE` en `frontend/js/api.js` a la URL de producción.

---

## 🔥 Preparación para Firebase (Fase 2)

Las funciones del backend se migrarán a Cloud Functions for Firebase.
Los datos procesados se guardarán en Firestore (sin datos personales).
Ver el plan completo en `implementation_plan.md`.

---

## 📝 Notas de privacidad

- Los **números de identificación** nunca se exponen en URLs ni en reportes
- El **procesamiento** ocurre en el servidor local
- Los **reportes de alertas** usan IDs anonimizados (`EST-0001`)
- No se guardan datos personales en `sessionStorage`
