# Assumptions and Judgment Calls

This document records decisions made where the specification was ambiguous or environmental constraints required a specific approach.

### 1. Concurrency: Row-Level Locking
I assumed that row-level locking on the `classes` table is the most robust way to enforce seat limits.
- **Why**: Using a single transaction with `SELECT ... FOR UPDATE` prevents race conditions where two processes read the same available seat count and both attempt to claim the last seat.
- **Alternative**: An atomic `UPDATE` on a `classes.remaining_seats` column was considered, but the spec requires counts to be *derived* from `holds` rows.

### 2. Clock Handling and Drift
The frontend countdown must match the backend's `expires_at`.
- **Assumption**: I assume client clocks can drift significantly.
- **Decision**: The frontend computes an `offsetMs` using the `Date` header from every API response. This offset is used to adjust `Date.now()` to "Server Now" for the countdown.
- **Verification**: Even if the client clock is wrong, the server remains the source of truth; if the countdown hits zero but the server hasn't expired it yet, the next poll reconciles the state.

### 3. Hold Ownership and Privacy (404 vs 403)
- **Decision**: When a student attempts to `Confirm` or `Cancel` a hold ID that does not belong to them, the API returns `404 HOLD_NOT_FOUND` instead of `403 FORBIDDEN`.
- **Why**: This follows security best practices to avoid revealing the existence of specific hold IDs to unauthorized users.

### 4. Student ID Validation
- **Decision**: I restricted `X-Student-Id` to exactly 17 ASCII digits (`0-9`).
- **Why**: The spec mentioned "17-digit birth registration number". Restricting to ASCII prevents issues with different Unicode digit representations and ensures compatibility with the frontend's regex.

### 5. Multi-Process Safety (Bonus)
- **Explanation**: All seat limits and concurrency rules are serialized through PostgreSQL row locks (`SELECT total_seats FROM classes WHERE id = @id FOR UPDATE`) and atomic conditional updates (`UPDATE holds ...`). Because locking and row states live exclusively in the database rather than process memory, running multiple backend processes (`backend` on :8080 and `backend2` on :8081) sharing the same PostgreSQL database is completely safe and guarantees `held + confirmed <= totalSeats` at all times.
- **Advisory Lock for Migrations**: Startup database migrations use a PostgreSQL session advisory lock (`SELECT pg_advisory_lock(727274)`) so multiple containers starting simultaneously never race or corrupt schema migrations.

### 6. Answers to PRD Section 15 Open Questions
1. **Can the same class name be created twice?** Yes, not enforced as unique. Different shifts or academic sections might share the same base title.
2. **Should `GET /holds/{holdId}` require the `X-Student-Id` header?** No, the contract specification lists no header for endpoint 5, allowing public status inspection by hold ID.
3. **Can a student with a `CONFIRMED` admission in one class apply to another class?** Yes, rule B4 specifies at most one active application *per class*.
4. **Can a cancelled or expired student apply again to the same class?** Yes, expired and cancelled holds are terminal and free the partial unique index slot, allowing a new hold to be created.
5. **Does `expiresAt` use server time only?** Yes, UTC ISO 8601 (`DateTimeOffset` in C#) derived strictly from the injected `TimeProvider`.
6. **Should the UI language be Bangla-only?** All user-facing messages, labels, and explanations are in Bangla, while standard technical terms like "class" and "seat" are retained in English as specified in PRD 8.3.

### 7. One Active Hold Per Student
- **Assumption**: A student can have at most one `HELD` or `CONFIRMED` hold per class.
- **Decision**: I implemented this using a partial unique index in PostgreSQL (`WHERE status IN ('HELD', 'CONFIRMED')`). When a hold expires, its status changes to `EXPIRED`, which "frees" the unique slot for that student in that class.

### 8. Effective Status
- **Decision**: Both backend and frontend treat `HELD` rows with `expires_at <= now` as `EXPIRED` immediately, even if the background worker hasn't updated the database row yet.
- **Why**: This ensures correctness is not dependent on the background worker's timing.
