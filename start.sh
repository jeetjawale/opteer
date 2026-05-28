#!/usr/bin/env bash
set -euo pipefail

cd /home/j33t/Projects/jobpilot
set -a
source .env
set +a

(cd backend && source .venv/bin/activate && python -m uvicorn app.main:app --reload --port 8085) &
(cd frontend && npm run dev) &
wait