#!/bin/bash

# ============================================================
# VidyaSetu — Dev Restart Script
# Usage: ./build-and-run.sh [--reset-db] [--port 3000]
# ============================================================

set -e

# ── Colors ──────────────────────────────────────────────────
RESET="\033[0m"
BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
CYAN="\033[0;36m"
RED="\033[0;31m"
DIM="\033[2m"

# ── Config ───────────────────────────────────────────────────
PORT=${PORT:-3000}
PID_FILE=".dev.pid"
LOG_FILE=".dev.log"
RESET_DB=false

# ── Parse Args ───────────────────────────────────────────────
for arg in "$@"; do
  case $arg in
    --reset-db) RESET_DB=true ;;
    --port)     PORT="$2"; shift ;;
    --help)
      echo ""
      echo "  Usage: ./build-and-run.sh [options]"
      echo ""
      echo "  Options:"
      echo "    --reset-db    Push schema changes to DB before starting"
      echo "    --port <n>    Run on a custom port (default: 3000)"
      echo "    --help        Show this help"
      echo ""
      exit 0
      ;;
  esac
done

# ── Header ───────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║        VidyaSetu — Dev Server            ║${RESET}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════╝${RESET}"
echo ""

# ── Step 1: Kill existing dev server ────────────────────────
echo -e "${BOLD}[1/4]${RESET} ${YELLOW}Stopping existing dev server...${RESET}"

# Kill by PID file
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  if ps -p "$OLD_PID" > /dev/null 2>&1; then
    kill "$OLD_PID" 2>/dev/null && echo -e "      ${DIM}Killed PID $OLD_PID${RESET}"
    sleep 1
  fi
  rm -f "$PID_FILE"
fi

# Kill any process on the target port
EXISTING_PID=$(lsof -ti tcp:$PORT 2>/dev/null || true)
if [ -n "$EXISTING_PID" ]; then
  kill -9 $EXISTING_PID 2>/dev/null && echo -e "      ${DIM}Freed port $PORT (PID $EXISTING_PID)${RESET}"
  sleep 1
fi

echo -e "      ${GREEN}✓ Port $PORT is free${RESET}"

# ── Step 2: Check .env.local ─────────────────────────────────
echo ""
echo -e "${BOLD}[2/4]${RESET} ${YELLOW}Checking environment...${RESET}"

if [ ! -f ".env.local" ]; then
  echo -e "      ${RED}✗ .env.local not found!${RESET}"
  echo -e "      ${DIM}Run: cp .env.example .env.local  and fill in your credentials${RESET}"
  exit 1
fi

# Check critical env vars are non-empty
check_env() {
  local key=$1
  local val
  val=$(grep "^${key}=" .env.local 2>/dev/null | cut -d'=' -f2-)
  if [ -z "$val" ] || [[ "$val" == *"your-"* ]]; then
    echo -e "      ${YELLOW}⚠ ${key} looks unset in .env.local${RESET}"
    return 1
  fi
  return 0
}

ALL_OK=true
check_env "DATABASE_URL"   || ALL_OK=false
check_env "AUTH_SECRET"    || ALL_OK=false
check_env "GEMINI_API_KEY" || ALL_OK=false

if [ "$ALL_OK" = true ]; then
  echo -e "      ${GREEN}✓ Environment variables look good${RESET}"
fi

# ── Step 3: Prisma ───────────────────────────────────────────
echo ""
echo -e "${BOLD}[3/4]${RESET} ${YELLOW}Prisma setup...${RESET}"

# Generate client (fast, always safe)
echo -e "      ${DIM}Generating Prisma client...${RESET}"
npx prisma generate --no-hints 2>&1 | grep -v "^$" | sed 's/^/      /' || {
  echo -e "      ${RED}✗ prisma generate failed${RESET}"; exit 1
}
echo -e "      ${GREEN}✓ Prisma client generated${RESET}"

# Optionally push schema to DB
if [ "$RESET_DB" = true ]; then
  echo -e "      ${DIM}Pushing schema to database...${RESET}"
  npx prisma db push --accept-data-loss 2>&1 | tail -3 | sed 's/^/      /' || {
    echo -e "      ${RED}✗ prisma db push failed${RESET}"; exit 1
  }
  echo -e "      ${GREEN}✓ Database schema synced${RESET}"
fi

# ── Step 4: Start dev server ─────────────────────────────────
echo ""
echo -e "${BOLD}[4/4]${RESET} ${YELLOW}Starting Next.js dev server...${RESET}"
echo ""

# Wipe .next cache for a clean restart
if [ -d ".next" ]; then
  echo -e "      ${DIM}Clearing .next cache...${RESET}"
  rm -rf .next/cache
fi

# Start dev server in background, redirect output to log
PORT=$PORT npm run dev > "$LOG_FILE" 2>&1 &
DEV_PID=$!
echo $DEV_PID > "$PID_FILE"

echo -e "      ${DIM}Dev server PID: $DEV_PID  |  Log: $LOG_FILE${RESET}"
echo ""

# ── Wait for server to be ready ──────────────────────────────
echo -e "${YELLOW}Waiting for server to be ready...${RESET}"
MAX_WAIT=60
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
  if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT" 2>/dev/null | grep -qE "^(200|307|302|404)"; then
    break
  fi
  # Also break if the process died
  if ! ps -p $DEV_PID > /dev/null 2>&1; then
    echo ""
    echo -e "${RED}✗ Dev server crashed on startup! Last 20 lines of log:${RESET}"
    echo ""
    tail -20 "$LOG_FILE"
    echo ""
    exit 1
  fi
  printf "."
  sleep 1
  WAITED=$((WAITED + 1))
done
echo ""

if [ $WAITED -ge $MAX_WAIT ]; then
  echo -e "${RED}✗ Timed out waiting for server after ${MAX_WAIT}s${RESET}"
  echo -e "${DIM}Check $LOG_FILE for details${RESET}"
  exit 1
fi

# ── Ready ────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║  ✓  VidyaSetu is running!                ║${RESET}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  ${BOLD}Local:${RESET}   ${CYAN}http://localhost:$PORT${RESET}"
echo -e "  ${BOLD}PID:${RESET}     ${DIM}$DEV_PID  (kill with: kill $DEV_PID)${RESET}"
echo -e "  ${BOLD}Logs:${RESET}    ${DIM}tail -f $LOG_FILE${RESET}"
echo ""
echo -e "  ${DIM}Re-run this script anytime to hot-restart the server.${RESET}"
echo -e "  ${DIM}Use --reset-db to also sync Prisma schema changes.${RESET}"
echo ""

# ── Tail the logs so terminal stays alive with live output ───
echo -e "${BOLD}${DIM}── Live server output (Ctrl+C to stop) ──────────────────${RESET}"
echo ""
tail -f "$LOG_FILE"
