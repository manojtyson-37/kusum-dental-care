# Kusum's Dental Backend

Production-ready, HIPAA-conscious backend for the dental clinic management system.
Phase 1 (foundation): auth, patient profile, service listing, audit logging.

## Stack

Node.js 20 · Fastify · TypeScript (strict) · **Supabase** (Postgres + Auth +
RLS) · @supabase/supabase-js · Socket.io · Winston · Jest/Supertest · Docker

Auth, password hashing, JWTs, and session/refresh-token handling are all
Supabase Auth — there is no custom AuthService crypto or token store.
Authorization is enforced by Postgres Row Level Security policies (see
`../supabase/migrations/`), not by application code.

## Setup

```bash
cp .env.example .env   # fill in SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
npm install

# Option A: local Supabase stack (needs Docker)
supabase start          # from repo root, applies supabase/migrations automatically
supabase status          # copy the API URL / anon key / service_role key into .env

# Option B: hosted Supabase project
supabase link --project-ref <your-project-ref>
supabase db push          # applies supabase/migrations to the hosted project

npm run dev
```

Server: `http://localhost:3000` · WebSocket: `ws://localhost:3001` ·
API docs: `http://localhost:3000/api/docs` · Health check: `GET /health`

## Testing

```bash
npm run test            # unit tests (mocked supabase-js client, no live project needed)
npm run test:coverage   # coverage report, 80% threshold enforced
```

Integration tests need a running Supabase instance (local `supabase start` or
a real project) with `supabase/migrations` applied. Set `SKIP_INTEGRATION=1`
to skip them (e.g. CI without a Supabase instance).

## Docker

```bash
docker compose up
curl http://localhost:3000/health
```

Requires `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
in the shell environment or an `.env` file compose picks up — the backend
container itself is stateless, all data lives in Supabase.

## Project layout

```
src/
  api/routes/       # Fastify route handlers (thin, delegate to services)
  services/          # business logic — takes a supabase-js client per call
  middleware/         # auth (supabase.auth.getUser), validation, error handling, logging, audit
  lib/                  # supabase.ts — admin (service_role) + per-request (RLS-scoped) clients
  websocket/           # socket.io setup (Phase 2)
  queues/               # background job queues (Phase 2)
  utils/                 # config, logger, errors, swagger
tests/
  unit/                   # service-level tests with a mocked supabase-js client
  integration/             # full HTTP flow tests via supertest, needs live Supabase
```

Schema, RLS policies, and the `auth.users` → `profiles` trigger live in
`../supabase/migrations/` at the repo root (shared by any client, not just
this backend).

See `../IDE_Prompt_for_Backend_Development.md` for the full spec and
`PROGRESS.md` for what's built vs. pending across all phases.
