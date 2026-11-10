# School Admission System

Seat hold -> confirm -> expire admission system. First-come, first-served class seats with PostgreSQL-enforced concurrency, .NET 10 backend, and React 19 frontend.

## Stack

- **Backend**: ASP.NET Core 10, EF Core 10, Npgsql, PostgreSQL 16
- **Frontend**: React 19, TypeScript, TanStack Query, Vite, shadcn/ui (Tailwind CSS)
- **Deployment**: Docker Compose (multi-stage builds)

## Quick Start

The only prerequisite is Docker with the Compose plugin. No local .NET or Node installation is needed.

```bash
docker compose up --build
```

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8080](http://localhost:8080) (Health: `/health`)
- **Multi-process (Bonus)**: Start a second API instance on `:8081` sharing the same DB:
  ```bash
  docker compose --profile multi up --build
  ```

Data lives in the named PostgreSQL volume `pgdata`, so it survives `docker compose down` followed by `docker compose up`. Only `docker compose down -v` deletes it.

## Changing Hold Duration

To test seat expiry quickly, override `HOLD_DURATION_SECONDS`:

```bash
HOLD_DURATION_SECONDS=15 docker compose up --build
```

## Concurrency and Correctness

Seat limits are enforced exclusively in **PostgreSQL**. The application uses a row-level lock (`SELECT ... FOR UPDATE`) on the `classes` table during the `Apply` transaction. This ensures that `held + confirmed <= totalSeats` holds even across multiple backend processes.

- **No in-memory locks**: Stateless, horizontally scalable, and resilient across crashes and restarts.
- **Derived counts**: Seat counts (`heldSeats`, `confirmedSeats`, `availableSeats`) are derived directly from `holds` rows on every read.
- **Stale-hold handling**: `HELD` rows where `expires_at <= now` are treated as `EXPIRED` in all logic paths (queries, apply, confirm, cancel), completely independent of the background sweeper.
- **Background Sweeper**: A lightweight `BackgroundService` runs periodically to update overdue rows to `EXPIRED` for database hygiene.
- **Partial Unique Index**: A partial unique index `uq_holds_active_student_class` on `(class_id, student_id) WHERE status IN ('HELD', 'CONFIRMED')` provides a secondary database-level guarantee enforcing one active application per student per class.

## Configuration (Environment Variables)

| Variable | Service | Default | Description |
|---|---|---|---|
| `ConnectionStrings__Default` | backend | `Host=db;...` | PostgreSQL connection string |
| `HOLD_DURATION_SECONDS` | backend | `600` | Seconds a seat is reserved (default 10m) |
| `Admission__ExpirySweepSeconds` | backend | `5` | Sweep interval in seconds for the background worker |
| `Admission__ExpiryWorkerEnabled` | backend | `true` | Enable or disable the background expiry worker |
| `CORS_ALLOWED_ORIGINS` | backend | `http://localhost:3000` | Allowed frontend origins (comma-separated) |
| `API_BASE_URL` | frontend | `http://localhost:8080` | URL of the backend API (injected at runtime via `config.js`) |

## Tests

### Backend Integration Tests
Uses **Testcontainers** to run tests against a real PostgreSQL instance, so Docker must be running. Covers concurrency (50 seats, 200 parallel applies), expiry, idempotency, ownership, and contract validation.

```bash
cd backend
dotnet test
```

### Frontend Tests
Vitest + React Testing Library. Covers countdown logic, error mapping, student identity, and component states.

```bash
cd frontend
npm install
npm test
```

For a quick manual check, run `HOLD_DURATION_SECONDS=15 docker compose up --build`, apply for a seat in the UI, and watch the countdown flip the application to `EXPIRED` without a page reload. Paying confirms the seat; cancelling a `HELD` application releases it.

## Folder Layout

The repository follows a modular, feature-based vertical slice architecture:

```
backend/
├── src/Admission.Api/
│   ├── Program.cs                         # Composition root only
│   ├── Domain/                            # Pure C# entities and HoldRules
│   ├── Infrastructure/Persistence/        # DbContext, Configurations, Migrations, DatabaseInitializer
│   ├── Features/
│   │   ├── Classes/                       # Endpoints, Application, Contracts, Validation
│   │   └── Holds/                         # Endpoints, Application, Contracts, Expiry
│   └── Shared/                            # Errors, Http, Options, Middleware
└── tests/Admission.Tests/                 # Concurrency, Contract, Expiry, and Unit tests

frontend/
├── src/
│   ├── app/                               # App, AppProviders, runtimeConfig
│   ├── components/ui/                     # shadcn/ui generic primitives
│   ├── features/
│   │   ├── student/                       # Student identity bar, storage, validation
│   │   ├── classes/                       # Class grid, cards, creation form, API
│   │   └── holds/                         # Hold cards, status badges, countdown, actions
│   └── shared/                            # API client, Bangla i18n, error mapping, countdown hook
```
