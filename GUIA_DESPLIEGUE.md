# Guía de Despliegue — SaberAnalítica en Firebase + Cloud Run

Esta guía te lleva de 0 al deploying en producción. Necesitas unos 20 minutos y una cuenta de Google.

---

## 📋 Requisitos previos

- Cuenta de Google (Gmail) con acceso a [console.cloud.google.com](https://console.cloud.google.com)
- PowerShell (ya lo tienes en Windows)
- Docker Desktop instalado → [descargar aquí](https://www.docker.com/products/docker-desktop/)

---

## Paso 1 — Crear el proyecto en Firebase (5 min)

1. Ve a **[console.firebase.google.com](https://console.firebase.google.com)**
2. Clic en **"Agregar proyecto"**
3. Nombre: `saberanalytica` (o el que prefieras)
4. Desactiva Google Analytics si no la necesitas → clic en **"Crear proyecto"**
5. Espera ~1 minuto
6. En la barra lateral, ve a **Compilación → Hosting** y clic en **"Comenzar"** (salta los pasos por ahora)
7. Anota el **ID del proyecto** (aparece en la URL: `console.firebase.google.com/project/TU-ID-AQUI`)

---

## Paso 2 — Instalar las herramientas de Google (5 min)

Abre PowerShell **en la carpeta del proyecto** (`d:\user\Escritorio\sistema_alerta`) y ejecuta:

### 2a. Instalar Firebase CLI
```powershell
npm install -g firebase-tools
```
> Si no tienes Node.js: descárgalo desde [nodejs.org](https://nodejs.org) (versión LTS)

### 2b. Instalar Google Cloud CLI
Descarga el instalador de: https://cloud.google.com/sdk/docs/install  
Ejecuta el `.exe` → siguiente, siguiente, finalizar.

### 2c. Iniciar sesión
```powershell
firebase login
gcloud auth login
```
Ambos abrirán el navegador para autenticarte con tu cuenta de Google.

---

## Paso 3 — Configurar el proyecto

### 3a. Actualiza `.firebaserc`
Abre el archivo `.firebaserc` y reemplaza `TU_PROJECT_ID_AQUI` con el ID de tu proyecto Firebase:
```json
{
  "projects": {
    "default": "saberanalytica-12345"   ← pon el ID real aquí
  }
}
```

### 3b. Vincula gcloud con tu proyecto
```powershell
gcloud config set project TU_PROJECT_ID_AQUI
```

---

## Paso 4 — Desplegar el backend en Cloud Run (5 min)

Cloud Run ejecuta el backend Python en la nube de Google.

```powershell
# Desde la carpeta d:\user\Escritorio\sistema_alerta
gcloud run deploy saberanalytica-api `
  --source . `
  --region us-central1 `
  --platform managed `
  --allow-unauthenticated `
  --memory 512Mi `
  --timeout 120 `
  --set-env-vars SERVE_FRONTEND=false
```

> Este comando construye la imagen Docker y la despliega automáticamente.
> Puede tardar 3-5 minutos la primera vez.

Al terminar, verás una URL como:
```
Service URL: https://saberanalytica-api-XXXX-uc.a.run.app
```

**Guarda esta URL** — la necesitarás en el siguiente paso.

---

## Paso 5 — Verificar el backend

Abre la URL en tu navegador añadiendo `/api/health`:
```
https://saberanalytica-api-XXXX-uc.a.run.app/api/health
```

Deberías ver:
```json
{"status": "ok", "version": "1.0.0", "sistema": "SaberAnalítica"}
```

✅ Si ves eso, el backend está funcionando en la nube.

---

## Paso 6 — Desplegar el frontend en Firebase Hosting (2 min)

```powershell
# Inicializar Firebase (solo la primera vez)
firebase use TU_PROJECT_ID_AQUI

# Desplegar el frontend
firebase deploy --only hosting
```

Al terminar, verás:
```
Hosting URL: https://saberanalytica-12345.web.app
```

---

## Paso 7 — Conectar el frontend con el backend

Firebase Hosting ya está configurado en `firebase.json` para redirigir automáticamente `/api/**` al servicio `saberanalytica-api` en Cloud Run.

**No necesitas cambiar nada en el código** — el archivo `api.js` detecta automáticamente si está en producción y usa rutas relativas.

---

## ✅ Resultado final

| Componente | URL |
|---|---|
| Aplicación web | `https://saberanalytica-XXXXX.web.app` |
| Backend API | `https://saberanalytica-api-XXXX-uc.a.run.app` |
| API docs | `https://saberanalytica-api-XXXX-uc.a.run.app/api/docs` |

---

## 🔄 Actualizar la aplicación (futuros cambios)

Cada vez que hagas cambios:
```powershell
# Actualizar backend
gcloud run deploy saberanalytica-api --source . --region us-central1

# Actualizar frontend
firebase deploy --only hosting
```

---

## ❓ Problemas frecuentes

| Problema | Solución |
|---|---|
| "Permission denied" en gcloud | Ejecuta `gcloud auth login` y vuelve a intentarlo |
| El frontend carga pero la API no responde | Verifica que el rewrite en `firebase.json` tiene el `serviceId` correcto |
| Error 500 en Cloud Run | Revisa los logs: `gcloud logs read --service=saberanalytica-api` |
| Docker no encontrado en el build | Asegúrate de que Docker Desktop esté corriendo antes del deploy |

---

## 💡 Notas importantes

- **Costo**: Cloud Run cobra solo por uso real. Con el tráfico normal de un sistema institucional, el costo mensual debería ser de $0 a $5 USD (hay un generoso tier gratuito).  
- **Seguridad**: Los archivos Excel se procesan en la RAM del servidor y se descartan automáticamente. No se almacenan en ningún disco.
- **Privacidad**: Los números de identificación de los estudiantes nunca se guardan ni se registran en logs.
