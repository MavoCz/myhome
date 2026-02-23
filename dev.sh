#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

export SPRING_DATASOURCE_USERNAME=root
export SPRING_DATASOURCE_PASSWORD=root

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[dev]${NC} $1"; }
warn() { echo -e "${YELLOW}[dev]${NC} $1"; }
err()  { echo -e "${RED}[dev]${NC} $1"; }

cleanup() {
  log "Shutting down..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  wait $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  log "Done."
}

# --- PostgreSQL ---
log "Checking PostgreSQL..."
if docker ps --format '{{.Names}}' | grep -q '^postgres_backend$'; then
  log "PostgreSQL container already running."
elif docker ps -a --format '{{.Names}}' | grep -q '^postgres_backend$'; then
  log "Starting existing PostgreSQL container..."
  docker start postgres_backend
else
  log "Creating PostgreSQL container..."
  docker run -d --name postgres_backend \
    -e POSTGRES_USER=root \
    -e POSTGRES_PASSWORD=root \
    -e POSTGRES_DB=backend \
    -p 5433:5432 \
    postgres:18
fi

# Wait for PostgreSQL to accept connections
log "Waiting for PostgreSQL to be ready..."
for i in $(seq 1 30); do
  if docker exec postgres_backend pg_isready -U root -d backend >/dev/null 2>&1; then
    log "PostgreSQL is ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    err "PostgreSQL did not become ready in time."
    exit 1
  fi
  sleep 1
done

# --- Backend ---
log "Starting backend (port 8080)..."
cd "$SCRIPT_DIR/backend"
./gradlew bootRun --console=plain -q &
BACKEND_PID=$!

# --- Frontend ---
log "Starting frontend dev server (port 5173)..."
cd "$SCRIPT_DIR"
pnpm dev &
FRONTEND_PID=$!

trap cleanup EXIT INT TERM

log "Backend:  http://localhost:8080"
log "Frontend: http://localhost:5173"
log "Swagger:  http://localhost:8080/swagger-ui.html"
log "Press Ctrl+C to stop all services."

wait
