# School Admission System

Seat hold -> confirm -> expire admission system. First-come, first-served class seats with PostgreSQL-enforced concurrency, .NET 10 backend, and React 19 frontend.

## Stack

- **Backend**: ASP.NET Core 10, EF Core 10, Npgsql, PostgreSQL 16
- **Frontend**: React 19, TypeScript, TanStack Query, Vite, shadcn/ui (Tailwind)
- **Deployment**: Docker Compose (multi-stage builds)

## Quick Start

```bash
docker compose up --build
```

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8080](http://localhost:8080) (Health: `/health`)
- **Multi-process (Bonus)**: Start a second API instance on `:8081` sharing the same DB:
  ```bash
  docker compose --profile multi up --build
  ```

## Concurrency and Correctness

Seat limits are enforced exclusively in **PostgreSQL**. The application uses a row-level lock (`SELECT ... FOR UPDATE`) on the `classes` table during the `Apply` transaction. This ensures that `held + confirmed <= totalSeats` holds even across multiple backend processes.

- **No in-memory locks**: Stateless and horizontally scalable.
- **Derived counts**: Seat counts are calculated from `holds` rows on every read.
- **Stale-hold handling**: `HELD` rows where `expires_at <= now` are treated as `EXPIRED` in all logic paths, independent of the background sweeper.

## Configuration (Environment Variables)

| Variable | Service | Default | Description |
|---|---|---|---|
| `ConnectionStrings__Default` | backend | `Host=db;...` | PostgreSQL connection string |
| `HOLD_DURATION_SECONDS` | backend | `600` | Seconds a seat is reserved (default 10m) |
| `CORS_ALLOWED_ORIGINS` | backend | `http://localhost:3000` | Allowed frontend origins |
| `API_BASE_URL` | frontend | `http://localhost:8080` | URL of the backend API |

## Tests

### Backend Integration Tests
Uses **Testcontainers** to run tests against a real PostgreSQL instance. Covers concurrency (50 seats, 200 parallel applies), expiry, idempotency, and contract validation.

```bash
cd backend
dotnet test
```

### Frontend Tests
Vitest + React Testing Library. Covers countdown logic, error mapping, and component states.

```bash
cd frontend
npm test
```

## Folder Layout

- `backend/src/Admission.Api/Features/` — Modular features (Classes, Holds)
- `backend/src/Admission.Api/Domain/` — Pure C# entities and rules
- `frontend/src/features/` — Feature-based modules (api, hooks, components, model)
- `frontend/src/shared/` — Reusable API client, i18n, and hooks
