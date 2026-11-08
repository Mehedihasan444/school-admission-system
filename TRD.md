# TRD: School Admission System

Technical Requirements Document. It explains **how** the system in `PRD.md` is built. If this file and `PRD.md` disagree about behavior, `PRD.md` wins. If they disagree about implementation, this file wins.

| | |
|---|---|
| **Status** | Draft v1 |
| **Related** | `PRD.md`, `AGENTS.md` |
| **Runtime** | .NET 10 · PostgreSQL 16 · React 18+ + Vite + shadcn/ui · Docker Compose |

---

## 1. Scope

This document fixes the technical decisions for:

1. System architecture and component boundaries
2. Backend design (API, services, persistence, background work)
3. Database design and concurrency strategy
4. Frontend design
5. Configuration, containers, and local/CI workflow
6. Testing, observability, security, performance
7. Risks and architecture decision records (ADRs)

Out of scope: auth, payments, notifications (see PRD non-goals).

---

## 2. Architecture Overview

```
  Browser (React SPA, :3000)
        │  JSON over HTTP, header X-Student-Id
        ▼
  ┌───────────────────────────────────────┐
  │  ASP.NET Core API (:8080)             │
  │   ├─ Endpoints (HTTP, validation)     │
  │   ├─ Services (ClassService,          │
  │   │            HoldService)           │
  │   ├─ EF Core + raw SQL (Npgsql)       │
  │   └─ HoldExpiryWorker (BackgroundSvc) │
  └───────────────────┬───────────────────┘
                      │ TCP 5432
                      ▼
               PostgreSQL 16  (named volume `pgdata`)
```

Key properties:

- **Stateless API.** No seat state in process memory. Any number of API instances can run against one database (PRD bonus).
- **PostgreSQL is the single source of truth and the only concurrency coordinator.**
- **Time comes from one injectable `TimeProvider`**, never from the DB `now()` inside business logic and never from `DateTime.UtcNow` directly.

---

## 3. Technology Choices

| Area | Choice | Reason |
|---|---|---|
| Language/runtime | C# 14, .NET 10 (LTS) | Required by assignment |
| Web framework | ASP.NET Core minimal APIs | Small surface, easy to match an exact contract |
| ORM | EF Core 10 + `Npgsql.EntityFrameworkCore.PostgreSQL` | Migrations + typed queries; raw SQL for locking |
| Naming | `EFCore.NamingConventions` (`UseSnakeCaseNamingConvention`) | Column names match the SQL in this doc |
| Database | PostgreSQL 16 | Row locks, partial unique indexes |
| Background work | `BackgroundService` + `PeriodicTimer` | No extra infrastructure |
| Test runner | xUnit + `Microsoft.AspNetCore.Mvc.Testing` | In-process host |
| Test DB | `Testcontainers.PostgreSql` | Real PostgreSQL locking behavior |
| Fake time | `Microsoft.Extensions.TimeProvider.Testing` (`FakeTimeProvider`) | Deterministic expiry tests |
| Frontend | React 18+, TypeScript, Vite | Per spec; TS recommended |
| UI components | shadcn/ui (Radix UI primitives + Tailwind CSS) and `lucide-react` icons | Accessible primitives copied into the repo; clean UI with little custom CSS |
| Data fetching | TanStack Query v5 | Polling, loading/error state, cache invalidation |
| Frontend tests | Vitest + React Testing Library (bonus) | Standard with Vite |
| Container | Docker multi-stage builds, nginx for static frontend | Small images, only Docker needed on reviewer machine |

Pin versions in the repo (`global.json`, `package-lock.json`, image tags). Do not use `latest`.

---

## 4. Repository Layout and Modularity

The codebase is organised **by feature (vertical slices), then by layer inside the feature**. Every component has one job, lives in its own file/folder, and talks to others through a small public surface. This section is mandatory; the code samples in sections 5 and 8 show *logic* and must be placed according to the layout below.

### 4.1 Top level

```
/
├── backend/
├── frontend/
├── docker-compose.yml
├── PRD.md  TRD.md  AGENTS.md  README.md  ASSUMPTIONS.md  AI_USAGE.md
└── .gitignore  .editorconfig
```

### 4.2 Backend: feature modules

```
backend/
├── Dockerfile
├── Admission.sln
├── Directory.Build.props                  # nullable, warnings-as-errors, analyzers
├── global.json
├── src/Admission.Api/
│   ├── Program.cs                         # composition root ONLY (no logic)
│   │
│   ├── Domain/                            # pure C#, no EF / ASP.NET references
│   │   ├── ClassEntity.cs
│   │   ├── Hold.cs
│   │   ├── HoldStatus.cs
│   │   └── HoldRules.cs                   # Effective(status, now), IsActive(...)
│   │
│   ├── Infrastructure/
│   │   └── Persistence/
│   │       ├── AdmissionDbContext.cs
│   │       ├── Configurations/
│   │       │   ├── ClassEntityConfiguration.cs   # IEntityTypeConfiguration<T>
│   │       │   └── HoldConfiguration.cs
│   │       ├── Migrations/
│   │       ├── DatabaseInitializer.cs     # retry + advisory lock + migrate
│   │       └── PersistenceModule.cs       # AddPersistence(...)
│   │
│   ├── Features/
│   │   ├── Classes/
│   │   │   ├── ClassesModule.cs           # AddClassesModule + MapClassesEndpoints
│   │   │   ├── Endpoints/                 # thin HTTP handlers
│   │   │   │   ├── CreateClassEndpoint.cs
│   │   │   │   ├── ListClassesEndpoint.cs
│   │   │   │   └── GetClassEndpoint.cs
│   │   │   ├── Application/               # use cases
│   │   │   │   ├── CreateClassHandler.cs
│   │   │   │   └── ClassQueryService.cs   # list/get with seat counts
│   │   │   ├── Contracts/                 # request/response records
│   │   │   │   ├── CreateClassRequest.cs
│   │   │   │   └── ClassResponse.cs
│   │   │   └── Validation/
│   │   │       └── CreateClassRequestValidator.cs
│   │   │
│   │   └── Holds/
│   │       ├── HoldsModule.cs
│   │       ├── Endpoints/
│   │       │   ├── ApplyHoldEndpoint.cs
│   │       │   ├── GetHoldEndpoint.cs
│   │       │   ├── ConfirmHoldEndpoint.cs
│   │       │   ├── CancelHoldEndpoint.cs
│   │       │   └── MyHoldsEndpoint.cs
│   │       ├── Application/
│   │       │   ├── ApplyHoldHandler.cs    # the FOR UPDATE transaction (5.4)
│   │       │   ├── ConfirmHoldHandler.cs  # (5.5)
│   │       │   ├── CancelHoldHandler.cs   # (5.6)
│   │       │   └── HoldQueryService.cs    # reads (5.7)
│   │       ├── Contracts/
│   │       │   ├── HoldResponse.cs
│   │       │   └── MyHoldResponse.cs
│   │       └── Expiry/
│   │           ├── HoldExpiryWorker.cs    # (5.10)
│   │           └── ExpirySweeper.cs       # the UPDATE, separately testable
│   │
│   └── Shared/
│       ├── Errors/
│       │   ├── AppException.cs
│       │   ├── ErrorCodes.cs              # constants, no magic strings
│       │   ├── ErrorMessages.cs           # Bangla texts in one place
│       │   ├── ErrorResponse.cs
│       │   └── GlobalExceptionHandler.cs
│       ├── Http/
│       │   ├── StudentIdFilter.cs         # X-Student-Id validation (endpoint filter)
│       │   ├── StudentIdContext.cs        # typed access to the validated id
│       │   └── RouteParsing.cs            # Guid.TryParse -> 404 helpers
│       └── Options/
│           └── AdmissionOptions.cs        # + validator
│
└── tests/Admission.Tests/
    ├── Infrastructure/                    # PostgresFixture, ApiFactory, TestClient helpers
    └── Features/
        ├── Classes/                       # CreateClassTests, ListClassesTests
        └── Holds/                         # ApplyHoldConcurrencyTests, ConfirmHoldTests,
                                           # CancelHoldTests, ExpiryTests, OwnershipTests
```

**Dependency rules (enforced in review, optionally by an architecture test):**

```
Program ──▶ Features ──▶ Domain
              │             ▲
              └──▶ Infrastructure.Persistence ──┘
Features ──▶ Shared
```

1. `Domain` depends on nothing (no EF Core, no ASP.NET).
2. `Features/Classes` and `Features/Holds` **never reference each other**. Common concepts live in `Domain`; seat-count reads for the class list live in `ClassQueryService` using the shared DbContext.
3. Endpoints call exactly one handler/query service and map the result. No business rules, no DbContext access in endpoints.
4. Only `Infrastructure/Persistence` knows about EF configuration and migrations.
5. `Program.cs` only wires modules.

**Module contract.** Each feature exposes two extension methods and nothing else is public to the rest of the app:

```csharp
public static class HoldsModule
{
    public static IServiceCollection AddHoldsModule(this IServiceCollection services) => services
        .AddScoped<ApplyHoldHandler>()
        .AddScoped<ConfirmHoldHandler>()
        .AddScoped<CancelHoldHandler>()
        .AddScoped<HoldQueryService>()
        .AddScoped<ExpirySweeper>()
        .AddHostedService<HoldExpiryWorker>();

    public static IEndpointRouteBuilder MapHoldsEndpoints(this IEndpointRouteBuilder app)
    {
        ApplyHoldEndpoint.Map(app);
        GetHoldEndpoint.Map(app);
        ConfirmHoldEndpoint.Map(app);
        CancelHoldEndpoint.Map(app);
        MyHoldsEndpoint.Map(app);
        return app;
    }
}
```

```csharp
// Program.cs (composition root, nothing else)
builder.Services
    .AddPersistence(builder.Configuration)
    .AddSharedInfrastructure(builder.Configuration)   // options, errors, CORS, TimeProvider
    .AddClassesModule()
    .AddHoldsModule();

var app = builder.Build();
await app.InitializeDatabaseAsync();
app.UseSharedMiddleware();                            // exception handler, CORS
app.MapClassesEndpoints().MapHoldsEndpoints();
app.MapGet("/health", HealthEndpoint.Handle);
app.Run();

public partial class Program;
```

**Use-case classes instead of one big service.** The `HoldService` sketched in 5.4 to 5.7 is implemented as the separate handlers above (`ApplyHoldHandler`, `ConfirmHoldHandler`, `CancelHoldHandler`, `HoldQueryService`). Each has a single public method, constructor-injected dependencies (`AdmissionDbContext`, `TimeProvider`, `IOptions<AdmissionOptions>`), and is small enough to read in one screen. Shared pure logic (effective status, "is active") lives in `Domain/HoldRules.cs`.

### 4.3 Frontend: feature folders, component folders, shadcn/ui

The frontend is scaffolded with **Vite + React + TypeScript + shadcn/ui (Tailwind CSS + Radix UI)**. shadcn/ui is not a package: the CLI copies component source into the repo, so those files are ours to own, but we keep them close to the generated form.

```
frontend/
├── Dockerfile
├── nginx/                       default.conf, 40-config.sh
├── index.html
├── components.json              # shadcn/ui config (aliases, style, css path)
├── public/config.js             # dev default; overwritten at container start
├── package.json  tsconfig*.json  vite.config.ts   # "@/" alias -> src/
├── eslint.config.js  .prettierrc
└── src/
    ├── main.tsx                 # mount only
    ├── index.css                # Tailwind import + theme tokens (CSS variables)
    ├── app/
    │   ├── App.tsx              # layout + feature composition
    │   ├── AppProviders.tsx     # QueryClientProvider, ErrorBoundary
    │   └── runtimeConfig.ts     # reads window.__CONFIG__
    │
    ├── components/
    │   └── ui/                  # shadcn/ui primitives (generated): button.tsx, card.tsx,
    │                            # input.tsx, label.tsx, alert.tsx, badge.tsx, skeleton.tsx, ...
    ├── lib/
    │   └── utils.ts             # shadcn's cn() helper
    │
    ├── shared/                  # our own cross-feature code (no business rules)
    │   ├── api/
    │   │   ├── httpClient.ts    # fetch wrapper
    │   │   ├── ApiError.ts
    │   │   └── serverClock.ts   # Date-header offset
    │   ├── components/          # app-level shared components built FROM components/ui
    │   │   ├── ErrorBoundary/
    │   │   ├── InlineError/     # Alert wrapper: code -> Bangla message
    │   │   └── PageSection/
    │   ├── hooks/
    │   │   └── useCountdown.ts
    │   ├── i18n/
    │   │   ├── messages.bn.ts   # ALL user-facing Bangla strings
    │   │   └── errorMessages.ts # error code -> message
    │   └── lib/
    │       └── format.ts        # time/number formatting
    │
    └── features/
        ├── student/
        │   ├── components/StudentBar/    StudentBar.tsx  StudentBar.test.tsx  index.ts
        │   ├── hooks/useStudentId.ts
        │   ├── studentId.ts              # isValidStudentId, storage key
        │   └── index.ts                  # public API of the feature
        │
        ├── classes/
        │   ├── api/classesApi.ts         # listClasses, getClass, createClass
        │   ├── model/types.ts            # ClassSummary, CreateClassInput
        │   ├── hooks/useClasses.ts  useCreateClass.ts
        │   ├── components/
        │   │   ├── ClassList/            ClassList.tsx  ClassList.test.tsx  index.ts
        │   │   ├── ClassCard/            seat numbers + Apply button
        │   │   └── CreateClassForm/
        │   └── index.ts
        │
        └── holds/
            ├── api/holdsApi.ts           # apply, getHold, confirm, cancel, myHolds
            ├── model/types.ts            # Hold, HoldStatus, effectiveStatus()
            ├── hooks/
            │   ├── useApplyHold.ts  useConfirmHold.ts  useCancelHold.ts
            │   └── useMyHolds.ts
            ├── components/
            │   ├── HoldCard/             status, countdown, Pay / Cancel buttons
            │   ├── MyHoldsList/
            │   ├── CountdownBadge/
            │   └── HoldStatusBadge/
            └── index.ts
```

**shadcn/ui rules:**

1. **Keep the CLI defaults** so `npx shadcn@latest add <component>` keeps working: primitives in `src/components/ui`, `cn()` in `src/lib/utils.ts`, path alias `@/` for `src/`. Check `components.json` before adding anything.
2. **Primitives stay generic.** Files in `components/ui` contain no business knowledge, no API calls, no Bangla strings, and no imports from `features/` or `shared/`. Keep their generated single-file form (`button.tsx`); do not wrap each in a folder. Small style tweaks are fine; behavior changes go in a wrapper in `shared/components` or in the feature.
3. **Compose, don't fork.** Feature components build UI from `components/ui` primitives (`Card`, `Button`, `Badge`, `Alert`, `Input`, `Label`, `Skeleton`, optionally `Progress`, `Table`). A reusable combination used by more than one feature goes to `shared/components/<Name>/`.
4. **Styling is Tailwind utility classes** with the shadcn theme tokens (`bg-background`, `text-muted-foreground`, `destructive`, ...). No CSS Modules, no ad-hoc global CSS. Custom colors or spacing are added once as theme tokens in `index.css`. Use `cn()` for conditional classes; never build class strings by hand concatenation. Long repeated class lists become a component, not a copy-paste.
5. **Icons** from `lucide-react` only. Icon-only buttons need an `aria-label`.
6. **Errors are inline** (`Alert` via `InlineError`) next to the action, as PRD U5 requires. A toast library (`sonner`) may be used only for non-blocking success feedback, never as the only place an error appears.
7. **Forms:** keep them small. Plain controlled inputs with a pure validation function are fine; `react-hook-form` + `zod` is acceptable if it keeps `CreateClassForm` simpler. Do not add form libraries for two fields.
8. **Bangla text:** the default shadcn font is Latin-only. Set a font stack with Bengali support in `index.css` (for example `"Noto Sans Bengali"` with system fallbacks) and test that Bangla renders correctly in buttons, badges, and alerts.
9. **Dark mode** is optional and not required; do not spend time on a theme switcher.

**General frontend rules:**

1. **One feature component per folder**: `Name.tsx`, `Name.test.tsx`, `index.ts` (barrel exporting only the component and its props type). No per-component CSS file (Tailwind).
2. **Presentational vs container.** `components/ui` and `shared/components` are pure (props in, JSX out). Feature components use feature hooks.
3. **No `fetch` in components.** HTTP only in `shared/api` and each feature's `api/` module. Components use hooks; hooks call the api module.
4. **Features import each other only through `index.ts`**, never deep paths. `components/ui`, `lib`, and `shared` never import from `features`. `app` may import from everything.
5. **User-facing text only in `shared/i18n`.** No hardcoded Bangla/English strings inside components (shadcn primitives contain none).
6. Business helpers (`effectiveStatus`, `isValidStudentId`) are pure functions in `model/` or `lib/` with unit tests.
7. Components stay small: aim for under 120 lines; extract subcomponents or hooks beyond that.

### 4.4 Code quality standards (both sides)

**General**

- **Single responsibility** per file, class, function, component. If a name needs "And" or "Manager", split it.
- **Small units:** functions up to about 30 lines, files up to about 200 lines (backend) and 150 lines (frontend components). Guidelines, not a license for huge files.
- **Descriptive names**, no abbreviations except well-known ones (`id`, `dto`). Booleans read as questions (`isExpired`, `hasSeats`).
- **No magic values:** status strings, error codes, header names, route fragments, storage keys, and intervals are named constants or options.
- **No dead code, no commented-out code, no stray `TODO` in finished paths.** Comments explain *why*, not *what*.
- **Explicit over clever.** Prefer readable code to compact code.
- **Fail clearly:** expected failures use typed errors with codes; never swallow exceptions silently.
- **Pure logic is separated from I/O** so it can be unit tested without a database or DOM.

**Backend (C#)**

- Nullable reference types on, `TreatWarningsAsErrors`, latest analyzers (`AnalysisLevel=latest-recommended`).
- Constructor injection only (primary constructors are fine). No service locator, no static mutable state, no `new` of services inside services.
- Handlers and services depend on abstractions where a seam helps testing (`TimeProvider`, options); do not add interfaces that have exactly one implementation and no test value.
- DTOs are `record`s in `Contracts/`; EF entities never leave the Application layer.
- `async` end to end, `CancellationToken` on every I/O method, no `.Result`/`.Wait()`.
- EF configuration in `IEntityTypeConfiguration<T>` classes, not inside `OnModelCreating`.
- Naming: `PascalCase` public, `_camelCase` private fields, `Async` suffix on async methods, one public type per file, file name equals type name.
- XML doc comments only on non-obvious public APIs (the handlers' contracts, for example).

**Frontend (TypeScript/React)**

- `strict: true`, no `any`, no non-null `!` without a comment, no unused exports.
- Function components and hooks only; custom hooks (`useXxx`) hold stateful logic and side effects.
- Props typed with named interfaces; derive state instead of duplicating it.
- Effects clean up timers, intervals, and subscriptions.
- Accessibility basics: real `<button>`/`<label>`, `aria-live` on seat counts and errors, visible focus, sufficient contrast.
- Build UI from shadcn/ui primitives and Tailwind utilities (`cn()` for conditional classes); no custom CSS files beyond `index.css` theme tokens.
- Loading, empty, and error states handled in every data-driven component.

### 4.5 Enforcement

| Tool | Purpose | Command |
|---|---|---|
| `.editorconfig` + `dotnet format` | Consistent C# style | `dotnet format --verify-no-changes` |
| .NET analyzers via `Directory.Build.props` | Bugs/style as build errors | part of `dotnet build` |
| ESLint (`typescript-eslint`, `react-hooks`, `jsx-a11y`) | TS/React correctness | `npm run lint` |
| ESLint boundary rule (`eslint-plugin-boundaries` or `no-restricted-imports`) | Enforce feature/shared import rules | `npm run lint` |
| Prettier (+ `prettier-plugin-tailwindcss` for class order) | Consistent formatting | `npm run format:check` |
| `tsc --noEmit` | Type safety | `npm run typecheck` |
| Optional architecture test (`NetArchTest.Rules`) | Assert `Domain` has no EF/ASP.NET reference and `Classes` does not reference `Holds` | part of `dotnet test` |
| Optional CI workflow | Run all of the above on every push | `.github/workflows/ci.yml` |

`Directory.Build.props` baseline:

```xml
<Project>
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <AnalysisLevel>latest-recommended</AnalysisLevel>
    <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>
  </PropertyGroup>
</Project>
```

**Pre-merge checklist (self-review before each commit):**

- [ ] Each new file has one clear responsibility and sits in the right feature/layer folder.
- [ ] No dependency rule from 4.2 or 4.3 is broken.
- [ ] No business logic in endpoints or components; no `fetch` in components.
- [ ] No magic strings; user-facing text in `shared/i18n`.
- [ ] Build, lint, format check, and tests pass.
- [ ] New behavior has a test; the commit is small and has a clear message.

---

## 5. Backend Design

### 5.1 Layering

> Folder placement of every class below follows section 4.2. The logic is shown as samples; split it into the files listed there.

- **Endpoints** parse input, validate headers, call a service, shape the HTTP response. No business logic.
- **Services** hold all rules and transactions. They throw `AppException` for expected failures.
- **DbContext** is the only persistence access. Registered scoped.
- **Error handler** (`IExceptionHandler`) converts `AppException` into `{ "error": { "code", "message" } }` and unknown exceptions into a generic 500 with the same shape.

### 5.2 Domain model

```csharp
public enum HoldStatus { Held, Confirmed, Expired, Cancelled }

public sealed class ClassEntity
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public int TotalSeats { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class Hold
{
    public Guid Id { get; set; }
    public Guid ClassId { get; set; }
    public string StudentId { get; set; } = "";
    public HoldStatus Status { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? ConfirmedAt { get; set; }
    public DateTimeOffset? CancelledAt { get; set; }
}
```

All timestamps are UTC `DateTimeOffset` (offset 0) mapped to `timestamptz`.

### 5.3 DbContext mapping

```csharp
protected override void OnModelCreating(ModelBuilder b)
{
    b.Entity<ClassEntity>(e =>
    {
        e.ToTable("classes");
        e.HasKey(x => x.Id);
        e.Property(x => x.Name).IsRequired();
        e.ToTable(t => t.HasCheckConstraint("ck_classes_total_seats", "total_seats > 0"));
    });

    b.Entity<Hold>(e =>
    {
        e.ToTable("holds");
        e.HasKey(x => x.Id);
        e.Property(x => x.StudentId).HasColumnType("char(17)").IsRequired();
        e.Property(x => x.Status).HasConversion(
            s => s.ToString().ToUpperInvariant(),        // "HELD", "CONFIRMED", ...
            s => Enum.Parse<HoldStatus>(s, true)).IsRequired();
        e.HasOne<ClassEntity>().WithMany().HasForeignKey(x => x.ClassId);

        e.HasIndex(x => new { x.ClassId, x.StudentId })
         .IsUnique()
         .HasFilter("status IN ('HELD','CONFIRMED')")
         .HasDatabaseName("uq_holds_active_student_class");

        e.HasIndex(x => new { x.ClassId, x.Status, x.ExpiresAt })
         .HasDatabaseName("ix_holds_class_status");
        e.HasIndex(x => x.StudentId).HasDatabaseName("ix_holds_student");
    });
}
```

Status is stored as upper-case text, matching the API values and the raw SQL.

### 5.4 Apply a hold (the critical path)

One transaction, class row locked first.

```csharp
public async Task<Hold> ApplyAsync(Guid classId, string studentId, CancellationToken ct)
{
    await using var tx = await db.Database.BeginTransactionAsync(ct);   // READ COMMITTED

    // 1. Lock the class row. Concurrent applies for this class queue here.
    var rows = await db.Database
        .SqlQuery<int>($"SELECT total_seats AS \"Value\" FROM classes WHERE id = {classId} FOR UPDATE")
        .ToListAsync(ct);
    if (rows.Count == 0) throw AppException.ClassNotFound();
    var totalSeats = rows[0];

    // 2. Read the clock AFTER the lock is acquired (we may have waited).
    var now = clock.GetUtcNow();

    // 3. Expire stale holds of this class. Frees seats and unique-index slots.
    await db.Database.ExecuteSqlInterpolatedAsync($@"
        UPDATE holds SET status = 'EXPIRED'
        WHERE class_id = {classId} AND status = 'HELD' AND expires_at <= {now}", ct);

    // 4. One active application per student per class.
    var already = await db.Holds.AnyAsync(h => h.ClassId == classId && h.StudentId == studentId
        && (h.Status == HoldStatus.Held || h.Status == HoldStatus.Confirmed), ct);
    if (already) throw AppException.AlreadyApplied();

    // 5. Capacity. After step 3 every remaining HELD row is unexpired.
    var used = await db.Holds.CountAsync(h => h.ClassId == classId
        && (h.Status == HoldStatus.Held || h.Status == HoldStatus.Confirmed), ct);
    if (used >= totalSeats) throw AppException.ClassFull();

    // 6. Insert and commit.
    var hold = new Hold {
        Id = Guid.NewGuid(), ClassId = classId, StudentId = studentId,
        Status = HoldStatus.Held, CreatedAt = now,
        ExpiresAt = now.AddSeconds(options.HoldDurationSeconds)
    };
    db.Holds.Add(hold);
    try { await db.SaveChangesAsync(ct); }
    catch (DbUpdateException e) when (e.InnerException is PostgresException { SqlState: "23505" })
    { throw AppException.AlreadyApplied(); }   // unique index as a safety net

    await tx.CommitAsync(ct);
    return hold;
}
```

Notes:

- Throwing inside the `await using` transaction rolls it back on dispose, which also releases the row lock.
- Use `ToListAsync` (not `FirstOrDefaultAsync`) on the `FOR UPDATE` query so EF does not wrap it in a subquery.
- The lock is held for a few milliseconds. Throughput per class is serialized by design; different classes do not block each other.

### 5.5 Confirm

```csharp
public async Task ConfirmAsync(Guid holdId, string studentId, CancellationToken ct)
{
    var now = clock.GetUtcNow();
    var n = await db.Database.ExecuteSqlInterpolatedAsync($@"
        UPDATE holds SET status = 'CONFIRMED', confirmed_at = {now}
        WHERE id = {holdId} AND student_id = {studentId}
          AND status = 'HELD' AND expires_at > {now}", ct);
    if (n == 1) return;

    // 0 rows: find out why.
    var h = await db.Holds.AsNoTracking().FirstOrDefaultAsync(x => x.Id == holdId, ct);
    if (h is null || h.StudentId != studentId) throw AppException.HoldNotFound();
    switch (h.Status)
    {
        case HoldStatus.Confirmed: return;                                   // idempotent
        case HoldStatus.Cancelled: throw AppException.HoldCancelled();
        default:                    throw AppException.HoldExpired();         // Held-but-late or Expired
    }
}
```

Confirm does not change `held + confirmed`, so it needs no class lock. The atomic `UPDATE` is enough.

### 5.6 Cancel

Same shape as confirm with `status = 'CANCELLED', cancelled_at = {now}` and success meaning `204`. When 0 rows: `HoldNotFound` for missing/other student, `HoldAlreadyConfirmed` for confirmed, `HoldCancelled` for cancelled, `HoldExpired` for expired.

### 5.7 Reads

All reads derive effective state from the clock, not from the stored status alone.

```csharp
static HoldStatus Effective(Hold h, DateTimeOffset now) =>
    h.Status == HoldStatus.Held && h.ExpiresAt <= now ? HoldStatus.Expired : h.Status;
```

Class list with counts (one query, no N+1):

```csharp
var now = clock.GetUtcNow();
return await db.Classes.AsNoTracking().OrderBy(c => c.CreatedAt)
    .Select(c => new {
        c.Id, c.Name, c.TotalSeats,
        Held = db.Holds.Count(h => h.ClassId == c.Id && h.Status == HoldStatus.Held && h.ExpiresAt > now),
        Confirmed = db.Holds.Count(h => h.ClassId == c.Id && h.Status == HoldStatus.Confirmed)
    }).ToListAsync(ct);
// availableSeats = TotalSeats - Held - Confirmed
```

`GET /me/holds` joins `holds` to `classes` for `className`, filters by `student_id`, orders by `created_at DESC`, and maps each row through `Effective`.

### 5.8 Endpoints and validation

- Route IDs are parsed with `Guid.TryParse`. An invalid GUID yields `404` (`CLASS_NOT_FOUND` or `HOLD_NOT_FOUND`).
- `X-Student-Id` is read by one helper / endpoint filter: missing or not `^\d{17}$` yields `400 INVALID_STUDENT_ID`. Applied to endpoints 4, 6, 7, 8.
- `POST /classes`: trimmed `name` must be non-empty and at most 200 characters; `totalSeats` must be an integer between 1 and a sane upper bound (for example 100000). Otherwise `400 VALIDATION_ERROR` with field details.
- JSON: `System.Text.Json` defaults (camelCase), `JsonStringEnumConverter` with upper-case naming for statuses in responses (or map to strings explicitly in DTOs).
- Responses use DTO records, not EF entities, so the contract cannot drift by accident.
- Extra endpoint allowed: `GET /health` (returns 200 when the DB is reachable). Contract endpoints must not change.

### 5.9 Error model

```csharp
public sealed class AppException(int status, string code, string message) : Exception(message)
{
    public int Status { get; } = status;
    public string Code { get; } = code;
    public static AppException ClassFull()        => new(409, "CLASS_FULL",       "দুঃখিত, এই class-এ এখন কোনো seat খালি নেই।");
    public static AppException AlreadyApplied()   => new(409, "ALREADY_APPLIED",  "আপনি এই class-এ ইতিমধ্যে আবেদন করেছেন।");
    public static AppException HoldExpired()      => new(409, "HOLD_EXPIRED",     "আপনার আবেদনের মেয়াদ শেষ হয়ে গেছে।");
    public static AppException HoldNotFound()     => new(404, "HOLD_NOT_FOUND",   "আবেদনটি খুঁজে পাওয়া যায়নি।");
    // ... remaining factories per PRD 5.9
}
```

An `IExceptionHandler` writes `{ "error": { "code": "...", "message": "..." } }` with the status. Unknown exceptions are logged and returned as `500 INTERNAL_ERROR` with a generic message. Stack traces never reach the client. The frontend maps by `code`, so message text on the server is a fallback only.

### 5.10 Background expiry worker

```csharp
public sealed class HoldExpiryWorker(IServiceScopeFactory scopes, TimeProvider clock,
    IOptions<AdmissionOptions> opt, ILogger<HoldExpiryWorker> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        if (!opt.Value.ExpiryWorkerEnabled) return;                       // disabled in tests
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(opt.Value.ExpirySweepSeconds));
        while (await timer.WaitForNextTickAsync(ct))
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<AdmissionDbContext>();
                var now = clock.GetUtcNow();
                var n = await db.Database.ExecuteSqlInterpolatedAsync($@"
                    UPDATE holds SET status = 'EXPIRED'
                    WHERE status = 'HELD' AND expires_at <= {now}", ct);
                if (n > 0) log.LogInformation("Expired {Count} holds", n);
            }
            catch (OperationCanceledException) { }
            catch (Exception e) { log.LogError(e, "Expiry sweep failed"); }
        }
    }
}
```

The worker is a **tidy-up only**. Every read and write already treats overdue `HELD` rows as expired, so correctness never depends on it. Running it in two instances is harmless (idempotent `UPDATE`).

### 5.11 Startup and migrations

1. Bind `AdmissionOptions` (see section 9) and validate at startup (`HoldDurationSeconds > 0`).
2. Wait for the DB with a small retry loop (for example 30 attempts, 1 s apart), then run `db.Database.MigrateAsync()`.
3. **Two instances starting together can race on migrations.** Recent EF Core versions lock during `Migrate()`, but an explicit PostgreSQL advisory lock is a cheap, visible guarantee (verify the EF behavior for the exact version you install). Wrap the migrate call:

```csharp
await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_lock(727274)");
try { await db.Database.MigrateAsync(); }
finally { await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_unlock(727274)"); }
```

   (Session-level lock; run both statements on the same open connection, for example by calling `db.Database.OpenConnectionAsync()` first.)
4. Configure CORS from `CORS_ALLOWED_ORIGINS`, register `TimeProvider.System`, the exception handler, the services, and the worker.
5. `public partial class Program;` at the bottom of `Program.cs` so `WebApplicationFactory<Program>` works in tests.

---

## 6. Database

Schema, indexes, and the derived-count rule are specified in `PRD.md` section 6. Technical points:

- **Migrations** are generated by EF (`dotnet ef migrations add Initial`) and committed. The partial unique index is expressed with `HasFilter` (see 5.3). Verify the generated SQL contains it.
- **Isolation level:** `READ COMMITTED` (PostgreSQL default). It is sufficient because correctness comes from the explicit row lock on `classes`, not from serializable isolation. Do not switch to `SERIALIZABLE`; it would add retry complexity for no gain.
- **Connection pool:** Npgsql default max pool size is 100. During a request storm, requests wait for a connection (default timeout 15 s). Set `Maximum Pool Size` and `Timeout` explicitly in the connection string, and keep transactions short.
- **Time columns** are written from the application clock. Do not use `now()` in logic (the `created_at` default is informational only).
- **Query plans to verify** (`EXPLAIN`): the count query uses `ix_holds_class_status`; `GET /me/holds` uses `ix_holds_student`.

---

## 7. Concurrency Analysis

### 7.1 Why the invariant holds

`held + confirmed <= totalSeats` is enforced in exactly one place: the apply transaction. Every apply for a class takes `FOR UPDATE` on the same `classes` row, so apply transactions for that class run one at a time. Inside the lock, the count is accurate, because the only operations that can increase the count are other applies (blocked by the lock). Confirm keeps the count unchanged. Cancel and expiry only decrease it.

### 7.2 Race scenarios

| Scenario | Outcome |
|---|---|
| 200 applies, 50 seats, same class | They serialize on the row lock. First 50 insert, the rest see `used >= total` and get `409 CLASS_FULL`. |
| Same student sends 2 parallel applies | Serialized by the lock. The second sees the first and gets `409 ALREADY_APPLIED`. The partial unique index backs this up. |
| Confirm racing with expiry at time T | Confirm's `UPDATE` locks the row. The sweeper/apply expiry `UPDATE` waits, then re-checks `status = 'HELD'` (READ COMMITTED re-evaluation), no longer matches, and skips it. Result: confirmed. |
| Confirm arrives after `expiresAt` | `expires_at > now` is false, 0 rows updated, response `409 HOLD_EXPIRED`. |
| Cancel racing with apply when class is full | Apply may see the old count and return `409` just before the seat frees. Safe (never oversells) and acceptable. |
| Confirm sent twice in parallel | One `UPDATE` wins (`CONFIRMED`). The other updates 0 rows, finds `CONFIRMED` for the owner, returns `200`. `confirmedSeats` rises once. |
| Two API processes, one DB | Same as the single-process case because locks live in PostgreSQL. |
| Sweeper in two processes | Idempotent `UPDATE`; harmless. |
| API restart mid-flight | Open transaction rolls back; no partial state. Holds persist; expiry continues because it depends only on stored `expires_at`. |

### 7.3 Alternatives considered

- **Atomic `INSERT ... SELECT ... WHERE count < total`:** not safe under READ COMMITTED without a lock; two transactions can both see `count < total`.
- **Stored counter with `UPDATE ... WHERE held + confirmed < total`:** works, but needs counter maintenance on every expire/cancel and can drift. Derived counts are simpler to reason about.
- **`pg_advisory_xact_lock(hashtext(class_id))`:** equivalent behavior; row lock is chosen because it also validates that the class exists in one statement.
- **Optimistic concurrency with retries:** more complex and worse under heavy contention than a short lock.

---

## 8. Frontend Design

### 8.1 Structure and state

> File and folder placement follows section 4.3 (feature folders, one component per folder). The `api` client below lives in `shared/api/httpClient.ts`; error messages in `shared/i18n/errorMessages.ts`.

- Vite + React 18 + TypeScript, function components and hooks.
- **Server state** in TanStack Query. No global client store needed.
- **Student ID** in a small `useStudentId` hook backed by `localStorage` (key `admission.studentId`), validated as 17 digits.
- All HTTP in `api/client.ts`:

```ts
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export async function api<T>(path: string, init: RequestInit & { studentId?: string } = {}): Promise<T> {
  const { studentId, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(`${window.__CONFIG__.API_BASE_URL}${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(studentId ? { "X-Student-Id": studentId } : {}),
        ...rest.headers,
      },
    });
  } catch {
    throw new ApiError(0, "NETWORK", "network");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error?.code ?? "UNKNOWN", body?.error?.message ?? "");
  }
  return res.status === 204 ? (undefined as T) : res.json();
}
```

### 8.2 Polling

```ts
useQuery({ queryKey: ["classes"], queryFn: listClasses,
           refetchInterval: 3000, refetchIntervalInBackground: false });
useQuery({ queryKey: ["me", studentId], queryFn: () => myHolds(studentId!),
           enabled: !!studentId, refetchInterval: 3000 });
```

After apply, confirm, or cancel: `invalidateQueries` for `["classes"]` and `["me"]`.

### 8.3 Countdown and expiry (PRD U2)

```ts
export function useCountdown(expiresAt?: string, serverOffsetMs = 0) {
  const [now, setNow] = useState(() => Date.now() + serverOffsetMs);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + serverOffsetMs), 1000);
    return () => clearInterval(id);
  }, [serverOffsetMs]);
  const remainingMs = expiresAt ? Math.max(0, Date.parse(expiresAt) - now) : 0;
  return { remainingMs, expired: !!expiresAt && remainingMs === 0 };
}
```

The component displays the effective status: if the server says `HELD` but `expired` is true locally, show `EXPIRED` and disable "Pay admission fee". The next poll confirms it. Clock offset is computed from the `Date` response header of the first successful call (`serverTime - Date.now()`); if unavailable the offset is `0`.

### 8.4 Error mapping

```ts
const MESSAGES: Record<string, string> = {
  CLASS_FULL:         "দুঃখিত, এই class-এ এখন কোনো seat খালি নেই।",
  HOLD_EXPIRED:       "আপনার আবেদনের মেয়াদ শেষ হয়ে গেছে। আবার আবেদন করুন।",
  ALREADY_APPLIED:    "আপনি এই class-এ ইতিমধ্যে আবেদন করেছেন।",
  INVALID_STUDENT_ID: "জন্ম নিবন্ধন নম্বর ১৭ অঙ্কের হতে হবে।",
  VALIDATION_ERROR:   "দেওয়া তথ্যে ভুল আছে। অনুগ্রহ করে যাচাই করুন।",
  NETWORK:            "সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না। কিছুক্ষণ পরে আবার চেষ্টা করুন।",
};
export const toMessage = (e: unknown) =>
  (e instanceof ApiError && MESSAGES[e.code]) || "কিছু একটা ভুল হয়েছে। আবার চেষ্টা করুন।";
```

Messages are shown in an inline alert near the action, not only in the console. An `ErrorBoundary` wraps the app for render errors.

### 8.5 Runtime configuration

`VITE_*` values are compiled into the bundle, so they cannot change by env after build. Instead:

- `index.html` loads `/config.js` before the app bundle.
- `public/config.js` (dev default): `window.__CONFIG__ = { API_BASE_URL: "http://localhost:8080" };`
- In the container, `nginx/40-config.sh` regenerates `/usr/share/nginx/html/config.js` from the `API_BASE_URL` env var at start:

```sh
#!/bin/sh
cat > /usr/share/nginx/html/config.js <<EOF
window.__CONFIG__ = { API_BASE_URL: "${API_BASE_URL:-http://localhost:8080}" };
EOF
```

`API_BASE_URL` is used by the **browser**, so it must be a URL reachable from the user's machine (`http://localhost:8080`), not a Docker service name.

---

## 9. Configuration

| Variable | Component | Default | Notes |
|---|---|---|---|
| `ConnectionStrings__Default` | backend | `Host=db;Port=5432;Database=admission;Username=admission;Password=admission;Maximum Pool Size=100;Timeout=30` | Env overrides config files. |
| `Admission__HoldDurationSeconds` / `HOLD_DURATION_SECONDS` | backend | `600` | Support the plain `HOLD_DURATION_SECONDS` name (read it explicitly, it is what the spec names). |
| `Admission__ExpirySweepSeconds` | backend | `5` | Worker interval. |
| `Admission__ExpiryWorkerEnabled` | backend | `true` | `false` in tests. |
| `CORS_ALLOWED_ORIGINS` | backend | `http://localhost:3000` | Comma-separated. |
| `ASPNETCORE_URLS` | backend | `http://+:8080` | |
| `API_BASE_URL` | frontend container | `http://localhost:8080` | Written to `config.js` at start. |
| `POSTGRES_DB/USER/PASSWORD` | db | `admission` | Local dev defaults only. |

Rules: no hardcoded values in code; no secrets committed other than local dev defaults inside `docker-compose.yml`.

---

## 10. Containers

### 10.1 `backend/Dockerfile`

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY Admission.sln ./
COPY src/Admission.Api/*.csproj src/Admission.Api/
COPY tests/Admission.Tests/*.csproj tests/Admission.Tests/
RUN dotnet restore
COPY . .
RUN dotnet publish src/Admission.Api -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "Admission.Api.dll"]
```

### 10.2 `frontend/Dockerfile`

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/40-config.sh /docker-entrypoint.d/40-config.sh
RUN chmod +x /docker-entrypoint.d/40-config.sh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

`default.conf` serves the SPA with a fallback to `index.html` and disables caching for `config.js`.

### 10.3 `docker-compose.yml`

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: admission
      POSTGRES_USER: admission
      POSTGRES_PASSWORD: admission
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admission -d admission"]
      interval: 3s
      timeout: 3s
      retries: 20

  backend:
    build: ./backend
    environment:
      ConnectionStrings__Default: "Host=db;Port=5432;Database=admission;Username=admission;Password=admission;Maximum Pool Size=100;Timeout=30"
      HOLD_DURATION_SECONDS: "600"
      CORS_ALLOWED_ORIGINS: "http://localhost:3000"
    ports:
      - "8080:8080"
    depends_on:
      db:
        condition: service_healthy

  frontend:
    build: ./frontend
    environment:
      API_BASE_URL: "http://localhost:8080"
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  pgdata:
```

Requirements: `docker compose up` works from a clean checkout with only Docker; `docker compose down` (without `-v`) keeps data; no host SDKs needed. For the optional two-process bonus, add a `backend2` service (same image, host port `8081`) or a compose profile.

---

## 11. Testing Strategy

### 11.1 Infrastructure

- `PostgresFixture` (xUnit collection fixture) starts one `PostgreSqlContainer` for the test run.
- `ApiFactory : WebApplicationFactory<Program>` overrides the connection string, registers a `FakeTimeProvider` as `TimeProvider`, and sets `ExpiryWorkerEnabled=false`.
- Each test creates its own class (fresh GUID) so tests are independent without truncating tables.
- Optional switch: if env `TEST_BASE_URL` is set, run the same tests against the running compose stack.

### 11.2 Test matrix

| Test | Level | Assertion |
|---|---|---|
| **Concurrency: oversell** | integration | 50 seats, 200 parallel applies with distinct IDs (`i.ToString("D17")`): exactly 50 `201`, 150 `409`; class shows `held + confirmed == 50`, `availableSeats == 0`. |
| Same-student duplicate | integration | Parallel double apply: exactly one `201`, one `409`. |
| Expiry frees seat | integration | Fill class, advance `FakeTimeProvider` past duration, `availableSeats` returns, new apply succeeds. |
| Confirm after expiry | integration | `409 HOLD_EXPIRED`, hold reads as `EXPIRED`. |
| Confirm idempotent | integration | Two confirms both `200`; `confirmedSeats == 1`. |
| Ownership | integration | Other student's confirm/cancel gives `404`. |
| Confirm vs cancel states | integration | Cancel after confirm gives `409`; confirm after cancel gives `409`. |
| Validation | integration | Missing/short `X-Student-Id` gives `400`; bad `POST /classes` body gives `400`. |
| Contract shapes | integration | JSON field names/types of all 8 endpoints, status codes `201/200/204`. |
| **Two hosts, one DB** (bonus) | integration | Two `ApiFactory` instances share the container; hit both concurrently; invariant still holds. |
| Restart persistence | integration | Dispose host, create a new one on the same DB, data still present. |

Concurrency test sketch:

```csharp
var classId = await CreateClass(seats: 50);
var results = await Task.WhenAll(Enumerable.Range(0, 200).Select(i =>
    Task.Run(() => PostHold(classId, i.ToString("D17")))));
Assert.Equal(50,  results.Count(r => r == HttpStatusCode.Created));
Assert.Equal(150, results.Count(r => r == HttpStatusCode.Conflict));
var c = await GetClass(classId);
Assert.Equal(50, c.HeldSeats + c.ConfirmedSeats);
```

Do not use the EF in-memory provider or SQLite for any of these. They do not reproduce PostgreSQL locking.

### 11.3 Frontend (bonus)

Vitest + React Testing Library with `fetch` mocked: class list renders counts; Apply disabled when `availableSeats = 0` or no student ID; countdown reaches zero and the card shows `EXPIRED` with the pay button disabled (fake timers); each error code renders its Bangla message.

### 11.4 Manual acceptance run

1. `docker compose up --build`, open `http://localhost:3000`.
2. Set `HOLD_DURATION_SECONDS=15`, create a 2-seat class, apply with 3 student IDs: the third sees the "no seat" message.
3. Wait: the first card flips to `EXPIRED` with no reload; available seats go up.
4. Refresh the browser: student ID and applications are still there.
5. `docker compose down && docker compose up`: data still there.

### 11.5 Optional CI (GitHub Actions)

One workflow: `dotnet test` (Docker is available on hosted runners for Testcontainers), `npm ci && npm run build && npm test`, and `docker compose build`. Nice for the reviewer, not required.

---

## 12. Observability

- Built-in `ILogger` with console output. Log: hold created/confirmed/cancelled (IDs only), sweeper counts, unexpected exceptions.
- Do not log full student IDs; log the last 4 digits at most.
- `GET /health` for compose or humans.
- Add a request correlation ID (`HttpContext.TraceIdentifier`) to error logs.

---

## 13. Security

- All SQL parameterized (`FromSqlInterpolated` / `ExecuteSqlInterpolated` produce parameters; never concatenate).
- Input validation on every endpoint (section 5.8).
- No authentication by design, so `X-Student-Id` is an identity claim, not proof. Document this in `ASSUMPTIONS.md`. Ownership checks still prevent accidental cross-student actions.
- CORS restricted to the configured frontend origin.
- Errors never expose stack traces or SQL.
- Request body size limits stay at the Kestrel defaults; bodies are tiny.
- Out of scope (note as future work): rate limiting, bot protection for the apply endpoint, real auth.

---

## 14. Performance Targets

Targets for local Docker on a developer laptop (indicative, not a hard SLA):

| Metric | Target |
|---|---|
| Apply under 200 concurrent requests on one class | p95 below 300 ms, 0 oversell |
| `GET /classes` with 100 classes | below 50 ms |
| Background sweep with 10k stale rows | below 1 s |
| Frontend poll load | one `GET /classes` and one `GET /me/holds` per client every 3 s |

Scaling notes: per-class apply throughput is bounded by the lock hold time (a few ms per apply, so hundreds per second per class). Different classes scale independently. For much larger load, options are a read replica or short-lived cache for `GET /classes` (reads only; never for the apply path) and a queue in front of apply. These are out of scope for the assignment.

---

## 15. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Connection pool exhaustion under a request burst | Timeouts/500s | Short transactions, explicit pool size and timeout, async everywhere |
| EF wraps `FOR UPDATE` in a subquery | Lock not taken as expected | `SqlQuery<int>` + `ToListAsync`; verify with a test that inspects blocking, or log SQL once |
| Parallel migrations with two instances | Startup failure | Advisory lock around `MigrateAsync` |
| `VITE_*` baked at build time | API URL not env-changeable | Runtime `config.js` (section 8.5) |
| `API_BASE_URL` set to a Docker service name | Browser cannot reach API | Document: must be a browser-reachable URL |
| Client clock skew breaks countdown | Wrong remaining time | Server `Date` header offset; server remains the authority via polling |
| Test flakiness from real sleeps | Unreliable CI | `FakeTimeProvider`, no `Thread.Sleep` |
| Startup race: backend before DB ready | Crash on boot | Compose healthcheck + retry loop |
| Using DB `now()` and app clock mixed | Inconsistent expiry | Only app clock in logic (rule in `AGENTS.md`) |
| One giant final commit | Weak review signal | Commit per milestone (`AGENTS.md` 5.3) |

---

## 16. Architecture Decision Records

| # | Decision | Alternatives | Why |
|---|---|---|---|
| ADR-1 | Serialize applies with `SELECT ... FOR UPDATE` on the class row | Advisory lock, serializable isolation, optimistic retry | Simple, correct across processes, scoped per class |
| ADR-2 | Derive counts from `holds`, no stored counters | Counter column on `classes` | No drift; idempotent confirm is free |
| ADR-3 | Treat overdue `HELD` as expired on every read/write; worker only tidies | Rely only on a background job | Correct even when the job is late or down |
| ADR-4 | Single injectable `TimeProvider`, no DB `now()` in logic | DB time | Deterministic tests; one clock |
| ADR-5 | Partial unique index on `(class_id, student_id)` for active statuses | Application check only | Second line of defense |
| ADR-6 | Confirm and cancel as single conditional `UPDATE` | Load-modify-save | Atomic; no lost updates |
| ADR-7 | EF Core for mapping/migrations, raw SQL for lock and conditional updates | Dapper only | Productivity plus explicit control where it matters |
| ADR-8 | Runtime `config.js` for the frontend API URL | Build-time `VITE_API_BASE_URL` | Env-changeable without rebuild |
| ADR-9 | TanStack Query with 3 s polling | WebSockets/SSE | Meets the "no reload, few seconds" rule with far less complexity |
| ADR-10 | Real PostgreSQL in tests via Testcontainers | In-memory/SQLite | Locking semantics must be real |
| ADR-11 | Error body `{ error: { code, message } }`, UI maps by `code` | Free-text messages | Stable, translatable, testable |
| ADR-12 | Feature-based vertical slices with use-case handlers; `Features/Classes` and `Features/Holds` independent; one component per folder on the frontend | Layered-by-type folders, one large `HoldService` | Small focused files, clear ownership, easy review and testing |
| ADR-13 | shadcn/ui + Tailwind for UI, keeping CLI default paths (`components/ui`, `lib/utils.ts`) | Hand-written CSS Modules, a full component library (MUI) | Accessible primitives, less custom CSS, CLI keeps working; avoids a heavy dependency |

---

## 17. Build Order (maps to PRD milestones)

1. Scaffold: solution, projects, `docker-compose.yml`, DB container and health, empty API and UI that start with `docker compose up`.
2. Entities, DbContext, initial migration, startup migrate with retry and advisory lock.
3. `POST /classes`, `GET /classes`, `GET /classes/{id}` plus validation and error handler.
4. `HoldService`: apply, confirm, cancel, reads; endpoints 4 to 8.
5. `HoldExpiryWorker`.
6. Backend tests (concurrency first), then the rest of the matrix.
7. Frontend: client, hooks, screens, polling, countdown, error mapping, error boundary.
8. Bonus: two-host test, frontend tests.
9. README, `ASSUMPTIONS.md`, `AI_USAGE.md`, clean-machine verification.

Commit after each step.
