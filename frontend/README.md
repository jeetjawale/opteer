# Opteer — Frontend

The Next.js frontend for the [Opteer](../README.md) AI-powered job search and application management platform.

## Tech Stack

| Tool | Version | Purpose |
|---|---|---|
| **Next.js** | 16 (App Router) | Framework & SSR |
| **React** | 19 | UI library |
| **TypeScript** | 5 | Type safety |
| **Tailwind CSS** | 4 | Styling |
| **TanStack Query** | 5 | Server state & data fetching |
| **shadcn/ui** + **Base UI** | latest | UI components |
| **dnd-kit** | latest | Drag-and-drop |
| **Lucide React** | latest | Icons |
| **Playwright** | latest | End-to-end tests |

## Project Structure

```text
frontend/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (dashboard)/            # Authenticated route group
│   │   │   ├── layout.tsx          # Dashboard shell (sidebar + header)
│   │   │   ├── dashboard/          # Overview page
│   │   │   ├── jobs/               # Job listings & import
│   │   │   ├── applications/       # Application tracker
│   │   │   ├── resumes/            # Resume upload & management
│   │   │   ├── settings/           # User settings & API key config
│   │   │   └── status/             # Analysis job status
│   │   ├── api/                    # Next.js API routes (proxy)
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Root redirect
│   │   ├── globals.css             # Global styles
│   │   └── providers.tsx           # React context providers
│   ├── components/
│   │   ├── layout/                 # DashboardLayout, Sidebar, Header
│   │   └── ui/                     # Reusable UI primitives (shadcn-based)
│   ├── features/                   # Feature-specific components & logic
│   │   ├── applications/
│   │   ├── dashboard/
│   │   ├── jobs/
│   │   ├── resumes/
│   │   └── settings/
│   ├── hooks/                      # Shared custom React hooks
│   ├── lib/
│   │   ├── api-client.ts           # Typed HTTP client (get/post/patch/delete)
│   │   └── utils.ts                # Utility helpers (cn, etc.)
│   └── proxy.ts                    # Backend proxy helpers
├── tests/
│   ├── e2e/                        # Playwright end-to-end test suites
│   └── fixtures/                   # Shared test fixtures
├── public/                         # Static assets
├── next.config.ts
├── tailwind.config.js
├── playwright.config.ts
├── tsconfig.json
└── package.json
```

## Getting Started

### Prerequisites

- **Node.js** >= 20
- The backend API running on `http://localhost:8080` (see the [backend README](../backend/README.md) or root [README](../README.md))
- A `.env` file at the **project root** with `NEXT_PUBLIC_API_URL` set (see [Environment Variables](#environment-variables))

### Install dependencies

```bash
npm ci
```

### Run the development server

```bash
npm run dev
```

The app loads the root `.env` file automatically via `dotenv-cli`. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Other scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server with hot-reload |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript compiler check |
| `npm run test:e2e` | Run Playwright end-to-end tests |

## Environment Variables

The frontend reads from the `.env` file at the **project root** (one level up). The only required frontend variable is:

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Base URL for the backend API |

All other variables (AI keys, database URL, etc.) are used by the backend. See the root [`.env.example`](../.env.example) for the full reference.

## API Client

[`src/lib/api-client.ts`](src/lib/api-client.ts) exports a `useApiClient()` hook that wraps `fetch` with:

- Automatic `Content-Type: application/json` injection
- Correct handling of `multipart/form-data` (lets the browser set the boundary)
- Structured error extraction from FastAPI `detail` fields
- `204 No Content` handling for DELETE responses

```ts
const api = useApiClient();

await api.get('/jobs');
await api.post('/jobs', { url: '...' });
await api.postFormData('/resumes', formData);
await api.patch('/jobs/123', { status: 'applied' });
await api.delete('/jobs/123');
```

## End-to-End Tests

Tests live in `tests/e2e/` and run against a live local stack (`http://localhost:3000`).

```bash
# Run all e2e tests
npm run test:e2e

# Run in headed mode (useful for debugging)
npx playwright test --headed

# View the HTML report
npx playwright show-report
```

Playwright is configured in [`playwright.config.ts`](playwright.config.ts). Tests run against Chromium by default and load environment variables from the root `.env` file.

## Architecture Notes

- **App Router**: All pages use the Next.js App Router. Authenticated pages live under the `(dashboard)` route group, which wraps them in `DashboardLayout` (sidebar + header). The sidebar collapse state is persisted via a cookie (`sidebarCollapsed`) and read server-side on initial render to avoid layout shift.

- **Data Fetching**: TanStack Query manages all server state. Mutations trigger cache invalidations to keep the UI in sync without manual refetches.

- **Local First**: Authentication is currently bypassed for local-first operations. The backend handles local user provisioning automatically.

- **Proxy**: [`src/proxy.ts`](src/proxy.ts) routes certain requests through Next.js API routes to avoid CORS issues in development.
