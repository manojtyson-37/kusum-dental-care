# Backend Build Progress

Tracks status against `IDE_Prompt_for_Backend_Development.md`. Update this file
whenever a task's status changes.

Last updated: 2026-08-28

## Architecture change: migrated to Supabase

The backend now runs on **Supabase** (hosted Postgres + Auth + RLS) instead
of self-hosted Postgres/Redis/Knex/JWT/bcryptjs. This was a deliberate,
user-requested full migration, not a partial swap:

- **Auth**: Supabase Auth (`supabase.auth.signUp/signInWithPassword/
  refreshSession/signOut`) replaces the custom `AuthService` JWT+bcryptjs
  implementation. No password hashing or token signing happens in app code.
- **Authorization**: Postgres Row Level Security policies (in
  `supabase/migrations/20260828000003_rls_policies.sql`) are the source of
  truth for who can read/write what — not app-level `if` checks. Role claims
  are read from `auth.jwt() -> app_metadata`, never `user_metadata` (the
  latter is client-editable — see Supabase security checklist).
- **Data access**: services take a `supabase-js` client per call
  (`src/lib/supabase.ts` — `createUserClient(token)` for RLS-scoped requests,
  `supabaseAdmin` for trusted server-only writes like audit logs).
- **Schema**: 11 Phase-1 tables moved from `backend/src/database/migrations`
  (Knex) to `supabase/migrations/` (raw SQL) at the repo root, keyed to
  `auth.users` via a `public.profiles` table instead of a custom `users`
  table. A trigger (`handle_new_user`) auto-creates the profile row and seeds
  the role claim on signup.
- **Removed**: `knex`, `pg`, `redis`, `bull`, `@fastify/jwt`, `bcryptjs` and
  all files under `backend/src/database/` (connection, knexfile, redis,
  migrations). Docker Compose no longer runs local Postgres/Redis containers
  — the backend container is stateless.

## Phase 1 (Weeks 1-4) — Foundation

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Project setup (TS, Fastify, Docker, env, lint) | ✅ Done | Updated for Supabase env vars (`SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY`), deps trimmed |
| 2 | Database schema (11 tables) | ✅ Done | Rewritten as SQL in `supabase/migrations/20260828000001_initial_schema.sql` — same 11 tables, `profiles` replaces `users`, FKs point to `auth.users`/`profiles` |
| 2b | RLS policies | ✅ Done | `supabase/migrations/20260828000003_rls_policies.sql` — every table has RLS enabled; ownership + role-based policies; `audit_logs`/`notification_queue`/`otps` have zero client policies (service_role-only by design) |
| 2c | Auth trigger + role claims | ✅ Done | `supabase/migrations/20260828000002_auth_trigger_and_helpers.sql` — `handle_new_user` trigger, `set_user_role` admin function, `updated_at` triggers |
| 3 | Authentication system | ✅ Done | `AuthService` now a thin wrapper over Supabase Auth; `middleware/auth.ts` uses `supabase.auth.getUser()` instead of JWT verify |
| 4 | Core API structure | ✅ Done | `server.ts`, `errorHandler.ts`, `validation.ts`, `logging.ts`, `audit.ts` (audit now writes via `supabaseAdmin`) |
| 5 | Patient profile endpoints | ✅ Done | `PatientService`/`api/routes/patients.ts` rewritten to use `supabase-js` (RLS-scoped client), app-level `ensureSelfOrStaff` kept as a belt-and-suspenders 403 |
| 6 | Service/treatment endpoints | ✅ Done | `ServiceService`/`api/routes/services.ts` rewritten to use `supabase-js`; public listing uses anon-key client so RLS's public-read policy governs it |
| 7 | Error handling & logging | ✅ Done | Unchanged — Winston + `AppError` family |
| 8 | API documentation (Swagger) | ✅ Done | Unchanged, served at `/api/docs` |
| 9 | Database connection | ✅ Done | Replaced by `src/lib/supabase.ts` (`supabaseAdmin` + `createUserClient`) |
| 10 | Testing setup | ⚠️ Partial | `tests/unit/auth.test.ts` rewritten to mock `@supabase/supabase-js` — **verified passing, 6/6**. `tests/integration/auth.integration.ts` rewritten for Supabase but **not run** — needs a live Supabase instance (local or hosted) with migrations applied. No tests yet for PatientService/ServiceService. |
| 11 | Deployment setup | ✅ Done | `Dockerfile` unchanged; `docker-compose.yml` simplified — no local Postgres/Redis containers, backend is stateless |
| 12 | Environment & secrets | ✅ Done | `.env(.example)` now use `SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY` |

### Live project connected

Project **hbixyyanxbfqyeksbcur** ("Kusum-s_Dental_website", region ap-southeast-1)
is linked and has all 4 migrations applied:
`20260828000001_initial_schema.sql`, `..._auth_trigger_and_helpers.sql`,
`..._rls_policies.sql`, `..._advisor_fixes.sql`.

### Verified in this environment (against the live project)
- `npm install` (post-migration) — succeeds, 71 packages removed (knex/pg/redis/bull/jwt/bcrypt), 10 added
- `npx tsc --noEmit` — compiles clean
- `supabase db push` — all 4 migrations applied to the hosted project successfully
- `supabase db advisors --linked --type security` — clean after fixes (only remaining finding, `rls_auto_enable`, is a pre-existing Supabase-platform function, not ours)
- `npm run dev` against real `SUPABASE_URL`/keys — server boots, `GET /health` returns 200, "Supabase connection established" logged
- `POST /api/v1/auth/register` against the live project — creates a real `auth.users` row + `profiles` row via the trigger, correctly returns `requiresEmailConfirmation: true` (project has email confirmation ON, which is what a HIPAA-conscious app should keep)
- `npm test` (unit, `SKIP_INTEGRATION=1`) — **7/7 passing**, mocking `@supabase/supabase-js` (no live project needed for these)
- Integration test (`auth.integration.ts`) exercised live end-to-end during debugging and confirmed working (register → profile+trigger created, `requiresEmailConfirmation` correct); **the checked-in suite run itself is currently blocked by Supabase's own signup email-rate-limit**, tripped by repeated manual `curl` debugging against the same project — this is Supabase protecting the project, not a bug. Wait for the rate limit window to reset (or raise it in Dashboard → Auth → Rate Limits for a test project) and rerun `npm test` with `SKIP_INTEGRATION` unset.
- Fixed `example.com` test email getting rejected by Supabase's deliverability check — integration test now uses a plus-addressed `@gmail.com` email
- Added `RateLimitError` (429) so a real rate-limit response from Supabase Auth surfaces correctly instead of a misleading 401

### What's NOT built / NOT verified yet
- [ ] Integration test suite itself hasn't completed a clean run yet (blocked by the rate limit above, not a code issue — see above)
- [ ] Docker build/compose never run (no Docker available in this environment)
- [ ] Coverage % not measured — 80% threshold unverified
- [ ] Rate limiting on our own API (explicitly deferred to Phase 2 per spec) — separate from Supabase's built-in auth rate limit
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Seed data / fixtures for `services` table
- [ ] Unit tests for PatientService, ServiceService (only AuthService covered)
- [ ] GitHub repo push (local git only) — `gh` CLI installed, run `gh auth login` yourself (interactive) to fix the keychain issue and push
- [ ] **Rotate the Supabase personal access token** used to link/push during this session (dashboard → Account → Access Tokens) — it was pasted in chat

## Phase 2 — Appointment system + real-time
Not started. With Supabase, real-time slot updates can use **Supabase
Realtime** (Postgres logical replication) instead of Socket.io + Redis
Pub/Sub — worth reconsidering the Socket.io dependency when this phase
starts. Will need: AppointmentService, appointment_slots availability logic,
reminder jobs (Supabase Cron / pg_cron, or a queue if still needed).

## Phase 3 — Payments + reviews + analytics
Not started. Will need: Stripe/Razorpay integration, PaymentService,
ReviewService, analytics endpoints.

## Phase 4 — Security hardening + HIPAA compliance
Not started. Rate limiting, field-level encryption for medical_history/
allergies, session/token hardening review. RLS (the main HIPAA access-control
mechanism) is already in place from this migration — run `supabase db
advisors` once a project is linked to catch any RLS/security gaps.

## Phase 5 — DevOps + Kubernetes
Not started. K8s manifests, production CI/CD, secrets management.

## Immediate next steps
1. Rotate the Supabase access token pasted during this session (dashboard → Account → Access Tokens → revoke `sbp_REDACTED_ACCESS_TOKEN...`)
2. Wait for Supabase's signup email rate limit to reset, then `npm run test` with `SKIP_INTEGRATION` unset to get a clean integration run
3. Run `gh auth login` to fix git push (keychain password issue), then push this branch/repo
4. Add PatientService/ServiceService unit tests, measure coverage against the 80% threshold
5. Decide on Phase 2's real-time approach — Supabase Realtime (Postgres CDC) vs. the existing Socket.io scaffold
