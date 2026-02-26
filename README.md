# 📊 Sistema de Alerta Temprana — Saber Pro / TYT

Dashboard interactivo con **Streamlit** para analizar resultados de pruebas diagnósticas Saber Pro y TYT. Clasifica estudiantes en riesgo, genera gráficas de análisis y permite exportar alertas por programa académico.

## Funcionalidades

- **Carga de datos**: Sube archivos Excel/CSV con resultados de pruebas diagnósticas
- **Limpieza automática**: Maneja valores "IA" (inasistencia), rellena con mediana
- **Detección de columnas**: Identifica automáticamente las columnas del Excel
- **5 gráficas interactivas** (Plotly): Boxplot, promedio, alertas, histograma, por programa
- **Análisis por programa**: Boxplot + puntos individuales filtrado por carrera
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

- **Streamlit** — UI interactiva
- **Plotly** — Gráficas interactivas
- **Pandas** — Procesamiento de datos
- **OpenPyXL / XlsxWriter** — Lectura y exportación de Excel

## Instalación

```bash
pip install -r requirements.txt
streamlit run app.py
```

Abre [http://localhost:8501](http://localhost:8501) en tu navegador.

## Estructura

```
├── app.py              ← Dashboard Streamlit (principal)
├── requirements.txt    ← Dependencias Python
├── c_diagnostico.py    ← Script Python original (Colab, referencia)
└── README.md
```
