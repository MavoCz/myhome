#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

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

# --- Backend ---
# PostgreSQL is auto-managed by Spring Boot Docker Compose support (see backend/compose.yml)
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
