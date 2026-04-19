# Guía de Despliegue — SaberAnalítica en Render.com 🚀

Esta guía te permite publicar tu aplicación en internet de forma **100% gratuita** y **sin tarjeta de crédito**, usando Render.com.

---

## 📋 Requisitos previos
- Una cuenta de **GitHub**.
- Tu código ya debe estar subido a un repositorio en tu GitHub (ej. `https://github.com/TU_USUARIO/sistema_alerta`).

---

## Paso 1 — Crear cuenta en Render (1 minuto)

1. Ve a **[Render.com](https://render.com/)**.
2. Haz clic en **"Get Started"** o **"Sign in"**.
3. Selecciona ingresar con **GitHub** (*Continue with GitHub*).
4. Dale permisos a Render para ver tus repositorios.

---

## Paso 2 — Crear el servicio web (2 minutos)

1. Una vez dentro del panel principal (`Dashboard`), haz clic en el botón superior derecho **"New"** y selecciona **"Web Service"**.
2. Selecciona la opción **"Build and deploy from a Git repository"**.
3. En la lista, conecta y selecciona tu repositorio `sistema_alerta`.
4. Aparecerá un formulario largo, pero solo necesitas verificar esto:
   - **Name**: Ponle un nombre (ej. `saberanalytica-api`).
   - **Language**: Asegúrate de que diga `Docker` (Render lo detecta automáticamente por nuestro archivo `Dockerfile`).
   - **Branch**: `main` (o `master`).
   - **Instance Type**: Baja hasta la sección de pago y asegúrate de elegir **Free ($0 / month)**.
5. Haz clic abajo del todo en **"Create Web Service"**.

---

## Paso 3 — Esperar el despliegue automático (3-5 minutos)

- Ahora verás una pantalla negra (los logs) donde Render está instalando todo "por detrás".
- Verás líneas pasando rápido (descargando Python, instalando FastAPI, etc.).
- Cuando termine (tardará unos minutos), verás un cuadro verde arriba que dice **"Live"**.

> 💡 **¡Tu aplicación ya está en internet!**
> Render te dará una URL (la verás arriba a la izquierda). Será algo como:
> `https://saberanalytica-api-xxxx.onrender.com`

---

## ✅ Verificar que funciona

Abre esa URL que te dio Render en tu navegador y verás la página principal de tu sistema. ¡Prueba a subir el archivo Excel y el sistema hará exactamente lo mismo que hacía en tu computador local!

---

## 🔄 Actualizar el sistema (futuros cambios)

Lo mejor de este sistema es que **se actualiza solo**. 
Si algún día modificas un archivo en tu computador y quieres subir el cambio, solo tienes que hacer esto en PowerShell:

```powershell
git add .
git commit -m "Descripción de mi cambio"
git push origin main
```

¡Render se dará cuenta de que enviaste un cambio a GitHub y **hará el despliegue automáticamente** sin que tengas que tocar nada en su página!

---

## ❓ Datos a tener en cuenta sobre Render (Capa gratuita)

1. **Suspensión por inactividad ("Spin down")**: En el plan gratuito, si nadie usa la aplicación por 15 minutos, Render la "apaga" temporalmente para ahorrar energía. Si alguien entra después, la aplicación **tardará entre 30 y 50 segundos en volver a encenderse** la primera vez. Luego de eso, volverá a ser rápida.
2. **Límite de horas**: Tienes 750 horas de uso activo mensuales gratuitas. Eso es suficiente para tenerlo conectado de lunes a viernes o para uso intermitente en colegios e instituciones.
3. **Privacidad**: Todos los documentos que procesas y su información se destruyen al instante; la RAM del Docker no guarda los Excel subidos.
