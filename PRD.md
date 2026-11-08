# PRD: School Admission System

| | |
|---|---|
| **Status** | Draft v1 (take-home assignment) |
| **Stack** | .NET 10 · PostgreSQL · React 18+ (Vite, shadcn/ui) · Docker Compose |
| **Backend URL** | `http://localhost:8080` |
| **Deliverable** | Public GitHub repo with incremental commit history |

---

## 1. Overview

A private school opens online admission for the new academic year. Admission is **first-come, first-served** (no lottery). Every class (per shift) has a limited number of seats, and thousands of guardians may apply at the same moment.

When a guardian applies, a seat is **held** in the student's name for a limited time. If the admission fee is paid inside that window, the admission is **confirmed**. If not, the seat is released automatically so others can take it.

This project delivers both the **backend API** and the **React UI**. School admins and guardians do everything from the UI.

### 1.1 Goals

1. Correctness under concurrency: `held + confirmed <= totalSeats`, always, for any number of simultaneous requests and any number of backend processes.
2. Holds expire by themselves. No API call is needed to release a seat.
3. API contract matches the spec exactly (automated tests run directly against the API).
4. A usable UI: clear states, live seat counts, countdown, friendly Bangla error messages.
5. Whole system starts with one command: `docker compose up`.

### 1.2 Non-goals

- Authentication / login (the student is identified by a header only).
- Real payment gateway ("Pay admission fee" simply means payment succeeded).
- Visual polish. Correctness and usability matter more than looks.
- Lottery, waiting lists, email/SMS notifications, document upload.

### 1.3 Glossary

| Term | Meaning |
|---|---|
| **Class** | One admission unit with its own seat count. A shift is a separate class, e.g. "Class 6 - Morning Shift" and "Class 6 - Day Shift". |
| **Hold** | A temporary reservation of one seat for one student in one class. This is what the UI calls an "application" (আবেদন). |
| **Confirm** | Fee paid in time. The hold becomes a permanent admission. |
| **Student ID** | The student's 17-digit birth registration number, sent as `X-Student-Id`. |
| **Active hold** | A hold in `HELD` status whose `expiresAt` is still in the future. |

---

## 2. Users

| User | What they do |
|---|---|
| **School admin** | Creates classes with a name and seat count. Views seat availability. |
| **Guardian / student** | Enters the student's birth registration number, browses classes, applies (hold), pays the fee (confirm) or cancels, and views their own applications. |

There is no login. The UI asks for the birth registration number once, shows it at the top of the page, and uses it as the student identity for all calls.

---

## 3. Functional Requirements

### 3.1 Class management (admin)

- **FR-1** Create a class with `name` and `totalSeats`.
- **FR-2** List all classes with live seat numbers: `totalSeats`, `heldSeats`, `confirmedSeats`, `availableSeats`.
- **FR-3** View a single class's seat status.

### 3.2 Admission flow (guardian)

- **FR-4** Apply for a seat in a class (create a hold). Hold lasts `HOLD_DURATION_SECONDS` (default `600`).
- **FR-5** View the current status of a hold.
- **FR-6** Pay the admission fee (confirm) before the hold expires.
- **FR-7** Cancel own hold.
- **FR-8** List all of the student's own applications, across classes.

### 3.3 Hold state machine

```
            apply                 confirm (before expiry)
  (none) ──────────▶  HELD ───────────────────────────────▶ CONFIRMED
                       │
                       ├── cancel (by owner) ─────────────▶ CANCELLED
                       └── expiresAt reached ─────────────▶ EXPIRED
```

- `CONFIRMED`, `CANCELLED`, `EXPIRED` are terminal.
- Only `HELD` counts toward `heldSeats`, only `CONFIRMED` toward `confirmedSeats`. `CANCELLED` and `EXPIRED` free the seat.
- A `HELD` hold whose `expiresAt <= now` is treated as `EXPIRED` everywhere (counts, reads, confirm, cancel), even if no background job has updated the row yet.

---

## 4. Business Rules (mandatory)

### 4.1 Backend

| # | Rule |
|---|---|
| B1 | `held + confirmed` **never exceeds** `totalSeats`, no matter how many requests arrive at once. |
| B2 | Hold duration comes from env var `HOLD_DURATION_SECONDS` (default `600`). |
| B3 | When a hold expires, the seat returns to the pool by itself. Nobody has to call any API. |
| B4 | A student may have at most **one active** (`HELD` or `CONFIRMED`) application per class. |
| B5 | Only the owner (matching `X-Student-Id`) can confirm or cancel a hold. |
| B6 | Only an unexpired `HELD` hold can be confirmed. |
| B7 | Confirming the same hold more than once is safe: `confirmedSeats` increases only once. |
| B8 | No data is lost on restart, including `docker compose down` followed by `docker compose up`. |

### 4.2 UI

| # | Rule |
|---|---|
| U1 | Everything works from the UI. No Postman, no direct DB access needed. |
| U2 | When a hold expires, the UI shows `EXPIRED` **without a page reload** and disables the "Pay admission fee" button. |
| U3 | Class seat numbers refresh every few seconds **without a page reload**. |
| U4 | After a page refresh or closing and reopening the browser, the student still sees their own running applications. |
| U5 | Every error (no seat, expired, bad input, server down) is shown in plain, human-readable language. No blank page, no console-only errors. |

### 4.3 Bonus (optional)

- Two backend processes on different ports, sharing one database, still never exceed `totalSeats`. Explain how in `ASSUMPTIONS.md`.
- Automated frontend tests.

---

## 5. API Contract

Base URL `http://localhost:8080`. JSON in and out. The student is identified by header `X-Student-Id` (17 digits).

> **Contract is frozen.** Extra response fields are allowed. Removing or renaming any field below is not. Automated tests call these endpoints directly.

| # | Method & path | Purpose | `X-Student-Id` |
|---|---|---|---|
| 1 | `POST /classes` | Create class | no |
| 2 | `GET /classes` | List classes with seat counts | no |
| 3 | `GET /classes/{classId}` | One class's seat status | no |
| 4 | `POST /classes/{classId}/holds` | Apply (create hold) | **yes** |
| 5 | `GET /holds/{holdId}` | Current status of a hold | no |
| 6 | `POST /holds/{holdId}/confirm` | Pay fee, confirm | **yes** |
| 7 | `DELETE /holds/{holdId}` | Cancel | **yes** |
| 8 | `GET /me/holds` | Student's own applications | **yes** |

### 5.1 `POST /classes`

```jsonc
// request
{ "name": "Class 6 - Morning Shift", "totalSeats": 120 }
// 201 response
{ "id": "c_123", "name": "Class 6 - Morning Shift", "totalSeats": 120 }
```

### 5.2 `GET /classes`

```jsonc
// 200 response
[
  { "id": "c_123", "name": "Class 6 - Morning Shift", "totalSeats": 120,
    "heldSeats": 15, "confirmedSeats": 80, "availableSeats": 25 }
]
```

`availableSeats = totalSeats - heldSeats - confirmedSeats`, where `heldSeats` counts only unexpired holds.

### 5.3 `GET /classes/{classId}`

```jsonc
// 200 response
{ "id": "c_123", "name": "Class 6 - Morning Shift", "totalSeats": 120,
  "heldSeats": 15, "confirmedSeats": 80, "availableSeats": 25 }
```

### 5.4 `POST /classes/{classId}/holds`

Header: `X-Student-Id`. No body.

```jsonc
// 201 response
{
  "holdId": "h_789",
  "classId": "c_123",
  "studentId": "20152691234567890",
  "status": "HELD",
  "expiresAt": "2026-11-01T04:10:00Z"
}
```

No seat available: **`409`**.

### 5.5 `GET /holds/{holdId}`

```jsonc
// 200 response
{ "holdId": "h_789", "classId": "c_123", "status": "HELD", "expiresAt": "2026-11-01T04:10:00Z" }
```

`status` is one of `HELD`, `CONFIRMED`, `EXPIRED`, `CANCELLED`.

### 5.6 `POST /holds/{holdId}/confirm`

Header: `X-Student-Id`.

```jsonc
// 200 response
{ "holdId": "h_789", "status": "CONFIRMED" }
```

### 5.7 `DELETE /holds/{holdId}`

Header: `X-Student-Id`. Success: **`204`**, no body.

### 5.8 `GET /me/holds`

Header: `X-Student-Id`.

```jsonc
// 200 response
[
  { "holdId": "h_789", "classId": "c_123", "className": "Class 6 - Morning Shift",
    "status": "HELD", "expiresAt": "2026-11-01T04:10:00Z" }
]
```

### 5.9 Error behavior (assumptions, to be repeated in `ASSUMPTIONS.md`)

The spec only fixes "no seat -> `409`". Everything else below is my decision.

Error body shape (extra fields are safe):

```json
{ "error": { "code": "CLASS_FULL", "message": "দুঃখিত, এই class-এ এখন কোনো seat খালি নেই।" } }
```

| Situation | Status | `code` |
|---|---|---|
| Invalid body on `POST /classes` (empty name, `totalSeats` not a positive integer) | 400 | `VALIDATION_ERROR` |
| `X-Student-Id` missing or not exactly 17 digits (on endpoints that need it) | 400 | `INVALID_STUDENT_ID` |
| Class not found | 404 | `CLASS_NOT_FOUND` |
| Hold not found, **or** hold belongs to a different student | 404 | `HOLD_NOT_FOUND` |
| No seat left | 409 | `CLASS_FULL` |
| Student already has an active hold/confirmation in this class | 409 | `ALREADY_APPLIED` |
| Confirm on an expired hold | 409 | `HOLD_EXPIRED` |
| Confirm/cancel on a cancelled hold | 409 | `HOLD_CANCELLED` |
| Cancel on a confirmed hold | 409 | `HOLD_ALREADY_CONFIRMED` |
| Confirm on an already `CONFIRMED` hold by its owner | 200 (idempotent, same body) | none |

Why 404 for someone else's hold: it avoids revealing that the hold exists.

---

## 6. Data Model

```sql
CREATE TABLE classes (
  id          uuid PRIMARY KEY,
  name        text        NOT NULL,
  total_seats integer     NOT NULL CHECK (total_seats > 0),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE holds (
  id           uuid PRIMARY KEY,
  class_id     uuid        NOT NULL REFERENCES classes(id),
  student_id   char(17)    NOT NULL,
  status       text        NOT NULL CHECK (status IN ('HELD','CONFIRMED','EXPIRED','CANCELLED')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  confirmed_at timestamptz,
  cancelled_at timestamptz
);

-- One active application per student per class (rule B4)
CREATE UNIQUE INDEX uq_holds_active_student_class
  ON holds (class_id, student_id)
  WHERE status IN ('HELD','CONFIRMED');

CREATE INDEX ix_holds_class_status ON holds (class_id, status, expires_at);
CREATE INDEX ix_holds_student      ON holds (student_id);
```

The API exposes string IDs, so IDs may be GUIDs or prefixed strings. Format is free (spec examples are only illustrations).

Seat counts are **derived**, not stored counters. This removes counter drift and makes confirm naturally idempotent (B7).

```sql
-- heldSeats
SELECT count(*) FROM holds WHERE class_id = @id AND status = 'HELD' AND expires_at > @now;
-- confirmedSeats
SELECT count(*) FROM holds WHERE class_id = @id AND status = 'CONFIRMED';
```

---

## 7. Concurrency Design (most important part)

### 7.1 Apply (`POST /classes/{id}/holds`)

All in **one PostgreSQL transaction**:

1. `SELECT total_seats FROM classes WHERE id = @id FOR UPDATE;` takes a row lock on the class. Concurrent applies for the same class queue up here. This works across **multiple backend processes** because the lock lives in the database.
2. Mark stale holds of this class as `EXPIRED`: `UPDATE holds SET status='EXPIRED' WHERE class_id=@id AND status='HELD' AND expires_at <= @now;` (this frees the unique index slot for students whose old hold timed out).
3. If this student already has an active hold/confirmation here, rollback, `409 ALREADY_APPLIED`.
4. Count `HELD` (unexpired) plus `CONFIRMED`. If `>= total_seats`, rollback, `409 CLASS_FULL`.
5. `INSERT` the hold with `expires_at = @now + HOLD_DURATION_SECONDS`.
6. Commit.

Never use in-memory locks, static counters, or caches for this. They break with more than one process (bonus) and after restart.

The partial unique index is a second safety net against duplicate applications.

### 7.2 Confirm

Single atomic statement:

```sql
UPDATE holds SET status='CONFIRMED', confirmed_at=@now
WHERE id=@holdId AND student_id=@sid AND status='HELD' AND expires_at > @now;
```

- 1 row affected: `200 CONFIRMED`.
- 0 rows: load the hold and decide: not found or other student -> `404`; already `CONFIRMED` by owner -> `200` (idempotent); `HELD` but expired (or `EXPIRED`) -> `409 HOLD_EXPIRED` (lazily mark `EXPIRED`); `CANCELLED` -> `409`.

Confirm does not change `held + confirmed`, so it cannot overflow the class.

### 7.3 Cancel

```sql
UPDATE holds SET status='CANCELLED', cancelled_at=@now
WHERE id=@holdId AND student_id=@sid AND status='HELD' AND expires_at > @now;
```

1 row -> `204`. 0 rows -> same decision logic as confirm.

### 7.4 Expiry

- **Correctness never depends on a job.** Every count and read treats `HELD AND expires_at <= now` as expired.
- A `BackgroundService` runs every few seconds and bulk-updates stale `HELD` rows to `EXPIRED`, so stored data matches reality.
- Time source: one injectable clock (`IClock`) so tests can control time. Hold expiry is written by the backend using the same clock that reads use.

### 7.5 Bonus: two backend processes

Because all serialization happens through PostgreSQL row locks and atomic `UPDATE`s, running a second instance on another port against the same DB is safe with no extra code. Document this in `ASSUMPTIONS.md` and, if time permits, add a test or compose profile that starts two instances.

---

## 8. UI Requirements

### 8.1 Screens

| Screen | Content |
|---|---|
| **Student identity bar** (top of page) | Input for 17-digit birth registration number; once set, shown permanently at the top. Stored in `localStorage` so it survives refresh. Validation message if not 17 digits. |
| **Create class** (admin) | Form: class name, seat count. Validation and success/error feedback. |
| **Class list** | Per class: name, total, held, confirmed, available. "Apply" button (disabled when `availableSeats = 0` or student not set). Auto-refresh every ~3 seconds. |
| **Application** | Status, **live countdown** to `expiresAt`, "Pay admission fee" and "Cancel" buttons. When expired: status flips to `EXPIRED` automatically and the pay button is disabled. |
| **My applications** | List from `GET /me/holds` with class name, status, and countdown for `HELD`. Loaded again on page open so progress survives reload. |

### 8.2 Behavior details

- Poll `GET /classes` and `GET /me/holds` on an interval (about 3 s). Pause or slow down when the tab is hidden.
- Countdown ticks every second locally from `expiresAt`. When it reaches zero, show `EXPIRED` immediately, then reconcile with the server on the next poll.
- Client clocks can drift. Acceptable assumption: use the server's `Date` response header to compute a clock offset, otherwise the countdown may be slightly off (record in `ASSUMPTIONS.md`).
- Disable buttons while a request is in flight, to prevent double submits.
- After apply, confirm, or cancel, refresh class list and my applications immediately.

### 8.3 Error messages (Bangla, human-readable)

| Situation | Message (example) |
|---|---|
| `CLASS_FULL` | দুঃখিত, এই class-এ এখন কোনো seat খালি নেই। |
| `HOLD_EXPIRED` | আপনার আবেদনের মেয়াদ শেষ হয়ে গেছে। আবার আবেদন করুন। |
| `ALREADY_APPLIED` | আপনি এই class-এ ইতিমধ্যে আবেদন করেছেন। |
| `INVALID_STUDENT_ID` | জন্ম নিবন্ধন নম্বর ১৭ অঙ্কের হতে হবে। |
| Validation (create class) | Field-level messages |
| Network / server down | সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না। কিছুক্ষণ পরে আবার চেষ্টা করুন। |
| Unknown error | কিছু একটা ভুল হয়েছে। আবার চেষ্টা করুন। |

Never show raw JSON, stack traces, or a blank page. Add an error boundary for unexpected render errors.

---

## 9. Configuration

| Variable | Used by | Default | Notes |
|---|---|---|---|
| `ConnectionStrings__Default` (or `DATABASE_URL`) | backend | compose value | Must be overridable by env. |
| `HOLD_DURATION_SECONDS` | backend | `600` | Lower it (for example `10`) to test expiry quickly. |
| `ASPNETCORE_URLS` | backend | `http://+:8080` | Backend on port 8080. |
| `CORS_ALLOWED_ORIGINS` | backend | frontend origin | Frontend and backend run on different ports. |
| `VITE_API_BASE_URL` | frontend | `http://localhost:8080` | Vite bakes `VITE_*` in at **build time**. In Docker, pass it as a build arg, or load runtime config (for example a generated `config.js`) so it can still change by env. |
| `POSTGRES_USER/PASSWORD/DB` | postgres | compose value | Data in a named volume. |

---

## 10. Docker & Deployment

- Root `docker-compose.yml` with three services: `db` (PostgreSQL, named volume, healthcheck), `backend` (port 8080), `frontend` (static build served by nginx, or Vite preview).
- `backend` waits for `db` healthy (`depends_on: condition: service_healthy`) and applies migrations automatically on startup (with retry).
- `backend/Dockerfile` and `frontend/Dockerfile` (multi-stage builds).
- The reviewer machine has **only Docker**. No .NET SDK or Node should be needed to run the app.
- Data survives `docker compose down` then `docker compose up` (do not use `-v`).

---

## 11. Testing

### 11.1 Backend (at least 3, one concurrency test)

| Test | Checks |
|---|---|
| **Concurrency** | Class with N seats, fire many (for example 200) parallel apply requests from distinct student IDs. Exactly N succeed (`201`), the rest get `409`. `held + confirmed == N`. |
| Same-student duplicate | Same student applies twice in the same class: second gets `409`. Parallel duplicate requests yield exactly one hold. |
| Expiry | With a short hold duration or fake clock: after expiry the seat is available again; confirm returns `409`. |
| Confirm idempotency | Confirm twice: both succeed, `confirmedSeats` rises by 1 only. |
| Ownership | Other student's confirm/cancel returns `404`. |
| Contract | Response shapes and status codes of all 8 endpoints. |

Run tests against real PostgreSQL (Testcontainers or the compose DB). An in-memory database cannot prove locking behavior.

### 11.2 Frontend (bonus)

Vitest + React Testing Library: class list rendering, apply flow, countdown flips to `EXPIRED`, error message display.

---

## 12. Deliverables Checklist

- [ ] Git repo with commit history (small commits made along the way, not one big final commit)
- [ ] `backend/` and `frontend/` folders
- [ ] `Dockerfile` in each, plus root `docker-compose.yml`
- [ ] `README.md`: how to run with Docker, frontend URL, how to run tests
- [ ] `ASSUMPTIONS.md` (short): every unclear point, what I assumed, and why
- [ ] `AI_USAGE.md` (short): which AI tool, for which part, where AI got it wrong, how I caught it
- [ ] At least 3 backend automated tests, including a concurrency test
- [ ] Bonus: multi-process safety explained; frontend tests

---

## 13. Acceptance Criteria

1. `docker compose up` on a clean machine starts DB, backend (`:8080`), and frontend with no manual steps.
2. 200 parallel apply requests on a 50-seat class: exactly 50 succeed, `heldSeats + confirmedSeats == 50`.
3. A hold left alone for `HOLD_DURATION_SECONDS` returns its seat with no API call, and the UI shows `EXPIRED` with no reload.
4. Confirming twice does not double-count.
5. After `docker compose down && docker compose up`, classes and holds are still there.
6. Refreshing the browser keeps the student identity and their running applications.
7. Every failure path shows a clear Bangla message in the UI.
8. All 8 endpoints match the contract exactly.

---

## 14. Suggested Milestones

| # | Milestone | Done when |
|---|---|---|
| 1 | Repo and Docker skeleton | `docker compose up` starts Postgres, an empty API, an empty UI |
| 2 | Schema and class endpoints | Endpoints 1 to 3 work, data persists |
| 3 | Holds, confirm, cancel | Endpoints 4 to 8 work with the transaction design in section 7 |
| 4 | Expiry and background job | Seats free themselves |
| 5 | Backend tests | Concurrency, duplicate, expiry, idempotency pass |
| 6 | Frontend core | All screens, polling, countdown |
| 7 | Frontend errors and polish | Bangla messages, error boundary, disabled states |
| 8 | Bonus | Two-process check, frontend tests |
| 9 | Docs | README, ASSUMPTIONS, AI_USAGE, final clean-machine run |

---

## 15. Open Questions (decide, then record in `ASSUMPTIONS.md`)

1. Can the same class name be created twice? (Assumed: yes, not enforced.)
2. Should `GET /holds/{holdId}` require the header? (Spec lists none, so assumed: no.)
3. Can a student with a `CONFIRMED` admission in one class apply to another class? (Assumed: yes, the rule is per class.)
4. Can a cancelled or expired student apply again to the same class? (Assumed: yes, a new hold is created.)
5. Does `expiresAt` use server time only? (Assumed: yes, UTC, ISO 8601.)
6. Should the UI language be Bangla-only? (Assumed: Bangla messages and labels; English technical terms such as "class" and "seat" kept as in the spec.)
