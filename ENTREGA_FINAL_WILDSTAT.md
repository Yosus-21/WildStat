# Entrega Final WildStat

## 1. Estado del proyecto

WildStat es un MVP listo para demo. La entrega incluye frontend, carga de imagen/video, backend, microservicio IA, flujo de validacion humana, dataset validado, analytics ecologico, exportacion CSV y reporte PDF.

## 2. Modulos incluidos

- Frontend.
- Backend.
- IA.
- Carga de imagen/video.
- Validacion humana.
- Analytics.
- CSV.
- PDF.

## 3. Como levantar la demo

Orden recomendado:

1. Redis.
2. IA FastAPI.
3. Backend NestJS.
4. Frontend Vite.

Comandos de referencia:

```bash
docker compose up -d postgres redis
```

```bash
cd ai-service
source .venv/bin/activate
PYTHONPATH=src:. uvicorn app.main:app --host 127.0.0.1 --port 8010
```

```bash
cd backend
npm run start:dev
```

```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

## 4. Credenciales demo

- `investigador@faunalens.local`
- `viewer@faunalens.local`
- Contrasena: `FaunaLens123!`

## 5. Flujo recomendado de presentacion

- Login investigador.
- Ir a `Subir imagen/video`.
- Mostrar proyecto demo.
- Seleccionar camara demo.
- Subir imagen o video y ver progreso.
- Ver resultado IA con timestamp/minuto, confianza, frame clave y clip si existe.
- Mostrar detecciones.
- Validar evento.
- Dataset validado.
- Analytics.
- CSV.
- PDF.

## 6. Archivos importantes

- `README_DEMO.md`.
- `DEMO_SCRIPT.md`.
- `PITCH_FINAL.md`.
- `REPORTE_FINAL_WILDSTAT.md`.
- `CHECKLIST_FINAL.md`.
- `demo-assets/reporte-demo.pdf`.
- `demo-assets/dataset-demo.csv`.

## 7. Carga de imagen/video

Ruta frontend:

```text
http://127.0.0.1:5173/media/upload
```

Solo `INVESTIGATOR` puede subir archivos. `VIEWER` puede consultar resultados,
pero queda bloqueado para carga.

Formatos permitidos:

- Imagenes: `jpg`, `jpeg`, `png`.
- Videos: `mp4`, `mov`, `avi`, `mkv`.

Limites reales del backend:

- Imagen: 25 MB.
- Video: 500 MB.

Estados:

- `UPLOADED`: archivo recibido.
- `PROCESSING`: procesamiento IA en curso.
- `PENDING_REVIEW`: detecciones listas para revision.
- `PROCESSED`: procesado sin detecciones sobre umbral.
- `ERROR`: fallo de procesamiento.

## 8. Riesgos conocidos

- Redis debe estar levantado.
- FastAPI debe estar levantado.
- Puerto 3000 puede estar ocupado.
- Procesamiento de video puede tardar.
- Warning de pg no bloqueante.

## 9. Funcionalidades futuras

- RAG.
- Mapas.
- MegaDetector.
- Mejoras de entrenamiento y calibracion del modelo.
