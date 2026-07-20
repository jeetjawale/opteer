# Opteer Engineering Standards

This document outlines the actual standard engineering practices, conventions, and architectural rules for the Opteer codebase.

## Technology Stack

- **Frontend**: Next.js (App Router), React 19, Tailwind CSS v4, TypeScript
- **Backend**: FastAPI (Python), SQLAlchemy, Alembic (Migrations), PostgreSQL
- **Infrastructure**: Docker Compose (all services containerized)
- **Testing**: Playwright (Frontend E2E), Vitest (Frontend Unit), Pytest (Backend)

## API Contract & Routes

Opteer endpoints return data structures directly using Pydantic response models.

- **Success Responses**: Return the raw object or list (e.g., `JobResult[]` or `UserConfigResponse`) directly from the router. Do NOT wrap responses in `{ ok: true, data: ... }` wrappers.
- **Error Handling**: Use FastAPI's `HTTPException` with appropriate status codes (`400`, `401`, `404`, `500`).
- **Dependencies**: Use FastAPI's `Depends` for `get_current_user` and database repository injection.

## Directory Structure

**Frontend (`frontend/`)**
- `src/app/(dashboard)/`: Next.js App Router pages and layouts.
- `src/components/ui/`: Reusable, generic UI components (Buttons, Badges, etc.).
- `src/features/`: Domain-specific components, hooks, and logic (e.g., `applications`, `jobs`).
- `tests/e2e/`: Playwright end-to-end tests.

**Backend (`backend/`)**
- `app/domains/`: Domain-driven feature modules containing their own `router.py`, `services.py`, etc.
- `app/db/`: Database connection, models, and repositories.
- `app/schemas.py`: Pydantic models for request/response validation.
- `app/ai/`: Agentic and LLM-related graphs, nodes, and configurations.
- `alembic/`: Database migrations.

## Code Quality & Validation

Before marking work complete, verify changes using Docker:

- **Frontend Types**: `docker compose exec frontend npm run type-check`
- **Frontend Linting**: `docker compose exec frontend npm run lint`
- **E2E Tests**: `docker compose exec frontend npm run test:e2e`
- **Backend Tests**: `docker compose exec backend pytest tests/`

## Environment & Configuration

- Never commit `.env` files or secrets.
- All environment variables are configured in `docker-compose.yml` for local development.
- Do NOT link (symlink) `backend/.env` and `frontend/.env.local` to a single shared file. They must remain separate files. This enforces the principle of least privilege (preventing the Next.js server from accessing backend-only secrets like `DATABASE_URL` and `API_KEY_ENCRYPTION_KEY`) and provides clarity on exactly what variables each environment requires.
- The backend starts via `entrypoint.sh`, which runs Alembic migrations and then launches uvicorn.
- The worker starts via `worker.py` and uses PostgreSQL `LISTEN/NOTIFY` for event-driven task processing.
