# WildStat — Frontend

React + Vite — Plataforma de revisión humana y dataset validado para monitoreo de jaguar.

## Variables de entorno

Crea un archivo `.env` en la raíz del proyecto frontend:

```
VITE_API_URL=http://127.0.0.1:3000/api/v1
```

## Instalación y desarrollo

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

## Build de producción

```bash
npm run build
npm run preview
```

## Rutas implementadas

| Ruta | Descripción |
|------|-------------|
| `/login` | Inicio de sesión con JWT |
| `/media/upload` | Carga de imagen/video para análisis IA y seguimiento de procesamiento |
| `/detections/pending` | Lista de detecciones pendientes de revisión |
| `/detections/:id/review` | Pantalla completa de revisión de una detección |
| `/detections/validated` | Detecciones validadas/corregidas |
| `/detections/discarded` | Detecciones descartadas |
| `/dataset/validated` | Dataset validado con filtros |
| `/analytics` | Dashboard ecológico con métricas y gráficos |
| `/reports` | Descarga de reportes PDF por proyecto |

## Roles

- **INVESTIGATOR**: puede subir imágenes/videos, ver resultados y validar detecciones
- **VIEWER**: puede ver resultados, dataset, analytics y reportes, pero NO puede subir ni validar

## Carga de imagen/video

Ruta:

```
/media/upload
```

La pantalla permite seleccionar proyecto, cámara, fecha de grabación opcional y archivo.
Después de subir, consulta `GET /media/:id/status` cada 2 segundos y muestra el resultado
del análisis con timestamp/minuto, confianza, frame clave, clip si existe y enlace a
revisión humana.

Formatos permitidos:

- Imágenes: `jpg`, `jpeg`, `png`.
- Videos: `mp4`, `mov`, `avi`, `mkv`.

Límites reales del backend:

- Imagen: 25 MB.
- Video: 500 MB.

Estados:

- `UPLOADED`: archivo recibido por backend.
- `PROCESSING`: BullMQ/worker procesando con FastAPI + YOLO.
- `PENDING_REVIEW`: hay detecciones listas para revisión humana.
- `PROCESSED`: archivo procesado sin detecciones sobre el umbral.
- `ERROR`: falló el procesamiento; revisar `errorMessage`.

## Cómo probar la revisión humana

1. Arranca el backend: `cd backend && npm run start:dev`
2. Arranca el frontend: `cd frontend && npm run dev`
3. Ingresa como investigador en `http://localhost:5173/login`
4. Ve a **Detecciones pendientes** (`/detections/pending`)
5. Haz clic en **Revisar →** en cualquier detección
6. Revisa el frame y el clip (si existe)
7. Completa el formulario: especie, sexo, independencia, estado
8. Haz clic en **Guardar validación**
9. Verifica que desaparece de pendientes y aparece en validadas
10. Comprueba el dataset en `/dataset/validated`

## Dashboard analytics

Ruta:

```
/analytics
```

El dashboard consume:

- `GET /analytics/summary`
- `GET /analytics/species-frequency`
- `GET /analytics/jaguar-abundance`
- `GET /analytics/by-zone`
- `GET /analytics/by-month`
- `GET /analytics/sex-ratio`
- `GET /analytics/activity-by-hour`
- `GET /analytics/simple-density`
- `GET /analytics/shared-habitat`
- `GET /analytics/trend`

Filtros disponibles:

- proyecto;
- especie;
- fecha desde;
- fecha hasta.

Visualizaciones:

- tarjetas de resumen;
- frecuencia por especie;
- eventos por zona;
- eventos por mes;
- proporción de sexos;
- actividad por hora;
- densidad simple por proyecto;
- tendencia;
- hábitat compartido.

Desde `/analytics`, al seleccionar un proyecto aparece el botón **Descargar reporte PDF**.
La descarga usa:

```
GET /reports/project/:projectId/pdf
```

con `responseType: 'blob'`. Los filtros activos `speciesId`, `fromDate` y `toDate`
se envian como query params cuando aplican.

## Reportes PDF

Ruta:

```
/reports
```

La vista permite seleccionar un proyecto y descargar un PDF generado por backend. El
reporte usa datos validados/corregidos, no cuenta descartados, e incluye portada,
resumen, metricas de jaguar, frecuencia por especie, zona, mes, sexo, actividad por
hora, densidad simple, tendencia, habitat compartido y conclusiones automaticas.

Roles permitidos por backend:

- `INVESTIGATOR`
- `VIEWER`

## Exportación CSV

En `/dataset/validated`, el botón **Exportar CSV** descarga:

```
GET /dataset/validated/export/csv
```

La descarga usa `responseType: 'blob'` y genera el archivo:

```
dataset-validado.csv
```

Los filtros activos se envían como query params cuando aplican:

- `projectId`
- `cameraId`
- `speciesId`
- `sex`
- `isIndependent`
- `reviewStatus`
- `fromDate`
- `toDate`

## Flujo recomendado para demo

```
Login (investigador) → Subir imagen/video → Ver progreso IA → Pendientes → Revisar detección → 
  Ver frame + clip → Formulario → Guardar → 
  Validadas → Dataset validado → Analytics → CSV → PDF
```

Verificacion rapida desde la raiz del workspace:

```bash
cd /Users/rivero/Downloads/WWF
./scripts/check-demo.sh
```

## Stack

- React 19 + Vite 8
- React Router DOM 7
- Axios (cliente HTTP con JWT automático)
- Recharts
- CSS Modules (sin Tailwind)
- React Hook Form + Zod (instalados, disponibles para formularios futuros)

## Limitaciones actuales

- No hay gestión de proyectos/cámaras desde el frontend
- Thumbnails de frame se cargan con fetch + Bearer token (necesario por auth)
- La densidad simple es una estimación MVP; no reemplaza modelos científicos como SECR

## Detener frontend

En la terminal de Vite, presiona `Ctrl+C`.

## Estado de entrega

La demo final usa el proyecto `Monitoreo Jaguar Palmarito 2026`, el usuario
investigador `investigador@faunalens.local` y el viewer `viewer@faunalens.local`.
La contraseña demo es `FaunaLens123!`.
