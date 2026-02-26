# 📊 Sistema de Alerta Temprana — Saber Pro / TYT

Dashboard interactivo para analizar resultados de pruebas diagnósticas Saber Pro y TYT. Clasifica estudiantes en riesgo, genera gráficas de análisis y permite exportar alertas por programa académico.

## Funcionalidades

- **Carga de datos**: Sube archivos Excel/CSV con resultados de pruebas diagnósticas
- **Limpieza automática**: Maneja valores "IA" (inasistencia), rellena con mediana
- **Detección de columnas**: Identifica automáticamente las columnas del Excel
- **4 gráficas de análisis**: Boxplot por módulo, promedio por módulo, alertas, histograma
- **Análisis por programa**: Boxplot + swarm dots filtrado por carrera
- **Niveles de desempeño**: Detecta y muestra Nivel 1-4 por módulo
- **Alertas multicriteria**: Puntaje < 120, total < 130, o Nivel 1 en Lectura/Razonamiento
- **Exportar Excel**: Un sheet por programa con estudiantes en riesgo

## Módulos evaluados

| Módulo | Umbral |
|---|---|
| Razonamiento Cuantitativo | 120 |
| Lectura Crítica | 120 |
| Competencias Ciudadanas | 120 |
| Inglés | 120 |
| Comunicación Escrita | 120 |

## Tech Stack

- **Frontend**: React + Vite
- **Gráficas**: SVG puro (sin dependencias)
- **Excel**: SheetJS (xlsx) cargado desde CDN

## Instalación

```bash
npm install
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en tu navegador.

## Estructura del proyecto

```
├── constants/          # Constantes, colores, umbrales
├── utils/              # Parser Excel, procesamiento, estadísticas, demo
├── charts/             # 5 componentes SVG de gráficas
├── components/         # UI: tabs, alertas, tabla, upload
├── src/main.jsx        # Entry point de React
├── SaberProDashboard.jsx  # Componente principal
└── c_diagnostico.py    # Script Python original (Colab)
```
