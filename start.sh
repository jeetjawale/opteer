#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
set -a
source .env
set +a

activate_venv() {
  if [ -f ".venv/bin/activate" ]; then
    source ".venv/bin/activate"
  elif [ -f ".venv/Scripts/activate" ]; then
    source ".venv/Scripts/activate"
  else
    echo "Virtual environment not found"
    exit 1
  fi
}

(cd backend && activate_venv && python -m uvicorn app.main:app --reload --port 8085) &
(cd backend && activate_venv && python worker.py) &
(cd frontend && npm run dev) &
wait