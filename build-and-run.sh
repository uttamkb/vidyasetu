#!/bin/bash

# ============================================================
# VidyaSetu — Production-Grade CI/CD & Orchestration
# Usage: ./build-and-run.sh [options]
# ============================================================

set -euo pipefail

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
RAW_LOG=".dev.raw.log"
INNGEST_PID_FILE=".inngest.pid"
INNGEST_LOG=".inngest.log"

MODE="dev" # dev, prod, ci
RESET_DB=false
SKIP_TESTS=false

# ── Help ─────────────────────────────────────────────────────
show_help() {
  echo ""
  echo -e "${BOLD}Usage:${RESET} ./build-and-run.sh [options]"
  echo ""
  echo -e "${BOLD}Options:${RESET}"
  echo "  --dev         Run in development mode (hot-reload, filtered logs) [Default]"
  echo "  --prod        Run in production mode (Build + Standalone Server)"
  echo "  --ci          Run in CI mode (Build + Test + Coverage only, no server)"
  echo "  --reset-db    Push schema changes to DB before starting"
  echo "  --skip-tests  Skip Vitest and Coverage phases"
  echo "  --port <n>    Run on a custom port (default: 3000)"
  echo "  --help        Show this help"
  echo ""
  exit 0
}

# ── Parse Args ───────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --dev)        MODE="dev"; shift ;;
    --prod)       MODE="prod"; shift ;;
    --ci)         MODE="ci"; shift ;;
    --reset-db)   RESET_DB=true; shift ;;
    --skip-tests) SKIP_TESTS=true; shift ;;
    --port)       PORT="$2"; shift 2 ;;
    --help)       show_help ;;
    *)            echo "Unknown option: $1"; show_help ;;
  esac
done

# ── Cleanup Function ─────────────────────────────────────────
cleanup() {
  if [ "$MODE" != "ci" ]; then
    echo -e "\n${DIM}Exiting and cleaning up processes...${RESET}"
  fi
  
  # Kill dev/prod server if running in background
  if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    kill "$OLD_PID" 2>/dev/null || true
    rm -f "$PID_FILE"
  fi
  
  if [ -f "$INNGEST_PID_FILE" ]; then
    OLD_INNGEST_PID=$(cat "$INNGEST_PID_FILE")
    kill "$OLD_INNGEST_PID" 2>/dev/null || true
    rm -f "$INNGEST_PID_FILE"
  fi
  
  # Kill any tailing/filtering processes
  pkill -f "tail -f $RAW_LOG" 2>/dev/null || true
}

# ── Header ───────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║        VidyaSetu — $(echo "$MODE" | tr '[:lower:]' '[:upper:]') Pipeline         ║${RESET}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════╝${RESET}"
echo ""

# ── Step 1: Preflight & Environment ─────────────────────────
echo -e "${BOLD}[1/5]${RESET} ${YELLOW}Checking environment...${RESET}"

if [ ! -f ".env.local" ] && [ "$MODE" != "ci" ]; then
  echo -e "      ${RED}✗ .env.local not found!${RESET}"
  echo -e "      ${DIM}Run: cp .env.example .env.local and fill in your credentials${RESET}"
  exit 1
fi

check_env() {
  local key=$1
  local val
  val=$(printenv "$key" || true)
  if [ -z "$val" ] && [ -f ".env.local" ]; then
    val=$(grep "^${key}=" .env.local 2>/dev/null | cut -d'=' -f2-)
  fi
  
  if [ -z "$val" ] || [[ "$val" == *"your-"* ]]; then
    echo -e "      ${YELLOW}⚠ ${key} looks unset${RESET}"
    return 1
  fi
  return 0
}

ALL_OK=true
check_env "DATABASE_URL"   || ALL_OK=false
check_env "AUTH_SECRET"    || ALL_OK=false
check_env "GEMINI_API_KEY" || ALL_OK=false

if [ "$ALL_OK" = true ]; then
  echo -e "      ${GREEN}✓ Environment variables validated${RESET}"
  
  # Export variables globally for all child processes
  if [ -f ".env.local" ]; then
    set -a
    source .env.local
    set +a
    echo -e "      ${DIM}Environment variables exported from .env.local${RESET}"
  fi
else
  echo -e "      ${RED}✗ Missing required environment variables. Pipeline aborted.${RESET}"
  exit 1
fi

# Ensure port is free
EXISTING_PID=$(lsof -ti tcp:$PORT 2>/dev/null | xargs || true)
if [ -n "$EXISTING_PID" ]; then
  echo -e "      ${DIM}Freeing port $PORT (PID $EXISTING_PID)...${RESET}"
  kill -9 $EXISTING_PID 2>/dev/null || true
fi

# Kill any stale build processes
pkill -f "next build" 2>/dev/null || true
pkill -f "next-router-worker" 2>/dev/null || true

# ── Step 2: Prisma & Dependencies ───────────────────────────
echo ""
echo -e "${BOLD}[2/5]${RESET} ${YELLOW}Dependencies & Prisma...${RESET}"

if [ ! -d "node_modules" ]; then
  echo -e "      ${DIM}Installing dependencies...${RESET}"
  npm install --quiet
fi

echo -e "      ${DIM}Generating Prisma client...${RESET}"
mkdir -p .prisma_home
HOME=$(pwd)/.prisma_home PRISMA_CACHE_DIR=./.prisma-cache npx prisma generate --no-hints > .prisma.log 2>&1 || {
  echo -e "      ${RED}✗ prisma generate failed. See .prisma.log for details:${RESET}"
  tail -n 5 .prisma.log | sed 's/^/      /'
  exit 1
}
echo -e "      ${GREEN}✓ Prisma client ready${RESET}"

if [ "$RESET_DB" = true ]; then
  echo -e "      ${DIM}Syncing database schema...${RESET}"
  HOME=$(pwd)/.prisma_home npx prisma db push --accept-data-loss > .prisma.log 2>&1 || {
    echo -e "      ${RED}✗ prisma db push failed. See .prisma.log for details:${RESET}"
    tail -n 5 .prisma.log | sed 's/^/      /'
    exit 1
  }
  echo -e "      ${GREEN}✓ Database synced${RESET}"
fi

# ── Step 3: Tests & Coverage ────────────────────────────────
echo ""
echo -e "${BOLD}[3/5]${RESET} ${YELLOW}Quality Assurance...${RESET}"

if [ "$SKIP_TESTS" = true ]; then
  echo -e "      ${DIM}Tests skipped by user flag${RESET}"
else
  echo -e "      ${DIM}Running Vitest suites...${RESET}"
  CI=true npm run test > /dev/null 2>&1 || {
    echo -e "      ${RED}✗ Tests failed! Run 'npm run test' for details.${RESET}"; exit 1
  }
  echo -e "      ${GREEN}✓ All tests passed${RESET}"
  
  echo -e "      ${DIM}Checking code coverage...${RESET}"
  CI=true npm run coverage > /dev/null 2>&1 || {
    echo -e "      ${RED}✗ Coverage check failed!${RESET}"; exit 1
  }
  echo -e "      ${GREEN}✓ Coverage report generated${RESET}"
fi

# ── Step 4: Build ───────────────────────────────────────────
echo ""
echo -e "${BOLD}[4/5]${RESET} ${YELLOW}Production Build...${RESET}"

if [ "$MODE" == "dev" ]; then
  echo -e "      ${DIM}Skipping full build (Development mode)${RESET}"
else
  echo -e "      ${DIM}Executing Next.js production build...${RESET}"
  echo -e "      ${DIM}(This includes type-checking and linting)${RESET}"
  
  # Ensure we wipe cache for CI/Prod builds to avoid stale TS errors
  rm -rf .next/cache
  
  npm run build > .build.log 2>&1 || {
    echo -e "      ${RED}✗ Build failed! Type-check or Lint error detected.${RESET}"
    echo -e "      ${RED}Last 10 lines of build log:${RESET}"
    tail -n 10 .build.log | sed 's/^/      /'
    exit 1
  }
  echo -e "      ${GREEN}✓ Production build succeeded (Zero TypeScript errors)${RESET}"
fi

# ── Step 5: Runtime ─────────────────────────────────────────
echo ""
echo -e "${BOLD}[5/5]${RESET} ${YELLOW}Starting Servers...${RESET}"

if [ "$MODE" == "ci" ]; then
  echo ""
  echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════╗${RESET}"
  echo -e "${BOLD}${GREEN}║  ✓  CI Pipeline Completed Successfully!  ║${RESET}"
  echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════╝${RESET}"
  echo ""
  exit 0
fi

# Start Inngest in background
npx inngest-cli@latest dev > "$INNGEST_LOG" 2>&1 &
echo $! > "$INNGEST_PID_FILE"
echo -e "      ${DIM}Inngest: http://localhost:8288${RESET}"

if [ "$MODE" == "prod" ]; then
  echo -e "      ${BOLD}${GREEN}Starting in PRODUCTION mode on port $PORT...${RESET}"
  echo -e "      ${DIM}Using standalone server entry point...${RESET}"
  export INNGEST_DEV=false
  PORT=$PORT node .next/standalone/server.js > "$RAW_LOG" 2>&1 &
  echo $! > "$PID_FILE"
else
  echo -e "      ${BOLD}${CYAN}Starting in DEVELOPMENT mode on port $PORT...${RESET}"
  # Wipe cache for a clean restart in dev too
  rm -rf .next/cache
  export INNGEST_DEV=true
  PORT=$PORT npm run dev -- --hostname 127.0.0.1 > "$RAW_LOG" 2>&1 &
  echo $! > "$PID_FILE"
fi

# ── Wait for server to be ready ──────────────────────────────
echo -e "${YELLOW}Waiting for application to be ready...${RESET}"
MAX_WAIT=60
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
  if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT" 2>/dev/null | grep -qE "^(200|307|302|404)"; then
    break
  fi
  
  if ! ps -p $(cat "$PID_FILE") > /dev/null 2>&1; then
    echo ""
    echo -e "${RED}✗ Server crashed on startup!${RESET}"
    tail -n 20 "$RAW_LOG"
    exit 1
  fi
  printf "."
  sleep 1
  WAITED=$((WAITED + 1))
done
echo ""

# ── Ready ────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║  ✓  VidyaSetu is live ($MODE)          ║${RESET}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  ${BOLD}URL:${RESET}   ${CYAN}http://localhost:$PORT${RESET}"
echo -e "  ${BOLD}Logs:${RESET}  ${DIM}tail -f $RAW_LOG${RESET}"
echo ""

# Tail the logs
if [ "$MODE" == "dev" ]; then
  echo -e "${DIM}   (Filtering Inngest polling noise)${RESET}"
  tail -f "$RAW_LOG" | grep -E --line-buffered -v "(PUT /api/inngest|GET /(\.redwood|\.netlify|x).*inngest)"
else
  tail -f "$RAW_LOG"
fi
