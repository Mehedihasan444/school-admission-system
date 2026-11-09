You are building a take-home assignment: a School Admission System (seat hold -> confirm -> expire) with a .NET backend, a React frontend, PostgreSQL, all run by `docker compose up`.

## Read first (in this order, fully)
1. AGENTS.md  - how you must work (hard rules, conventions, code quality, definition of done)
2. PRD.md     - what to build (behavior, API contract, business rules)
3. TRD.md     - how to build it (architecture, folder layout, concurrency design, Docker, tests)

If anything conflicts: PRD.md wins on behavior, TRD.md wins on implementation, AGENTS.md wins on process.

## Environment
- OS: Linux. .NET SDK 10 is installed (use `net10.0`; the assignment allows .NET 8 or newer). Docker, Node 20, and git are available.
- Use NuGet/npm package versions compatible with .NET 10 and pin them.
- Do not run `docker compose down -v` or delete data unless I ask.

## Non-negotiable
- API contract in PRD section 5 is frozen (paths, field names, status codes).
- Seat limits are enforced in PostgreSQL (row lock `FOR UPDATE` in one transaction, per TRD 5.4). No in-memory locks or counters.
- Modular, feature-based structure exactly as TRD section 4: one class/component per file, component per folder on the frontend, no cross-references between Features/Classes and Features/Holds, no business logic in endpoints or components, no `fetch` in components.
- All user-facing text in one place (backend ErrorMessages, frontend shared/i18n), Bangla messages as in the PRD.
- Config via environment variables only (connection string, HOLD_DURATION_SECONDS, CORS, API base URL via runtime config.js).
- Small, frequent git commits with conventional messages. Never one giant commit.

## This session: do ONLY Milestones 1 and 2 (TRD section 17, steps 1-2)
1. Repo skeleton: .gitignore, .editorconfig, global.json, Directory.Build.props (nullable, warnings-as-errors, analyzers), backend solution + Admission.Api + Admission.Tests projects with the folder layout from TRD 4.2, frontend Vite + React + TypeScript project with the layout from TRD 4.3 (ESLint incl. boundaries rule, Prettier, Vitest configured), backend and frontend Dockerfiles, root docker-compose.yml (db with healthcheck + named volume, backend on 8080, frontend on 3000), runtime config.js for the frontend.
2. Domain entities, EF Core 10 + Npgsql mapping with IEntityTypeConfiguration classes, snake_case naming, the partial unique index, initial migration, DatabaseInitializer (wait-for-DB retry + advisory lock + migrate on startup), GET /health.
3. Empty module shells (ClassesModule, HoldsModule) wired from Program.cs exactly as in TRD 4.2.

## Process
- Before coding, write a short plan (files and commit sequence) and wait for no approval; just start.
- After each commit-sized step run: dotnet build, dotnet format --verify-no-changes, frontend lint/typecheck/build where relevant.
- At the end, prove it works: run `docker compose up --build`, show that db, backend (GET http://localhost:8080/health) and frontend (http://localhost:3000) start, then `docker compose down` and `up` again and confirm the schema/data persists.
- Whenever you make a judgment call, add it to ASSUMPTIONS.md. Start AI_USAGE.md and record any mistakes you make and how they were caught.
- Do not implement endpoints 1-8 yet. Do not skip verification. If a command fails, fix the cause; do not claim success without running it.
- Finish with: what was created, commands run and their results, commit list, and anything I must decide.



Read AGENTS.md, PRD.md, TRD.md fully before doing anything, then inspect the current repo state (`git log --oneline`, folder tree, existing code). Follow AGENTS.md strictly: modular feature-based layout (TRD 4), contract frozen (PRD 5), seat limits enforced in PostgreSQL only, no business logic in endpoints/components, small conventional commits, no weakening of lint/tests. Stack: .NET 10 (net10.0), EF Core 10, PostgreSQL, React + shadcn/ui. Do ONLY the milestone below; do not start the next one. Record every judgment call in ASSUMPTIONS.md and every AI mistake/correction in AI_USAGE.md. Never claim something works without running it. Finish with: what changed, commands run with results, commit list, open decisions for me. 

MILESTONE 3: Class endpoints, validation, error handling.

Build (TRD 4.2, 5.1, 5.7, 5.8, 5.9):
1. Shared/Errors: AppException, ErrorCodes (constants), ErrorMessages (Bangla texts from PRD 5.9/8.3), ErrorResponse record, GlobalExceptionHandler (IExceptionHandler) producing `{ "error": { "code", "message" } }`; unknown exceptions -> 500 INTERNAL_ERROR, logged, no stack trace to client.
2. Shared/Http/RouteParsing: Guid.TryParse helpers -> 404 CLASS_NOT_FOUND on invalid id.
3. Features/Classes: ClassesModule (AddClassesModule, MapClassesEndpoints), thin endpoints for POST /classes (201), GET /classes, GET /classes/{classId}; CreateClassHandler, ClassQueryService (one query, no N+1, heldSeats counts only HELD with expiresAt > now using TimeProvider; availableSeats = total - held - confirmed), Contracts records, CreateClassRequestValidator (trimmed name 1..200 chars, totalSeats integer 1..100000) -> 400 VALIDATION_ERROR with field details.
4. Register TimeProvider.System, CORS from CORS_ALLOWED_ORIGINS, wire everything from Program.cs.

Verify (run it, show output):
- `docker compose up --build -d`, then with curl: create class (201 + exact JSON fields), list, get, get with unknown id (404), invalid guid (404), invalid body cases (400 each: empty name, totalSeats 0, totalSeats "abc", missing body), response field names exactly as PRD 5.1-5.3.
- Restart backend container and confirm classes persist.
- dotnet build, dotnet format --verify-no-changes pass.

Commits: one per logical step (errors, route parsing, class create, class queries, wiring). 

MILESTONE 4: Hold endpoints 4 to 8 with the PostgreSQL FOR UPDATE transaction.

Build (TRD 4.2, 5.4 to 5.8, 7):
1. Shared/Http/StudentIdFilter + StudentIdContext: X-Student-Id must match ^\d{17}$ else 400 INVALID_STUDENT_ID. Apply it to endpoints 4, 6, 7, 8 only (GET /holds/{id} needs no header).
2. Domain/HoldRules (pure): Effective(status, expiresAt, now), IsActive(...). Unit-testable, no EF.
3. Features/Holds: HoldsModule, endpoints ApplyHold (POST /classes/{classId}/holds -> 201), GetHold, ConfirmHold (200), CancelHold (204), MyHolds (GET /me/holds with className, newest first).
4. ApplyHoldHandler exactly per TRD 5.4: one transaction; `SELECT total_seats ... FOR UPDATE` on the class row (use SqlQuery<int> + ToListAsync so EF does not wrap the lock query); read TimeProvider AFTER the lock is acquired; expire stale HELD rows of that class; one-active-per-student check -> 409 ALREADY_APPLIED; capacity check -> 409 CLASS_FULL; insert with expiresAt = now + HOLD_DURATION_SECONDS; catch unique violation 23505 -> ALREADY_APPLIED. Rollback on any exception.
5. ConfirmHoldHandler and CancelHoldHandler as single conditional UPDATEs (TRD 5.5/5.6); on 0 rows decide error exactly per the PRD 5.9 table (404 for missing or other student's hold, 409 HOLD_EXPIRED / HOLD_CANCELLED / HOLD_ALREADY_CONFIRMED; confirm on already CONFIRMED by owner -> 200 idempotent).
6. HoldQueryService: all reads use effective status (HELD with expiresAt <= now reads as EXPIRED).
7. HOLD_DURATION_SECONDS read from env (default 600), validated > 0.

Verify (run it, show output):
- curl walkthrough: apply, duplicate apply (409), fill a 2-seat class with 3 students (3rd gets 409), confirm twice (both 200, confirmedSeats == 1), cancel, cancel after confirm (409), other student's confirm/cancel (404), missing/short header (400), GET /me/holds shape, GET /holds/{id} shape, class counts after each step.
- Parallel smoke test: a 5-seat class, 50 parallel applies with distinct 17-digit ids (xargs -P or similar): exactly 5 return 201, 45 return 409, class shows held+confirmed == 5.
- Prove the row lock really works: in psql open a transaction that runs `SELECT ... FROM classes WHERE id=... FOR UPDATE` and hold it, send an apply request, show it blocks until you COMMIT. Report what you saw.
- Build and format checks pass.

Commits: separate commits for filter, domain rules, apply, confirm, cancel, queries/endpoints. 

MILESTONE 5: Automatic expiry.

Build (TRD 5.10, 7.4):
1. Features/Holds/Expiry/ExpirySweeper: a single method that runs `UPDATE holds SET status='EXPIRED' WHERE status='HELD' AND expires_at <= @now` using TimeProvider, returns the affected count. Idempotent and safe to run in multiple processes.
2. HoldExpiryWorker (BackgroundService + PeriodicTimer): interval from Admission:ExpirySweepSeconds (default 5), enabled flag Admission:ExpiryWorkerEnabled (default true), catches and logs errors without crashing, stops cleanly on cancellation, creates a DI scope per tick.
3. Register both in HoldsModule. Options in Shared/Options/AdmissionOptions with startup validation.
4. Re-check that correctness does NOT depend on the worker: every read/apply/confirm/cancel path still treats overdue HELD rows as expired.

Verify (run it, show output):
- Start with HOLD_DURATION_SECONDS=10 in compose. Create a 1-seat class, apply (seat taken, availableSeats 0), wait ~12 s with NO API calls, show availableSeats back to 1, GET /holds/{id} shows EXPIRED, confirm returns 409 HOLD_EXPIRED, and a new student can apply.
- Repeat with the worker disabled (Admission__ExpiryWorkerEnabled=false): the API must STILL report the hold as EXPIRED and free the seat on the next read/apply. Show it.
- Check logs show the sweep count. Restore the default env afterwards.
- Build and format checks pass.

Commits: sweeper, worker, options/wiring. 

MILESTONE 6: Backend automated tests (TRD 11).

Build:
1. tests/Admission.Tests/Infrastructure: PostgresFixture (Testcontainers.PostgreSql, one container per run via xUnit collection fixture), ApiFactory : WebApplicationFactory<Program> (overrides connection string, registers FakeTimeProvider as TimeProvider, sets ExpiryWorkerEnabled=false, short configurable hold duration), small TestClient helpers (CreateClass, Apply, Confirm, Cancel, GetClass, MyHolds). Each test uses its own new class so tests are independent.
2. FIRST write the concurrency test: 50 seats, 200 parallel applies with distinct ids (i.ToString("D17")): exactly 50 x 201, 150 x 409, held+confirmed == 50, availableSeats == 0.
3. Then, mirroring src folders (tests/.../Features/Classes, Features/Holds): same-student parallel duplicate (one 201, one 409); expiry frees the seat (advance FakeTimeProvider); confirm after expiry -> 409 HOLD_EXPIRED and reads as EXPIRED; confirm idempotent (confirmedSeats == 1); ownership (404 for other student's confirm/cancel); cancel/confirm state conflicts; validation (400 cases); contract shape of all 8 endpoints (field names, status codes 201/200/204); restart persistence (new host on same DB). Add pure unit tests for HoldRules.
4. Real PostgreSQL only: no EF InMemory, no SQLite.

Prove the concurrency test is meaningful (do this locally, do NOT commit the broken state):
- Temporarily remove the FOR UPDATE lock in ApplyHoldHandler, run the concurrency test, show that it FAILS (oversell or duplicate), then restore the lock and show it passes. Report both results. Run the concurrency test 10 times in a row to check it is not flaky.

Rules: no Thread.Sleep, no flaky timing; use FakeTimeProvider. dotnet test must pass from a clean state (`dotnet test` with Docker running). dotnet format and build pass.

Commits: infrastructure, concurrency test, then groups of tests. 

MILESTONE 7: Frontend screens (PRD 8, TRD 4.3, 8). The frontend is already scaffolded with Vite + React + TypeScript + shadcn/ui; build on it.

Build:
1. shared/api (httpClient, ApiError, serverClock via Date header offset), shared/i18n (messages.bn.ts, errorMessages.ts mapping error code -> Bangla message, exactly the texts in PRD 8.3), runtimeConfig reading window.__CONFIG__, AppProviders with QueryClientProvider + ErrorBoundary.
2. features/student: useStudentId (localStorage, 17-digit validation), StudentBar at the top of the page (shows the id permanently once set).
3. features/classes: classesApi, useClasses (polling every 3 s, not in background tabs), useCreateClass, CreateClassForm (validation, inline errors), ClassList and ClassCard (total / held / confirmed / available; Apply disabled when no seats or no student id; aria-live on counts).
4. features/holds: holdsApi, hooks for apply/confirm/cancel/myHolds (polling), effectiveStatus in model/, HoldCard (status badge, live countdown from shared/hooks/useCountdown using server clock offset, "Pay admission fee" and "Cancel" buttons, flips to EXPIRED when the countdown hits zero WITHOUT reload and disables pay), MyHoldsList (survives refresh).
5. After apply/confirm/cancel, invalidate classes and my-holds queries. Disable buttons while a request is in flight. Every error path shows an inline Alert with a human-readable Bangla message (CLASS_FULL, HOLD_EXPIRED, ALREADY_APPLIED, INVALID_STUDENT_ID, VALIDATION_ERROR, NETWORK, unknown). Loading, empty and error states in every data component.
6. Use shadcn primitives + Tailwind only (no CSS Modules), Bangla-capable font stack in index.css. All strings from shared/i18n. No fetch inside components. Respect the ESLint boundaries rules.
7. Unit tests for pure logic (effectiveStatus, isValidStudentId, error mapping).

Verify (run it, show output):
- npm run lint, typecheck, format:check, build, test all pass.
- `docker compose up --build` with HOLD_DURATION_SECONDS=15: walk the PRD 11.4 manual script: create a 2-seat class, apply with 3 student ids (3rd sees the no-seat message), watch a hold flip to EXPIRED with no reload, refresh the browser and see identity and applications persist, stop the backend and see the NETWORK message instead of a blank page. If you cannot drive a browser, say so plainly and give me a numbered manual test checklist instead of claiming it works.

Commits: small, per feature piece (api/i18n, student, classes, holds, error handling). 

MILESTONE 8 AND 9: Bonus, documentation, final verification.

Bonus:
1. Multi-process safety: add a `backend2` service (same image, host port 8081, same database) to docker-compose (as a compose profile or a clearly documented service). Make sure both instances starting together do not break migrations (advisory lock, TRD 5.11). Add a backend test that creates two WebApplicationFactory hosts on the same Postgres container and fires parallel applies at both: the invariant held+confirmed <= totalSeats must hold. Also run a manual parallel curl test against ports 8080 and 8081 and report results.
2. Frontend automated tests (Vitest + Testing Library, fetch mocked): class list renders counts; Apply disabled with no seats or no student id; countdown reaches zero and the card shows EXPIRED with pay disabled (fake timers); each error code renders its Bangla message.

Docs:
3. README.md: how to run with Docker (`docker compose up --build`), URLs (frontend http://localhost:3000, API http://localhost:8080), env vars, how to run backend and frontend tests, how to change HOLD_DURATION_SECONDS, project structure overview, concurrency approach in a short paragraph.
4. ASSUMPTIONS.md (short, in my own voice, first person): finalize every open question from PRD 15 plus all judgment calls made so far (error codes, ownership 404, per-class rule, clock handling, countdown offset, no auth, multi-process explanation for the bonus). Each entry: what was unclear, what was assumed, why.
5. AI_USAGE.md (short, honest): which AI tools, for which parts, where the AI made mistakes (use the real notes collected so far) and how they were caught. Do not invent flattering entries.

Final verification (run it all, show output):
6. Clean-machine simulation: `docker compose down -v`, then `docker compose up --build` from scratch; all three services healthy; then `docker compose down` and `up` again (no -v) and confirm data persists.
7. Walk through the PRD section 13 acceptance criteria one by one and report pass/fail with evidence.
8. dotnet format --verify-no-changes, dotnet build, dotnet test; frontend lint, typecheck, format:check, build, test: all green.
9. Repo hygiene: no leftover TODOs or commented-out code in finished paths, no secrets, .gitignore correct (no bin/obj/node_modules/dist), `git log` shows incremental history. Tell me about anything weak.

Commits: bonus, tests, README, ASSUMPTIONS, AI_USAGE, final fixes.