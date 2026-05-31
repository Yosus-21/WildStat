# Evidencias de demo WildStat

Fecha de verificacion: 2026-05-31.

## Backups generados

- PDF: `/Users/rivero/Downloads/WWF/demo-assets/reporte-demo.pdf`
- CSV: `/Users/rivero/Downloads/WWF/demo-assets/dataset-demo.csv`

## Resultado de `scripts/check-demo.sh`

Comando usado:

```bash
API_BASE=http://127.0.0.1:3001/api/v1 FRONTEND_BASE=http://127.0.0.1:5173 ./scripts/check-demo.sh
```

Resultado:

```text
13 OK, 0 FAIL
```

Checks incluidos:

- FastAPI `/health`.
- FastAPI `/model` con `exists=true`.
- Backend API root.
- Frontend `/login`.
- Redis.
- Login investigador.
- Login viewer.
- Proyecto demo.
- Analytics summary.
- CSV backup.
- PDF backup.
- Viewer no puede validar.
- Endpoint protegido sin token devuelve 401.

## Ensayo final de flujo IA

Se probo upload de imagen al backend, procesamiento BullMQ/FastAPI, estado
`PENDING_REVIEW` y validacion humana a `VALIDATED`.

Imagen usada:

```text
/Users/rivero/Downloads/WWF/ai-service/datasets/roboflow/test/images/n02128925_38504_JPEG.rf.2191b906eda5626f47d5c616c2a0b0c5.jpg
```

## Capturas recomendadas

- Login.
- Detecciones pendientes.
- Revision con frame/clip.
- Dataset validado.
- Dashboard analytics.
- Reporte PDF.
