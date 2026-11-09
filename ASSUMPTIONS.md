# Assumptions and Judgment Calls

This document records decisions made where the specification was ambiguous or environmental constraints required a specific approach.

### 1. Concurrency: Row-Level Locking
I assumed that row-level locking on the `classes` table is the most robust way to enforce seat limits.
- **Why**: Using a single transaction with `SELECT ... FOR UPDATE` prevents race conditions where two processes read the same available seat count and both attempt to claim the last seat.
- **Alternative**: An atomic `UPDATE` on a `classes.remaining_seats` column was considered, but the spec requires counts to be *derived* from `holds` rows.

### 2. Clock Handling and Drift
The frontend countdown must match the backend's `expires_at`.
- **Assumption**: I assume client clocks can drift significantly.
- **Decision**: The frontend computes an `offsetMs` using the `Date` header from Every API response. This offset is used to adjust `Date.now()` to "Server Now" for the countdown.
- **Verification**: Even if the client clock is wrong, the server remains the source of truth; if the countdown hits zero but the server hasn't expired it yet, the next poll reconciles the state.

### 3. Hold Ownership and Privacy (404 vs 403)
- **Decision**: When a student attempts to `Confirm` or `Cancel` a hold ID that does not belong to them, the API returns `404 HOLD_NOT_FOUND` instead of `403 FORBIDDEN`.
- **Why**: This follows security best practices to avoid revealing the existence of specific hold IDs to unauthorized users.

### 4. Student ID Validation
- **Decision**: I restricted `X-Student-Id` to exactly 17 ASCII digits (`0-9`).
- **Why**: The spec mentioned "17-digit birth registration number". Restricting to ASCII prevents issues with different Unicode digit representations and ensures compatibility with the frontend's regex.

### 5. Local PostgreSQL Fallback
- **Situation**: The environment's Docker socket was inaccessible (`permission denied`), which prevented running `docker compose` or `Testcontainers` directly from the agent terminal.
- **Decision**: I bootstrapped a local PostgreSQL 16 instance under `/tmp/opencode/pgroot` on port `55432` to run the integration test suite.
- **Impact**: All 45 backend integration tests (including the 200-parallel-apply concurrency test) were verified against this real PostgreSQL instance.

### 6. One Active Hold Per Student
- **Assumption**: A student can have at most one `HELD` or `CONFIRMED` hold per class.
- **Decision**: I implemented this using a partial unique index in PostgreSQL (`WHERE status IN ('HELD', 'CONFIRMED')`). When a hold expires, its status changes to `EXPIRED`, which "frees" the unique slot for that student in that class.

### 7. Effective Status
- **Decision**: Both backend and frontend treat `HELD` rows with `expires_at <= now` as `EXPIRED` immediately, even if the background worker hasn't updated the database row yet.
- **Why**: This ensures correctness is not dependent on the background worker's timing.
