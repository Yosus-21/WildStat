# WildStat

MVP para monitoreo de jaguar con camaras trampa. Incluye frontend React/Vite,
backend NestJS/PostgreSQL/Prisma, Redis/BullMQ y microservicio IA FastAPI + YOLO.

## Modulos

- Carga de imagen/video desde frontend.
- Deteccion IA de posibles jaguares.
- Procesamiento asincronico con BullMQ.
- Validacion humana.
- Dataset validado.
- Analytics ecologico.
- Exportacion CSV.
- Reporte PDF.

## Requisitos

- Node.js y npm.
- Python 3.12.
- Docker.
- PostgreSQL y Redis via `docker-compose.yml`.

## Arranque rapido

Desde la raiz:

```bash
docker compose up -d postgres redis
```

IA:

```bash
cd ai-service
python -m venv .venv
source .venv/bin/activate
pip install -e .
PYTHONPATH=src:. uvicorn app.main:app --host 127.0.0.1 --port 8010
```

Backend:

```bash
cd backend
npm install
npx prisma migrate dev
npm run seed
npm run start:dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

## URLs

- Frontend: `http://127.0.0.1:5173`
- Backend API: `http://127.0.0.1:3000/api/v1`
- Swagger: `http://127.0.0.1:3000/docs`
- FastAPI: `http://127.0.0.1:8010`

## Credenciales demo

- Investigador: `investigador@faunalens.local`
- Viewer: `viewer@faunalens.local`
- Contrasena: `FaunaLens123!`

## Verificacion

Con todos los servicios arriba:

```bash
./scripts/check-demo.sh
```

Resultado esperado: `13 OK, 0 FAIL`.

## Archivos no incluidos

El repositorio ignora dependencias, entornos virtuales, builds, uploads,
resultados generados, datasets crudos y videos de trabajo. El modelo runtime
esperado por el MVP se conserva en `ai-service/models/yolo/best.pt`.
