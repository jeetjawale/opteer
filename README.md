# JobPilot — AI-powered job application helper

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

*(Placeholder: UI Screenshot or Demo GIF)*

## What is JobPilot?

JobPilot is a premium, AI-powered CRM designed to assist job seekers in organizing their job search and tailoring their applications. Instead of manually writing custom cover letters or researching company backgrounds, JobPilot completely automates the heavy lifting. It ingests public job descriptions, scores your resume against the requirements, and generates personalized application assets instantly.

This project is built for developers and job seekers who want a highly customizable, private, and localized tool to manage their careers. Whether you are mass-applying or targeting a few niche roles, JobPilot scales to meet your workflow.

What makes JobPilot different from standard wrappers is its stateful AI orchestration. By leveraging LangGraph, it runs multi-step pipelines that fetch context, score fit, draft cover letters, and build interview prep guides in isolated, reliable steps. Furthermore, it strictly prioritizes security—user API keys are stored fully encrypted in the database and only decrypted in-memory during execution.

## Features

- **Stepped Job Importing**: Scrapes raw job postings via Firecrawl and conducts automated search queries using Tavily.
- **Stateful Analysis Pipelines**: Employs LangGraph to run sequential LLM chains for fit scoring, cover letter generation, and interview prep.
- **Secure API Key Management**: User API keys are mathematically encrypted at rest and dynamically decrypted in-memory during pipeline execution.
- **Quota & Rate Limiting**: Dedicated application-layer usage limits and worker-enforced analysis quotas prevent runaway LLM costs.
- **Background Task Processing**: Heavy AI tasks are offloaded to a resilient, asynchronous polling worker (`worker.py`).
- **End-to-End Auth**: Complete session management and route protection via Supabase SSR Auth.
- **Dynamic File Storage**: Handles PDF resume uploads via Supabase Storage, serving short-lived, on-demand signed URLs.

## Tech Stack

| Layer | Technology | Version |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js | ^15.5.18 |
| **UI Library** | React | 18.3.1 |
| **Styling** | Tailwind CSS | 3.4.3 |
| **Backend API** | FastAPI | 0.136.3 |
| **AI Orchestration** | LangGraph & LangChain | 0.3.15 & 1.3.2 |
| **Database & Auth** | Supabase | 2.30.1 |
| **Web Scraping** | firecrawl-py | 4.28.2 |
| **Search Engine API** | tavily-python | 0.7.25 |

## Prerequisites

- Node.js >= 20.0.0
- Python >= 3.11
- Supabase CLI
- Docker & Docker Compose (optional, for self-hosted container deployment)

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd jobpilot
   ```

2. **Install Backend Dependencies:**
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Install Frontend Dependencies:**
   ```bash
   cd ../frontend
   npm ci
   ```

4. **Environment Setup:**
   Create a `.env` file at the root of the project by copying `.env.example`:
   ```bash
   cp .env.example .env
   ```
   *Required Variables:*
   - `AI_PROVIDER`: The active LLM provider (e.g., `gemini`, `openai`, `anthropic`).
   - `AI_MODEL`: The default model string (e.g., `gemini-2.0-flash`).
   - `API_KEY_ENCRYPTION_KEY`: A 32 url-safe base64-encoded byte string for securing user API keys. Generate via: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`.
   - `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL (Get from Supabase Dashboard).
   - `SUPABASE_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous public key (Get from Supabase Dashboard).
   - `SUPABASE_SERVICE_KEY`: Your Supabase service role key (Get from Supabase Dashboard).
   - `NEXT_PUBLIC_API_URL`: Backend URL (defaults to `http://localhost:8080`).

   *Optional Variables:*
   - `FIRECRAWL_API_KEY`: For scraping job links (Get from firecrawl.dev).
   - `TAVILY_API_KEY`: For company research (Get from tavily.com).
   - `GOOGLE_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.: Platform-level LLM fallbacks.

5. **Database Setup:**
   Apply the migrations to your Supabase project to generate the schema, quotas, and RLS policies:
   ```bash
   npx supabase db push
   ```

6. **Start the Application (Manual Method):**
   You will need three terminal tabs:
   
   *Tab 1 (API Server):*
   ```bash
   cd backend
   source .venv/bin/activate
   uvicorn app.main:app --port 8080 --reload
   ```
   *Tab 2 (Background Worker):*
   ```bash
   cd backend
   source .venv/bin/activate
   python worker.py
   ```
   *Tab 3 (Frontend):*
   ```bash
   cd frontend
   npm run dev
   ```

   **Alternatively, start via Docker:**
   ```bash
   docker-compose up -d --build
   ```

## Usage

1. **Sign Up / Login:** Open `http://localhost:3000` and create a user account.
2. **Configure Settings:** Navigate to the Settings page to input your preferred LLM API key. This key will be encrypted and saved securely.
3. **Upload a Resume:** Go to the Resumes tab and upload a PDF of your base resume.
4. **Import a Job:** Paste a job posting URL. The backend will use Firecrawl to scrape the description and Tavily to research the company.
5. **Run Analysis:** Click "Analyze". The background worker will pick up the task, score your resume against the job description, draft a custom cover letter, and generate a tailored interview prep guide.

## Project Structure

```text
jobpilot/
├── backend/                  # FastAPI Application & Background Worker
│   ├── app/                  # API routers, chains, graph orchestration, and schemas
│   └── tests/                # Pytest suites for unit and integration testing
├── frontend/                 # Next.js App Router Application
│   ├── public/               # Static assets
│   └── src/                  # React components, pages, and client API lib
├── supabase/
│   └── migrations/           # SQL definitions for schema, RLS, and RPC functions
├── docker-compose.yml        # Multi-container orchestration config
├── LICENSE                   # MIT License
└── README.md                 # Project documentation
```

## API Reference

The backend exposes several modular routers. Here are the core health and validation endpoints defined in `main.py`:

**`GET /health`**
- **Description:** Verifies service uptime and returns basic project metadata.
- **Response:** `{"status": "healthy", "project": "JobPilot"}`

**`POST /health/llm`**
- **Description:** Validates user-provided LLM credentials by invoking a minimal test prompt. Protected by a rate limiter (5 requests / 60 seconds).
- **Headers:** `X-User-Api-Key` (Optional string).
- **Response (Success):** `{"status": "ok", "provider": "gemini"}`
- **Response (Error):** `{"status": "error", "detail": "Invalid authentication credentials"}`

*(Note: `jobs`, `applications`, `reminders`, `resumes`, and `settings` routers are fully implemented and interact directly with Supabase and the LangGraph worker.)*

## Configuration

Behavior is controlled via the `.env` file at the root. 
- **AI Targeting:** `AI_MODEL_FIT`, `AI_MODEL_LETTER`, and `AI_MODEL_PREP` allow you to map specific models to distinct phases of the LangGraph pipeline (e.g., routing cheap models to scoring, and powerful models to cover letter drafting).
- **Local Fallbacks:** By setting `AI_PROVIDER=local` and configuring `LOCAL_LLM_BASE_URL`, you can completely bypass cloud providers and run analysis against a local Ollama or vLLM instance.

## Contributing

**Running Tests:**
The backend uses Pytest for unit and integration testing.
```bash
cd backend
source .venv/bin/activate
python -m pytest
```

**Branch Naming & PRs:**
- Please use descriptive branch names (e.g., `feature/add-new-provider` or `fix/rate-limiter-race-condition`).
- Ensure all tests pass and that your dependencies are pinned securely before submitting a Pull Request.

## License

MIT License
