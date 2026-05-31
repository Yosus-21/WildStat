#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  cat <<EOF
WildStat demo startup helper

This script is intentionally safe: it does not delete data and does not run migrations.

Usage:
  scripts/start-demo.sh          Print the recommended startup commands
  scripts/start-demo.sh --infra  Start PostgreSQL and Redis with docker compose

Recommended terminal layout:

1) Infrastructure
   cd "$ROOT_DIR"
   docker compose up -d postgres redis

2) FastAPI AI service
   cd "$ROOT_DIR/ai-service"
   source .venv/bin/activate
   PYTHONPATH=src:. uvicorn app.main:app --host 127.0.0.1 --port 8010

3) Backend
   cd "$ROOT_DIR/backend"
   npm run start:dev

4) Frontend
   cd "$ROOT_DIR/frontend"
   npm run dev -- --host 127.0.0.1 --port 5173

Verification:
   cd "$ROOT_DIR"
   API_BASE=http://127.0.0.1:3000/api/v1 ./scripts/check-demo.sh

Stop services:
   Press Ctrl+C in FastAPI, backend, and frontend terminals.
   docker compose stop redis postgres
EOF
}

if [[ "${1:-}" == "--infra" ]]; then
  cd "$ROOT_DIR"
  docker compose up -d postgres redis
  docker compose ps postgres redis
  exit 0
fi

usage
