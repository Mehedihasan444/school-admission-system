# School Admission System

Seat hold -> confirm -> expire admission system. First-come, first-served
class seats with PostgreSQL-enforced concurrency, .NET 10 backend, React 19 +
Vite frontend, all started with a single command.

## Stack

- Backend: ASP.NET Core minimal APIs, .NET 10, EF Core 10 + Npgsql, PostgreSQL 16
- Frontend: React 19, TypeScript, Vite, shadcn/ui (Tailwind), nginx
- All services: Docker Compose

## Run

```bash
docker compose up --build
```

- Backend API: http://localhost:8080  (try `GET /health`)
- Frontend UI: http://localhost:3000
- Database: PostgreSQL on `db:5432` (backend only), data in named volume `pgdata`

Stop: `docker compose down` — data survives. Destroy data: `docker compose down -v`.

## Configuration (environment variables)

| Variable | Service | Default |
|---|---|---|
| `ConnectionStrings__Default` | backend | `Host=db;Port=5432;Database=admission;Username=admission;Password=admission;Maximum Pool Size=100;Timeout=30` |
| `HOLD_DURATION_SECONDS` | backend | `600` |
| `CORS_ALLOWED_ORIGINS` | backend | `http://localhost:3000` |
| `ASPNETCORE_URLS` | backend | `http://+:8080` |
| `API_BASE_URL` | frontend (browser-reachable URL) | `http://localhost:8080` |
| `POSTGRES_DB/USER/PASSWORD` | db | `admission` |

## API contract (PRD section 5, frozen)

| # | Method | Path | Purpose |
|---|---|---|---|
| 1 | POST | /classes | Create class |
| 2 | GET | /classes | List classes with seat counts |
| 3 | GET | /classes/{classId} | One class's seat status |
| 4 | POST | /classes/{classId}/holds | Apply (create hold), header X-Student-Id |
| 5 | GET | /holds/{holdId} | Current status of a hold |
| 6 | POST | /holds/{holdId}/confirm | Pay fee, confirm, header X-Student-Id |
| 7 | DELETE | /holds/{holdId} | Cancel, header X-Student-Id |
| 8 | GET | /me/holds | Student's own applications, header X-Student-Id |

`X-Student-Id` is the student's 17-digit birth registration number.

## Tests

Backend (real PostgreSQL via Testcontainers):

```bash
cd backend
dotnet test
```

Frontend (Vitest + React Testing Library — bonus):

```bash
cd frontend
npm test
```

## Repo layout

- `backend/src/Admission.Api` — API project (Domain, Infrastructure/Persistence,
  Features/Classes, Features/Holds, Shared)
- `backend/tests/Admission.Tests` — integration tests
- `frontend/` — Vite app, `nginx/` runtime config, Dockerfile
- `docker-compose.yml` — db + backend + frontend

See `PRD.md`, `TRD.md`, `AGENTS.md` for the specification, architecture, and
working rules; `ASSUMPTIONS.md` and `AI_USAGE.md` for judgment calls.
