# WildStat - Guia de demo

WildStat es un MVP para monitoreo de jaguar con camaras trampa. Combina IA para
detectar posibles eventos, validacion humana, dataset validado, analytics, CSV y PDF.

## Requisitos

- Node.js y npm.
- Python 3.12 con entorno virtual en `ai-service/.venv`.
- Docker para PostgreSQL y Redis.
- Modelo YOLO en `ai-service/models/yolo/best.pt`.

## Servicios base

Desde `/Users/rivero/Downloads/WWF`:

```bash
docker compose up -d postgres redis
```

PostgreSQL queda en `localhost:5432` y Redis en `localhost:6379`.

Tambien puedes ver los comandos ordenados con:

```bash
./scripts/start-demo.sh
```

Para levantar solo PostgreSQL y Redis con Docker Compose:

```bash
./scripts/start-demo.sh --infra
```

## IA FastAPI

```bash
cd /Users/rivero/Downloads/WWF/ai-service
source .venv/bin/activate
PYTHONPATH=src:. uvicorn app.main:app --host 127.0.0.1 --port 8010
```

Verificacion:

```bash
curl http://127.0.0.1:8010/health
curl http://127.0.0.1:8010/model
```

`/model` debe devolver `exists: true`.

## Backend NestJS

```bash
cd /Users/rivero/Downloads/WWF/backend
npm install
npx prisma migrate dev
npm run seed
npm run start:dev
```

API base:

```text
http://127.0.0.1:3000/api/v1
```

Swagger:

```text
http://127.0.0.1:3000/docs
```

## Frontend React

```bash
cd /Users/rivero/Downloads/WWF/frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Abrir:

```text
http://127.0.0.1:5173
```

## Verificacion rapida

Con todos los servicios arriba:

```bash
cd /Users/rivero/Downloads/WWF
API_BASE=http://127.0.0.1:3000/api/v1 ./scripts/check-demo.sh
```

El script verifica FastAPI, modelo YOLO, backend, frontend, Redis, login,
analytics, CSV, PDF, permisos de viewer y endpoint protegido sin token. Tambien
genera respaldos en `demo-assets/`:

- `demo-assets/dataset-demo.csv`
- `demo-assets/reporte-demo.pdf`

## Usuarios demo

Contraseña para ambos:

```text
FaunaLens123!
```

- Investigador: `investigador@faunalens.local`
- Viewer: `viewer@faunalens.local`

El investigador puede validar detecciones. El viewer puede consultar dataset,
analytics, CSV y PDF, pero no debe subir archivos ni validar.

## Cargar imagen o video desde frontend

Ruta:

```text
http://127.0.0.1:5173/media/upload
```

Solo el rol `INVESTIGATOR` puede subir archivos. La pantalla permite seleccionar
proyecto, camara, fecha de grabacion opcional y archivo. Al enviar, usa:

```text
POST /api/v1/media/upload
GET /api/v1/media/:id/status
GET /api/v1/detections?mediaFileId=<id>
```

Formatos permitidos:

- Imagenes: `jpg`, `jpeg`, `png`.
- Videos: `mp4`, `mov`, `avi`, `mkv`.

Limites reales del backend:

- Imagen: 25 MB.
- Video: 500 MB.

Interpretacion de estados:

- `UPLOADED`: archivo recibido y job encolado.
- `PROCESSING`: BullMQ/worker llamando FastAPI + YOLO.
- `PENDING_REVIEW`: se detectaron eventos y estan listos para revision humana.
- `PROCESSED`: archivo procesado sin detecciones sobre el umbral.
- `ERROR`: fallo el procesamiento; revisar `errorMessage`.

Si no hay detecciones, la UI muestra que el archivo fue procesado correctamente,
pero no se encontraron eventos que superen el umbral de confianza.

## Datos demo

El seed crea o actualiza:

- Proyecto: `Monitoreo Jaguar Palmarito 2026`.
- Organizacion: `WWF Bolivia`.
- Responsable: `Equipo WildStat`.
- Area: `TIOC Monte Verde`.
- Area de muestreo: `250 km2`.
- Camaras: `CAM-01`, `CAM-02`, `CAM-03`.
- Especies: Jaguar, Puma, Ocelote, Taitetu, Guaso, Tatu, Jochi.
- Detecciones demo marcadas con `DEMO-SEED`.

El seed es seguro: no borra datos reales y no duplica detecciones demo si ya existen.

## Flujo demo recomendado

1. Login como investigador.
2. Ir a `Subir imagen/video`.
3. Seleccionar el proyecto `Monitoreo Jaguar Palmarito 2026`.
4. Seleccionar una camara demo.
5. Subir una imagen o video y mostrar progreso.
6. Ver resultado IA con timestamp/minuto, confianza, frame y clip si existen.
7. Abrir detecciones pendientes.
8. Revisar una deteccion real si existe.
9. Validar especie, sexo e independencia.
10. Mostrar detecciones validadas.
11. Abrir Dataset validado.
12. Exportar CSV.
13. Abrir Analytics y filtrar por `Monitoreo Jaguar Palmarito 2026`.
14. Mostrar frecuencia por especie, zonas, meses, sexo, actividad, densidad y tendencia.
15. Descargar PDF desde Analytics o desde `/reports`.
16. Login como viewer y mostrar que puede consultar, pero no subir ni validar.

## Endpoints importantes

- `POST /auth/login`
- `GET /projects`
- `POST /media/upload`
- `GET /media/:id/status`
- `GET /detections/pending`
- `PATCH /detections/:id/validate`
- `GET /dataset/validated`
- `GET /dataset/validated/export/csv`
- `GET /analytics/summary`
- `GET /reports/project/:projectId/pdf`

## Errores comunes

- `ECONNREFUSED 127.0.0.1:8010`: FastAPI no esta levantado.
- `ECONNREFUSED Redis`: Redis no esta levantado o el puerto no coincide.
- `model exists false`: falta `ai-service/models/yolo/best.pt`.
- `401 Unauthorized`: token ausente o expirado.
- `403 Forbidden`: el rol no tiene permiso para la accion.
- Media en `ERROR`: revisar `errorMessage` con `GET /media/:id/status`.

## Detener servicios

- FastAPI, backend y frontend: presiona `Ctrl+C` en cada terminal.
- PostgreSQL y Redis de Docker Compose:

```bash
docker compose stop redis postgres
```

No uses comandos destructivos para la demo. Si necesitas limpiar datos, haz backup
primero y confirma el alcance.
