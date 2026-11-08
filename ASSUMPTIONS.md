All config and connection details, including DB connection string, HOLD_DURATION_SECONDS, CORS origins, and API base URL, are driven by environment variables. No hardcoded values are present in the code or configs.

ASSUMPTIONS:
1. Rootless Docker setup via DOCKER_HOST=unix:///run/user/1000/docker.sock was used; testing assumes this environment.
2. SDK version 10.0.403 in the docker image differs from local 10.0.114; resolved by pinning "10.0" with "latestPatch" rollForward in global.json.
3. Microsoft.CodeAnalysis.Analyzers 3.11.0 is required as an analyzer package for dotnet format verification, but version 3.11.0 is not directly available on NuGet; this creates a conflict where local restore works (using cached analyzer) but docker build fails (without cache). Resolved by removing --no-restore from publish to ensure analyzers are present.
4. Backend uses ASP.NET Core minimal APIs (endpoint handlers) and Entity Framework Core with Npgsql; the database scheme uses PostgreSQL-specific features (jsonb, UUID) but these are minimal and consistent.
5. The frontend's API base URL is injected at runtime via config.js (from environment variable API_BASE_URL during Docker build) and is not hardcoded.
6. Student ID validation is strictly enforced: exactly 17 digits in X-Student-Id header; longer or shorter IDs are rejected.
7. The partial unique index `uq_holds_active_student_class` on class_id, student_id WHERE status IN ('HELD','CONFIRMED') prevents duplicate active applications per student per class.
8. Expiry handling: HEDED rows with expires_at <= now are treated as expired instantly in every operation; the background expiry job is optional.
9. The initial seed data (classes) is inserted manually into the DB; no data initialization service or seeding is provided.
10. The project structure mirrors the TRD layout: domain, features, infrastructure, shared layers; CI/CD not configured.

KNOWN LIMITATIONS:
- No concurrent / parallel tests are run (no CI setup).
- Data modification via direct DB queries is allowed for testing; no proper test API for creating/modifying classes or holds (no integration tests yet).
- Frontend tests are not written yet (bonus).
- The expiry background job is not implemented; expiration is purely based on expires_at timestamp in DB.
- The DELETE /holds/{holdId} endpoint is not implemented yet.
- The API base URL is injected at container build-time, not runtime. A runtime injection mechanism would be needed if the backend URL changes after deployment.
- The docker-compose.yml healthcheck may be too aggressive; after DB initialization it may take a few extra seconds.