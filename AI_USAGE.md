# AI Usage and Corrections

First-person record of which AI tools were used, where they were wrong, and how I checked the result.

## 1. AI tools used and for what

- `[TOOL / MODEL: developer to fill in]` — implementation: solution scaffold, EF Core model and migrations, endpoint/handler skeletons, integration tests, React components and hooks, and first drafts of the README, assumptions and this file.
- `[TOOL / MODEL: developer to fill in]` — follow-up edits during review: UI fixes, extra tests and documentation updates.
- Me (the developer) — read the brief, decided the API behaviour, error and ownership rules, reviewed every change, ran the app and tests, and found or confirmed the issues below.

## 2. Where the AI was wrong and how it was caught
1. **Seat limit was not actually locked in the database**
   - What went wrong: the first apply handler ran a plain `SELECT total_seats` and only its comment claimed a row lock, so two simultaneous applies could read the same free seat and both take it; it also read the clock before the lock.
   - How it was caught: comparing the SQL the handler emitted with the intended design, before the concurrency test existed; the next commit added the 200-request / 50-seat test that now guards it.
   - What was changed: one transaction with `SELECT ... FOR UPDATE` on the class row, `ToListAsync` so EF keeps the lock, and the clock read after the lock. Seat limits must be enforced by the database transaction, never by an in-process lock, because two backend processes can share one database.
2. **Student ID validation accepted non-ASCII digits**
   - What went wrong: `char.IsDigit` accepts Unicode digits, so a 17-character value written with e.g. Arabic-Indic digits passed the server while the frontend rejected it.
   - How it was caught: comparing the server check with the frontend's ASCII-only rule during review.
   - What was changed: the header must be exactly 17 characters, each in `0`-`9`, because the identifier is the 17-digit birth registration number.
3. **Hold status was serialised as a number**
   - What went wrong: the first hold response returned `status` as `0`/`1` instead of the required `HELD`/`CONFIRMED` text.
   - How it was caught: checking the JSON body against the required status strings; the later contract test asserts the same thing.
   - What was changed: `JsonStringEnumConverter` with upper-case snake-case naming in the API JSON options.
4. **`HOLD_DURATION_SECONDS` could not be overridden**
   - What went wrong: `docker-compose.yml` set the value as a literal, so `HOLD_DURATION_SECONDS=15 docker compose up` still ran with 600 seconds.
   - How it was caught: starting the stack with the override and watching a hold that should have expired after 15 seconds stay `HELD`.
   - What was changed: compose now reads `${HOLD_DURATION_SECONDS:-600}`, with the same pattern for the connection string, CORS origins and API URL, so the deployment can be configured without editing files.
5. **A missing student ID hid the whole page**
   - What went wrong: `App.tsx` returned early when no student ID was stored, so nobody could create a class or see the seat list.
   - How it was caught: opening the running app with an empty `localStorage`.
   - What was changed: the page always renders; the identity bar asks for an ID and the apply buttons stay disabled until one is set, because browsing and class creation do not need an ID.
6. **Test project had an assembly version conflict**
   - What went wrong: the test project pulled a different EF Core version than the API through Npgsql, producing MSB3277 warnings.
   - How it was caught: `dotnet build` output.
   - What was changed: EF Core and EF Core Relational are pinned to the API's version in the test project.
7. **Duplicate frontend feature folder**
   - What went wrong: an empty `frontend/features/` tree was created next to the real `frontend/src/features/`.
   - How it was caught: listing the tree and seeing two copies of the feature folders.
   - What was changed: the empty duplicate was deleted.
8. **Countdown trusted the browser clock**
   - What went wrong: a countdown based only on `Date.now()` is wrong when the client clock is off, so it can disagree with the server's `expiresAt`.
   - How it was caught: reviewing the first countdown design before the frontend commit; the committed hook already used server time, so no shipped version used the raw browser clock.
   - What was changed: every API response's `Date` header updates an offset in `serverClock.ts`, and the countdown uses that corrected time.
9. **CONFIRMED application showed its status badge twice**
   - What went wrong: `CountdownBadge` rendered a `HoldStatusBadge` for every non-`HELD` status, and `HoldCard` rendered another one, so a confirmed application showed two identical badges.
   - How it was caught: manual check of the running UI.
   - What was changed: `CountdownBadge` only shows the countdown; `HoldCard` renders the single status badge.
10. **CONFIRMED application still showed Pay and Cancel**
    - What went wrong: both buttons were always rendered and merely disabled for a confirmed hold. Cancelling a confirmed admission is not allowed and the server returns `409`, so the buttons should not be offered at all.
    - How it was caught: manual check of the running UI.
    - What was changed: buttons are derived from the effective status; only `HELD` gets Pay and Cancel, while terminal statuses get a short notice.
11. **Class list and applications panel disagreed**
    - What went wrong: the class list only knew the student ID and seat counts, not the student's holds, so it offered Apply for a class already confirmed. In the same test another class showed a disabled "confirmed" button while "my applications" had no row for it; the two views derived state from different data.
    - How it was caught: manual check with a confirmed application open in one class and the applications panel beside it.
    - What was changed: both views use `/me/holds`; one pure function (`getClassApplyState`) decides the class-card state from those rows.
12. **Wide table layout was cramped**
    - What went wrong: the class and application lists were rendered as many-column tables with action buttons squeezed into narrow cells.
    - How it was caught: manual use of the running UI at normal window width.
    - What was changed: the lists were redesigned as cards, then polished for spacing and empty footers.

## 3. How I verified the AI's work

- `cd backend && dotnet test` — real PostgreSQL via Testcontainers. The concurrency test fires 200 parallel applies at a 50-seat class and expects exactly 50 x `201`, 150 x `409`, and `held + confirmed == 50`; the suite also covers duplicate students, expiry, confirm idempotency, ownership and two hosts.
- `docker compose --profile multi up --build` — starts a second API on `:8081` against the same database; parallel applies to `:8080` and `:8081` keep `held + confirmed <= totalSeats`.
- `docker compose down` then `docker compose up` — classes and holds are still there because PostgreSQL uses a named volume; only `docker compose down -v` deletes the data.
- `HOLD_DURATION_SECONDS=15 docker compose up --build` — manual UI walk: apply, watch the countdown flip to `EXPIRED` without reload, pay, cancel, refresh and reopen the browser.
- `cd frontend && npm test && npm run lint && npm run typecheck` — unit tests, lint and type checks.
- `curl` against all eight endpoints — field names, camelCase, status strings, and the `201`/`204`/`409`/`400` codes.


