# AI Usage and Corrections

This document records the interactions between the AI Agent (Gemini 3 Flash) and the developer, focusing on mistakes caught and corrected.

### Tooling and Process
- **Tools used**: `dotnet`, `npm`, `git`, `postgresql`, `shell`.
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

### Successes
- **Concurrency Proof**: Verified the `FOR UPDATE` lock by temporarily removing it and watching the concurrency test fail with 3-5% oversell, then restoring it to see 100% success across 10 runs.
- **Contract Adherence**: All 8 endpoints verified via integration tests to match the frozen PRD contract exactly (field names, status codes).
- **Bangla UI**: Full i18n support implemented; all error messages and labels match the Bengali requirements in the PRD.
