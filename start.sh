#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
set -a
source .env
set +a

(cd backend && source .venv/Scripts/activate && python -m uvicorn app.main:app --reload --port 8085) &
(cd frontend && npm run dev) &
wait