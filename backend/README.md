# WildStat Backend

Backend NestJS del MVP WildStat. Gestiona autenticacion, proyectos, camaras, archivos multimedia, jobs de procesamiento y detecciones generadas por el microservicio IA FastAPI.

## Variables de entorno

Configura `.env`:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/faunalens?schema=public"
JWT_SECRET="faunalens-dev-secret"
JWT_EXPIRES_IN="1d"
PORT=3000
AI_SERVICE_URL="http://127.0.0.1:8010"
AI_SERVICE_TIMEOUT_MS=300000
REDIS_HOST="localhost"
REDIS_PORT=6379
UPLOADS_DIR="uploads"
MAX_UPLOAD_SIZE_MB=500
```

`AI_SERVICE_URL` debe apuntar al microservicio Python. No esta hardcodeado en el codigo.

## Setup

```bash
npm install
npx prisma migrate dev
npx prisma generate
npm run seed
```

Usuario seed:

- email: `investigador@faunalens.local`
- password: `FaunaLens123!`
- rol: `INVESTIGATOR`

## Levantar servicios

FastAPI:

```bash
cd /Users/rivero/Downloads/WWF/ai-service
PYTHONPATH=src:. .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8010
```

Redis:

```bash
cd /Users/rivero/Downloads/WWF
docker compose up -d redis
```

Backend:

```bash
cd /Users/rivero/Downloads/WWF/backend
npm run start:dev
```

Swagger:

```text
http://127.0.0.1:3000/docs
```

API base:

```text
http://127.0.0.1:3000/api/v1
```

Verificacion rapida desde la raiz del workspace:

```bash
cd /Users/rivero/Downloads/WWF
API_BASE=http://127.0.0.1:3000/api/v1 ./scripts/check-demo.sh
```

## Flujo IA

1. `POST /media/upload` recibe imagen o video con Multer.
2. Guarda el archivo en `uploads/projects/<projectId>/cameras/<cameraId>/images|videos`.
3. Crea `MediaFile` con `processingStatus=UPLOADED`.
4. Encola un job BullMQ en `media-processing`.
5. El worker cambia el estado a `PROCESSING`.
6. `AiClientService` llama a FastAPI:
   - imagen: `POST /detect/image`
   - video: `POST /detect/video`
7. El backend guarda eventos en `Detection`.
8. Si hay detecciones, el archivo queda en `PENDING_REVIEW`; si no hay, queda en `PROCESSED`.
9. Si falla, queda en `ERROR` con `errorMessage`.

## Endpoints principales

Health IA desde NestJS:

```bash
curl http://127.0.0.1:3000/api/v1/ai/health \
  -H "Authorization: Bearer $TOKEN"
```

Subir imagen:

```bash
curl -X POST http://127.0.0.1:3000/api/v1/media/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "projectId=$PROJECT_ID" \
  -F "cameraId=$CAMERA_ID" \
  -F "recordingDate=2026-05-30T12:00:00.000Z" \
  -F "file=@/ruta/imagen.jpg"
```

Subir video:

```bash
curl -X POST http://127.0.0.1:3000/api/v1/media/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "projectId=$PROJECT_ID" \
  -F "cameraId=$CAMERA_ID" \
  -F "recordingDate=2026-05-30T12:00:00.000Z" \
  -F "file=@/ruta/video.mp4;type=video/mp4"
```

Consultar estado:

```bash
curl http://127.0.0.1:3000/api/v1/media/$MEDIA_FILE_ID/status \
  -H "Authorization: Bearer $TOKEN"
```

Consultar detecciones pendientes:

```bash
curl http://127.0.0.1:3000/api/v1/detections/pending \
  -H "Authorization: Bearer $TOKEN"
```

Servir artefactos generados por IA:

```bash
curl http://127.0.0.1:3000/api/v1/detections/$DETECTION_ID/frame \
  -H "Authorization: Bearer $TOKEN" \
  -o frame.jpg

curl http://127.0.0.1:3000/api/v1/detections/$DETECTION_ID/clip \
  -H "Authorization: Bearer $TOKEN" \
  -o clip.mp4
```

Reporte PDF de proyecto:

```bash
curl "http://127.0.0.1:3000/api/v1/reports/project/$PROJECT_ID/pdf?fromDate=2026-01-01&toDate=2026-12-31" \
  -H "Authorization: Bearer $TOKEN" \
  -o reporte-wildstat.pdf
```

El endpoint `GET /reports/project/:projectId/pdf` requiere JWT y permite los roles
`INVESTIGATOR` y `VIEWER`. Devuelve `Content-Type: application/pdf` y
`Content-Disposition: attachment; filename="reporte-wildstat-<proyecto>.pdf"`.
Acepta filtros opcionales `fromDate`, `toDate`, `speciesId` y `cameraId`.
El PDF se genera bajo demanda, registra una fila en `Report` con metadata basica y usa
detecciones `VALIDATED` o `CORRECTED` para las metricas ecologicas.

## Formatos permitidos

Imagenes:

- `jpg`
- `jpeg`
- `png`

Videos:

- `mp4`
- `avi`
- `mov`
- `mkv`

Tamano maximo actual:

- imagen: 25 MB
- video: 500 MB

## Respuesta de upload

```json
{
  "mediaFile": {
    "id": "cmpt...",
    "fileType": "VIDEO",
    "processingStatus": "UPLOADED"
  },
  "jobId": "3"
}
```

## Errores comunes

- `ECONNREFUSED 127.0.0.1:8010`: FastAPI no esta levantado o `AI_SERVICE_URL` apunta a otro puerto.
- `ECONNREFUSED Redis`: Redis no esta levantado o `REDIS_PORT` no coincide.
- `Unsupported media format`: extension o MIME no permitido.
- `processingStatus=ERROR`: revisar `errorMessage` en `GET /media/:id/status`.

## Detener backend y servicios

- Backend en modo dev: `Ctrl+C`.
- Redis/PostgreSQL de Docker Compose:

```bash
cd /Users/rivero/Downloads/WWF
docker compose stop redis postgres
```

## Siguiente fase

Validacion humana:

- confirmar especie;
- registrar sexo;
- marcar individuo independiente;
- relacionar eventos;
- guardar observaciones;
- cambiar `reviewStatus` a `VALIDATED`, `CORRECTED`, `DISCARDED` o `DOUBTFUL`.

## Validacion humana

Las detecciones generadas por IA quedan inicialmente en `reviewStatus=PENDING`.
Un usuario con rol `INVESTIGATOR` puede validar o descartar cada deteccion.

Estados de revision:

- `PENDING`: pendiente de revision humana.
- `VALIDATED`: la sugerencia IA fue confirmada.
- `CORRECTED`: habia animal, pero se corrigio especie u otros datos.
- `DISCARDED`: falso positivo o no hay animal.
- `DOUBTFUL`: caso dudoso para revision posterior.

Opciones de sexo:

- `MALE`
- `FEMALE`
- `UNDETERMINED`

Opciones de individuo independiente:

- `YES`
- `NO`
- `UNDETERMINED`

Consultar especies:

```bash
curl http://127.0.0.1:3000/api/v1/species \
  -H "Authorization: Bearer $TOKEN"
```

Obtener el `speciesId` de Jaguar:

```bash
JAGUAR_ID=$(curl -s http://127.0.0.1:3000/api/v1/species \
  -H "Authorization: Bearer $TOKEN" \
  | node -e 'const fs=require("fs"); const s=JSON.parse(fs.readFileSync(0,"utf8")); process.stdout.write(s.find(x=>x.commonName==="Jaguar").id)')
```

Contexto para la pantalla de validacion:

```bash
curl http://127.0.0.1:3000/api/v1/detections/$DETECTION_ID/validation-context \
  -H "Authorization: Bearer $TOKEN"
```

Validar como jaguar macho independiente:

```bash
curl -X PATCH http://127.0.0.1:3000/api/v1/detections/$DETECTION_ID/validate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "hasAnimal": true,
    "validatedSpeciesId": "'"$JAGUAR_ID"'",
    "sex": "MALE",
    "isIndependent": "YES",
    "reviewStatus": "VALIDATED",
    "notes": "Jaguar macho visible, evento independiente."
  }'
```

Descartar falso positivo:

```bash
curl -X PATCH http://127.0.0.1:3000/api/v1/detections/$DETECTION_ID/validate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "hasAnimal": false,
    "sex": "UNDETERMINED",
    "isIndependent": "UNDETERMINED",
    "reviewStatus": "DISCARDED",
    "notes": "Movimiento de vegetacion, falso positivo."
  }'
```

Cambiar solo estado de revision:

```bash
curl -X PATCH http://127.0.0.1:3000/api/v1/detections/$DETECTION_ID/review-status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reviewStatus":"DOUBTFUL"}'
```

Consultar validadas y descartadas:

```bash
curl http://127.0.0.1:3000/api/v1/detections/validated \
  -H "Authorization: Bearer $TOKEN"

curl http://127.0.0.1:3000/api/v1/detections/discarded \
  -H "Authorization: Bearer $TOKEN"
```

Dataset validado:

```bash
curl "http://127.0.0.1:3000/api/v1/dataset/validated?projectId=$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN"
```

`GET /dataset/validated` devuelve detecciones `VALIDATED` y `CORRECTED`, con proyecto, camara, archivo, fecha, especie validada, sexo, independencia, relacion con evento anterior, revisor y `validatedAt`.

## Analytics ecológico

Los endpoints de analytics se basan en detecciones `VALIDATED` y `CORRECTED` con `hasAnimal = true`. Los descartados no se contabilizan.

### Roles

- `INVESTIGATOR`: acceso completo a analytics y exportación CSV.
- `VIEWER`: puede consultar analytics (solo lectura).

### Endpoints

```bash
# Resumen general
curl "http://127.0.0.1:3000/api/v1/analytics/summary" \
  -H "Authorization: Bearer $TOKEN"

# Frecuencia por especie
curl "http://127.0.0.1:3000/api/v1/analytics/species-frequency?projectId=$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN"

# Abundancia de jaguar
curl "http://127.0.0.1:3000/api/v1/analytics/jaguar-abundance?projectId=$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN"

# Eventos por zona
curl "http://127.0.0.1:3000/api/v1/analytics/by-zone?projectId=$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN"

# Eventos por mes (devuelve 12 meses)
curl "http://127.0.0.1:3000/api/v1/analytics/by-month?projectId=$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN"

# Proporción de sexos
curl "http://127.0.0.1:3000/api/v1/analytics/sex-ratio?speciesId=$JAGUAR_ID" \
  -H "Authorization: Bearer $TOKEN"

# Actividad por hora (devuelve 24 horas)
curl "http://127.0.0.1:3000/api/v1/analytics/activity-by-hour?speciesId=$JAGUAR_ID" \
  -H "Authorization: Bearer $TOKEN"

# Densidad poblacional simple (requiere samplingAreaKm2 en el proyecto)
curl "http://127.0.0.1:3000/api/v1/analytics/simple-density?projectId=$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN"

# Hábitat compartido con jaguar
curl "http://127.0.0.1:3000/api/v1/analytics/shared-habitat?projectId=$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN"

# Tendencia orientativa
curl "http://127.0.0.1:3000/api/v1/analytics/trend?projectId=$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### Fórmula de densidad simple

```
densityPer100Km2 = independentJaguarEvents / samplingAreaKm2 * 100
```

Esta es una estimación simplificada para MVP. No reemplaza modelos científicos como SECR o distancia de muestreo. Requiere que `samplingAreaKm2` esté definido en el proyecto.

### Tendencia

La tendencia compara el último periodo mensual vs. el anterior en eventos independientes de jaguar.

- `INCREASING`: parece aumentar
- `DECREASING`: parece disminuir
- `STABLE`: diferencia menor al 10%
- `INSUFFICIENT_DATA`: menos de 2 periodos con datos

**Nota:** es una interpretación orientativa, no una inferencia poblacional definitiva.

## Exportación CSV

```bash
# Dataset completo
curl "http://127.0.0.1:3000/api/v1/dataset/validated/export/csv" \
  -H "Authorization: Bearer $TOKEN" \
  -o dataset-validado.csv

# Con filtros
curl "http://127.0.0.1:3000/api/v1/dataset/validated/export/csv?projectId=$PROJECT_ID&speciesId=$JAGUAR_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -o jaguar-dataset.csv
```

Columnas del CSV: `Proyecto`, `Camara`, `Zona`, `Latitud`, `Longitud`, `Archivo`, `TipoArchivo`, `FechaGrabacion`, `Mes`, `Hora`, `MinutoVideo`, `EspecieIA`, `ConfianzaIA`, `EspecieValidada`, `NombreCientifico`, `Sexo`, `IndividuoIndependiente`, `EventoRelacionado`, `EstadoRevision`, `Observaciones`, `Revisor`, `FechaValidacion`.

El CSV incluye BOM UTF-8 para compatibilidad con Excel.
