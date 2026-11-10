# Assumptions and Judgment Calls

Where the brief left something open, this file records what I assumed and why. It is written to stand on its own, without other planning documents.

### 1. Concurrency: row-level locking
The brief requires `held + confirmed <= totalSeats` even under parallel requests and multiple backend processes, but does not prescribe a locking strategy.
- **Assumption**: serialise each apply on the class row inside one PostgreSQL transaction.
- **Why**: a `SELECT ... FOR UPDATE` on `classes` makes the seat count authoritative before the insert, so two requests cannot both take the last seat. An in-memory lock or counter would fail as soon as a second process shares the database.
- **Alternative rejected**: a stored `remaining_seats` column updated atomically. Seat counts must be derived from `holds` rows, so a stored counter could drift.

### 2. Clock handling and drift
The countdown must match the server's `expiresAt`, but the browser clock is not trustworthy.
- **Assumption**: client clocks can be minutes off.
- **Decision**: every API response's `Date` header updates an `offsetMs`; the countdown uses `Date.now() + offsetMs` as "server now".
- **Why**: the server stays authoritative. If the countdown reaches zero before the next poll, the poll reconciles the state.

### 3. Hold ownership and privacy (404 instead of 403)
The brief does not say what to return when a student confirms or cancels someone else's hold.
- **Decision**: return `404 HOLD_NOT_FOUND`, not `403 FORBIDDEN`.
- **Why**: a 403 would confirm that the hold ID exists. A 404 avoids leaking other students' hold IDs, and matches the behaviour for an unknown ID.

### 4. Student ID validation
The brief says "17-digit birth registration number" but not which digit characters are allowed.
- **Decision**: `X-Student-Id` must be exactly 17 ASCII digits (`0`-`9`).
- **Why**: the frontend already accepts ASCII digits only. Rejecting Unicode digit forms keeps the server and browser consistent and avoids two visually identical IDs being treated as different values.

### 5. Multi-process safety
The bonus asks for a second backend instance, so I assumed two API processes may share one database.
- **Decision**: all seat limits and state changes are serialised by PostgreSQL row locks and atomic conditional `UPDATE`s; nothing is kept in process memory.
- **Migrations**: startup takes a PostgreSQL session advisory lock (`pg_advisory_lock(727274)`), so two containers starting together do not race the schema.

### 6. Open questions from the brief
1. **Can the same class name be created twice?** Yes; names are not unique. Different shifts or sections may share a title.
2. **Does `GET /holds/{holdId}` require `X-Student-Id`?** No. The endpoint is public by hold ID, so a status page can be opened without the header.
3. **Can a confirmed student apply to another class?** Yes. The limit is one active application per class, not one per student.
4. **Can a cancelled or expired student apply again to the same class?** Yes. Those states are terminal and free the partial unique index slot.
5. **Is `expiresAt` server time only?** Yes, UTC ISO 8601 derived from the injected `TimeProvider`, never from the browser.
6. **Is the UI Bangla-only?** User-facing text is Bangla. Technical terms such as "class" and "seat" stay in English because they are the terms used in the API and the brief.

### 7. One active hold per student
- **Assumption**: a student may have at most one `HELD` or `CONFIRMED` hold per class.
- **Decision**: enforce it with a partial unique index on `(class_id, student_id) WHERE status IN ('HELD', 'CONFIRMED')`.
- **Why**: the database, not application code, guarantees the rule under concurrency. An `EXPIRED` or `CANCELLED` row no longer occupies the slot.

### 8. Effective status
- **Decision**: a `HELD` row with `expires_at <= now` is treated as `EXPIRED` in every read and write path, even before the background sweeper updates it.
- **Why**: correctness must not depend on the sweeper's timing. The sweeper is only database hygiene.

### 9. No authentication
- **Assumption**: the brief does not ask for login or sessions, so the `X-Student-Id` header is trusted as the student's identity.
- **Why**: adding authentication would be a new product requirement. Ownership checks still apply: a student cannot confirm or cancel another student's hold.
