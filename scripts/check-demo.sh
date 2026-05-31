#!/usr/bin/env bash
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_BASE="${API_BASE:-http://127.0.0.1:3000/api/v1}"
AI_BASE="${AI_BASE:-http://127.0.0.1:8010}"
FRONTEND_BASE="${FRONTEND_BASE:-http://127.0.0.1:5173}"
DEMO_EMAIL="${DEMO_EMAIL:-investigador@faunalens.local}"
VIEWER_EMAIL="${VIEWER_EMAIL:-viewer@faunalens.local}"
DEMO_PASSWORD="${DEMO_PASSWORD:-FaunaLens123!}"
ASSETS_DIR="$ROOT_DIR/demo-assets"

mkdir -p "$ASSETS_DIR"

OK_COUNT=0
FAIL_COUNT=0

ok() {
  printf 'OK   %s\n' "$1"
  OK_COUNT=$((OK_COUNT + 1))
}

fail() {
  printf 'FAIL %s\n' "$1"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

json_eval() {
  node -e "$1" 2>/dev/null
}

check_http() {
  local label="$1"
  local url="$2"
  if curl -fsS --max-time 8 "$url" >/tmp/faunalens-check.out 2>/tmp/faunalens-check.err; then
    ok "$label"
    return 0
  fi
  fail "$label ($(cat /tmp/faunalens-check.err))"
  return 1
}

printf 'WildStat demo check\n'
printf 'API_BASE=%s\nAI_BASE=%s\nFRONTEND_BASE=%s\n\n' "$API_BASE" "$AI_BASE" "$FRONTEND_BASE"

check_http "FastAPI /health" "$AI_BASE/health"

MODEL_JSON="$(curl -fsS --max-time 8 "$AI_BASE/model" 2>/dev/null)"
if [[ -n "$MODEL_JSON" ]] && printf '%s' "$MODEL_JSON" | json_eval "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>process.exit(JSON.parse(s).exists===true?0:1))"; then
  ok "FastAPI /model exists=true"
else
  fail "FastAPI /model exists=true"
fi

check_http "Backend API root" "$API_BASE"
check_http "Frontend responds" "$FRONTEND_BASE/login"

if docker exec faunalens_redis redis-cli ping >/tmp/faunalens-redis.out 2>/dev/null || docker exec faunalens-redis redis-cli ping >/tmp/faunalens-redis.out 2>/dev/null; then
  ok "Redis responds"
else
  fail "Redis responds"
fi

LOGIN_JSON="$(curl -fsS --max-time 8 -X POST "$API_BASE/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$DEMO_EMAIL\",\"password\":\"$DEMO_PASSWORD\"}" 2>/dev/null)"
TOKEN="$(printf '%s' "$LOGIN_JSON" | json_eval "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>console.log(JSON.parse(s).accessToken||''))")"
if [[ -n "$TOKEN" ]]; then
  ok "Login investigador"
else
  fail "Login investigador"
fi

VIEWER_JSON="$(curl -fsS --max-time 8 -X POST "$API_BASE/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$VIEWER_EMAIL\",\"password\":\"$DEMO_PASSWORD\"}" 2>/dev/null)"
VIEWER_TOKEN="$(printf '%s' "$VIEWER_JSON" | json_eval "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>console.log(JSON.parse(s).accessToken||''))")"
if [[ -n "$VIEWER_TOKEN" ]]; then
  ok "Login viewer"
else
  fail "Login viewer"
fi

PROJECT_ID=""
if [[ -n "$TOKEN" ]]; then
  PROJECTS_JSON="$(curl -fsS --max-time 8 "$API_BASE/projects" -H "Authorization: Bearer $TOKEN" 2>/dev/null)"
  PROJECT_ID="$(printf '%s' "$PROJECTS_JSON" | json_eval "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const rows=JSON.parse(s); const p=rows.find(r=>r.name==='Monitoreo Jaguar Palmarito 2026') || rows[0]; console.log(p?.id||'')})")"
fi

if [[ -n "$PROJECT_ID" ]]; then
  ok "Proyecto demo disponible"
else
  fail "Proyecto demo disponible"
fi

if [[ -n "$TOKEN" && -n "$PROJECT_ID" ]]; then
  if curl -fsS --max-time 8 "$API_BASE/analytics/summary?projectId=$PROJECT_ID" -H "Authorization: Bearer $TOKEN" >/tmp/faunalens-analytics.json 2>/dev/null; then
    ok "Analytics summary"
  else
    fail "Analytics summary"
  fi

  if curl -fsS --max-time 12 "$API_BASE/dataset/validated/export/csv?projectId=$PROJECT_ID" -H "Authorization: Bearer $TOKEN" -o "$ASSETS_DIR/dataset-demo.csv" 2>/dev/null; then
    ok "CSV backup generated ($ASSETS_DIR/dataset-demo.csv)"
  else
    fail "CSV backup generated"
  fi

  if [[ -n "$VIEWER_TOKEN" ]] && curl -fsS --max-time 20 "$API_BASE/reports/project/$PROJECT_ID/pdf" -H "Authorization: Bearer $VIEWER_TOKEN" -o "$ASSETS_DIR/reporte-demo.pdf" 2>/dev/null; then
    if head -c 5 "$ASSETS_DIR/reporte-demo.pdf" | grep -q '%PDF-'; then
      ok "PDF backup generated ($ASSETS_DIR/reporte-demo.pdf)"
    else
      fail "PDF backup generated but file signature is not PDF"
    fi
  else
    fail "PDF backup generated"
  fi

  DETECTION_ID="$(curl -fsS --max-time 8 "$API_BASE/detections?projectId=$PROJECT_ID" -H "Authorization: Bearer $TOKEN" 2>/dev/null | json_eval "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const rows=JSON.parse(s); console.log(rows[0]?.id||'')})")"
  if [[ -n "$DETECTION_ID" && -n "$VIEWER_TOKEN" ]]; then
    HTTP_CODE="$(curl -sS --max-time 8 -o /tmp/faunalens-viewer-validate.json -w '%{http_code}' -X PATCH "$API_BASE/detections/$DETECTION_ID/validate" -H "Authorization: Bearer $VIEWER_TOKEN" -H 'Content-Type: application/json' -d '{"reviewStatus":"VALIDATED","hasAnimal":true,"sex":"UNDETERMINED","isIndependent":"UNDETERMINED"}' 2>/dev/null)"
    if [[ "$HTTP_CODE" == "403" ]]; then
      ok "Viewer cannot validate"
    else
      fail "Viewer cannot validate (HTTP $HTTP_CODE)"
    fi
  else
    fail "Viewer cannot validate (missing detection or viewer token)"
  fi
fi

HTTP_NO_TOKEN="$(curl -sS --max-time 8 -o /tmp/faunalens-no-token.json -w '%{http_code}' "$API_BASE/dataset/validated" 2>/dev/null)"
if [[ "$HTTP_NO_TOKEN" == "401" ]]; then
  ok "Protected endpoint without token returns 401"
else
  fail "Protected endpoint without token returns 401 (HTTP $HTTP_NO_TOKEN)"
fi

printf '\nSummary: %s OK, %s FAIL\n' "$OK_COUNT" "$FAIL_COUNT"
if [[ "$FAIL_COUNT" -gt 0 ]]; then
  exit 1
fi
