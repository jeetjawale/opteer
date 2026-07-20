# Opteer

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
[![Build Status](https://github.com/jeetjawale/opteer/actions/workflows/ci.yml/badge.svg)](https://github.com/jeetjawale/opteer/actions/workflows/ci.yml)
![Tests](https://img.shields.io/badge/tests-100%25_passing-success.svg)
![Coverage](https://img.shields.io/badge/coverage-71%25-success.svg)

## What is Opteer?

Opteer is an **AI-powered Job Search & Application Management Platform**.

Opteer is a premium tool designed to assist job seekers in organizing their job search and tailoring their applications. Instead of manually writing custom cover letters or researching company backgrounds, Opteer completely automates the heavy lifting. It ingests public job descriptions, scores your resume against the requirements, and generates personalized application assets instantly.

This project is built for developers and job seekers who want a highly customizable, private, and localized tool to manage their careers. Whether you are mass-applying or targeting a few niche roles, Opteer scales to meet your workflow.

What makes Opteer different from standard wrappers is its stateful AI orchestration. By leveraging LangGraph, it runs multi-step pipelines that fetch context, score fit, draft cover letters, and build interview prep guides in isolated, reliable steps. Furthermore, it strictly prioritizes security—user API keys are stored fully encrypted in the database and only decrypted in-memory during execution.

## Getting Started

**Prerequisites:** [Docker](https://docs.docker.com/get-docker/) (with Docker Compose). That's it — no Python, Node.js, or PostgreSQL needed.

```bash
git clone https://github.com/jeetjawale/opteer.git
cd opteer
docker compose up --build
```

Open **http://localhost:3000** — that's it.

Database, migrations, backend, worker, and frontend are all handled automatically inside Docker.

> **Note:** The first build takes a few minutes. Subsequent starts are near-instant.

| Service   | URL                    | Description                |
|-----------|------------------------|----------------------------|
| Frontend  | http://localhost:3000   | Next.js Dashboard          |
| Backend   | http://localhost:8080   | FastAPI + Swagger Docs     |
| Database  | localhost:5433          | PostgreSQL 15              |

To stop everything: `docker compose down` (add `-v` to also wipe the database).

## Usage

1. **Open the dashboard** at `http://localhost:3000`. A local user is provisioned automatically.
2. **Configure Settings:** Navigate to the Settings page to input your preferred LLM API key (OpenAI, Anthropic, or Gemini). This key will be encrypted and saved securely.
3. **Upload a Resume:** Go to the Resumes tab and upload a PDF of your base resume.
4. **Import a Job:** Paste a job posting URL. The backend will use Firecrawl to scrape the description and Tavily to research the company.
5. **Run Analysis:** Click "Analyze". The background worker will pick up the task, score your resume against the job description, draft a custom cover letter, and generate a tailored interview prep guide.

## Features

- **Stepped Job Importing**: Scrapes raw job postings via Firecrawl and conducts automated search queries using Tavily.
- **Stateful Analysis Pipelines**: Employs LangGraph to run sequential LLM chains for fit scoring, cover letter generation, and interview prep.
- **Secure API Key Management**: User API keys are mathematically encrypted at rest and dynamically decrypted in-memory during pipeline execution.
- **Quota & Rate Limiting**: Dedicated application-layer usage limits and worker-enforced analysis quotas prevent runaway LLM costs.
- **Event-Driven Worker**: Heavy AI tasks are processed by an asynchronous worker triggered via PostgreSQL `LISTEN/NOTIFY`.
- **Local-First Architecture**: Single-tenant structure with automatic user provisioning — no sign-up required.
- **Dynamic File Storage**: Handles PDF resume uploads via Local Storage Provider.

## Tech Stack

### Frontend
- **Next.js 15** (App Router), **React 19**, **TypeScript**
- **Tailwind CSS 4**, **TanStack Query 5**, **shadcn/ui**

### Backend
- **FastAPI**, **Pydantic**, **LangGraph**
- **SQLAlchemy Async**, **Alembic** (Migrations)

### Database & Infrastructure
- **PostgreSQL 15** (containerized)
- **Docker Compose** (single-command orchestration)

### External Services
- **Firecrawl API** (Job scraping, Website extraction)
- **Tavily API** (Company research, Web search)

## Architecture

```text
Frontend (Next.js)
       │
       ▼
    FastAPI
       │
       ├── PostgreSQL ──LISTEN/NOTIFY──▶ Worker
       │
       ├── OpenAI / Anthropic / Gemini
       │
       ├── Firecrawl
       └── Tavily
```

## Project Structure

```text
opteer/
├── backend/                  # FastAPI Application & Background Worker
│   ├── app/                  # API routers, AI graphs, schemas, models
│   ├── alembic/              # Database migrations
│   ├── tests/                # Pytest suites
│   ├── Dockerfile            # Backend container image
│   ├── entrypoint.sh         # Runs migrations then starts uvicorn
│   └── worker.py             # Event-driven analysis worker
├── frontend/                 # Next.js App Router Application
│   ├── src/                  # React components, pages, and client API lib
│   ├── tests/                # Playwright E2E & Vitest unit tests
│   └── Dockerfile            # Frontend container image
├── scripts/
│   └── backup_db.sh          # Database backup utility
├── docker-compose.yml        # Multi-container orchestration
├── LICENSE                   # MIT License
└── README.md
```

## Configuration

All runtime configuration is set via environment variables in `docker-compose.yml`. The defaults work out of the box for local development.

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | (set in compose) | PostgreSQL connection string |
| `API_KEY_ENCRYPTION_KEY` | (set in compose) | 32-byte base64 key for encrypting user API keys |
| `FRONTEND_URL` | `http://localhost:3000` | Frontend origin (for CORS) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | Backend URL (frontend browser calls) |
| `LOG_LEVEL` | `INFO` | Backend log verbosity |

**AI model routing** can be configured via `AI_MODEL_FIT`, `AI_MODEL_LETTER`, and `AI_MODEL_PREP` to map specific models to distinct phases of the LangGraph pipeline.

**Local LLM support**: Set `AI_PROVIDER=local` and configure `LOCAL_LLM_BASE_URL` to use a local Ollama or vLLM instance.

## Database Backup

```bash
./scripts/backup_db.sh
```

Creates a compressed SQL dump from the running database container. Old backups (>7 days) are auto-cleaned.

## Contributing

1. Fork the repository and create a descriptive branch (e.g., `feature/add-new-provider`).
2. Make your changes and verify:
   ```bash
   # Backend (inside Docker)
   docker compose exec backend pytest tests/

   # Frontend (inside Docker)
   docker compose exec frontend npm run type-check
   docker compose exec frontend npm run lint
   ```
3. Ensure all tests pass and submit a Pull Request.

## License

MIT License
