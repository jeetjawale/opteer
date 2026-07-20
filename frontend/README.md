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
| **Vitest** | latest | Unit tests |

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
├── Dockerfile                      # Frontend container image
├── next.config.ts
├── tailwind.config.js
├── playwright.config.ts
├── vitest.config.ts
├── tsconfig.json
└── package.json
```

## Development

The frontend runs inside Docker as part of the full stack. See the [root README](../README.md) for setup.

```bash
# Start everything
docker compose up --build

# Frontend available at http://localhost:3000
```

### Running commands inside the container

```bash
# Type checking
docker compose exec frontend npm run type-check

# Linting
docker compose exec frontend npm run lint

# Unit tests
docker compose exec frontend npx vitest run

# E2E tests
docker compose exec frontend npm run test:e2e
```

## Environment Variables

Environment variables are set in `docker-compose.yml`. The frontend uses:

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | Backend URL (browser calls) |
| `INTERNAL_API_URL` | `http://backend:8080` | Backend URL (server-side/SSR calls via Docker network) |

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

Tests live in `tests/e2e/` and run against the full Docker stack.

```bash
# Run all e2e tests
docker compose exec frontend npm run test:e2e

# Run in headed mode (useful for debugging)
docker compose exec frontend npx playwright test --headed
```

Playwright is configured in [`playwright.config.ts`](playwright.config.ts). Tests run against Chromium by default.

## Architecture Notes

- **App Router**: All pages use the Next.js App Router. Authenticated pages live under the `(dashboard)` route group, which wraps them in `DashboardLayout` (sidebar + header). The sidebar collapse state is persisted via a cookie (`sidebarCollapsed`) and read server-side on initial render to avoid layout shift.

- **Data Fetching**: TanStack Query manages all server state. Mutations trigger cache invalidations to keep the UI in sync without manual refetches.

- **Local First**: Authentication is currently bypassed for local-first operations. The backend handles local user provisioning automatically.

- **Proxy**: [`src/proxy.ts`](src/proxy.ts) routes certain requests through Next.js API routes to avoid CORS issues in development.
