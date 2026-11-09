# AI Usage and Corrections

This document records the interactions between the AI Agent and the developer, focusing on mistakes caught and corrected.

### Tooling and Process
- **Tools used**: `dotnet`, `npm`, `git`, `docker`, `postgresql`, `shell`.
- **Frameworks**: .NET 10, EF Core 10, React 19, Vitest.

### Errors and Corrections

| Incident | Description | How it was caught | Correction |
|---|---|---|---|
| **In-Memory Lock** | Initially considered using `SemaphoreSlim` for a quick implementation of Milestone 4. | Re-read `AGENTS.md` Rule 4.2: "Never use lock, SemaphoreSlim...". | Switched to PostgreSQL `SELECT ... FOR UPDATE` before writing code. |
| **Missing Header Validation** | The first draft of `StudentIdFilter` didn't check if the ID contained only digits. | Self-review against PRD "birth registration number". | Added ASCII digit check in `StudentIdFilter.cs`. |
| **Frontend Poll Cleanup** | The initial implementation of `useClasses` polling didn't handle tab visibility. | Re-read PRD 8.2: "Pause or slow down when the tab is hidden." | Implemented `refetchOnWindowFocus: false` and relied on TanStack Query's default behavior, while keeping the 3s interval active only when visible. |
| **Test Dependency Conflict** | `Npgsql.EntityFrameworkCore.PostgreSQL` version 10.0.3 conflicted with implicit EF Core refs in the test project. | `dotnet build` emitted MSB3277 warnings about assembly version mismatches. | Explicitly added `Microsoft.EntityFrameworkCore` 10.0.14 and `Npgsql` 10.0.3 to the test project to pin versions. |
| **JSON Serialization** | Hold status was initially serializing as default `int` in one endpoint. | Integration test check for "HELD" string failed. | Added `JsonStringEnumConverter` with `SnakeCaseUpper` policy to `JsonOptions` in `Program.cs`. |
| **Frontend Countdown Drift** | Initial countdown didn't account for client-server clock drift. | Judgment call during frontend implementation. | Added `serverClock.ts` to compute offset from the `Date` header. |
| **Duplicate Stub Folders** | Created `frontend/features/` while `frontend/src/features/` already existed. | `ls` check revealed redundancy. | Deleted `frontend/features/` and consolidated in `src/features/`. |
| **Hardcoded Env in Compose** | `docker-compose.yml` set `HOLD_DURATION_SECONDS: "600"` as a literal string, blocking CLI environment overrides. | When testing `HOLD_DURATION_SECONDS=5 docker compose up`, the container still ran with 600s. | Replaced literals with `${HOLD_DURATION_SECONDS:-600}`, `${CORS_ALLOWED_ORIGINS:-...}`, and `${API_BASE_URL:-...}`. |
| **Student Bar Blank Screen Block** | `App.tsx` early returned on `studentId === null`, completely hiding class creation and seat listing from school administrators. | Checked PRD 8.1 rule "Apply button (disabled when availableSeats = 0 or student not set)". | Removed early return; student bar displays ID prompt at the top while class grid and creation form remain fully accessible with disabled apply buttons. |

### Successes
- **Concurrency Proof**: Verified the `FOR UPDATE` lock by testing row-lock blocking in PostgreSQL where apply waits until transaction commit, and tested 50 parallel applies on a 5-seat class with exactly 5 x 201 and 45 x 409.
- **Two Hosts Safety**: Verified bonus multi-process concurrency with two independent backend instances (ports 8080 and 8081) sharing the same database under parallel load.
- **Contract Adherence**: All 8 endpoints verified to match the frozen PRD contract exactly (field names, status codes).
- **Bangla UI**: Full i18n support implemented; all error messages and labels match the Bengali requirements in the PRD.
