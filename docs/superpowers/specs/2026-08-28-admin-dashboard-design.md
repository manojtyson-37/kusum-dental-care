# Admin Dashboard — Design Spec

Date: 2026-08-28

## Purpose

Doctor (and staff) need a working tool to log in and track the full patient
lifecycle: walk-in registration, appointment booking, visit history,
payments, and revenue — separate from the public marketing site.

## Scope

Full CRUD, not read-only:
- Add patients (walk-ins, no self-registration required)
- Book / reschedule / update status of appointments
- Record and update payments, export a CSV ledger
- Dashboard home with today's appointments + quick stats

Out of scope for v1: notifications/reminders (queue table exists, not
wired), online patient self-booking, insurance claim workflows, multi-clinic
support.

## Architecture

- **New app**: `admin/` — separate Vite + React project, own `package.json`,
  own dev server/deploy, independent of the public `src/` marketing site.
  Reason: keeps clinic-ops tooling out of the public bundle and off the
  public domain.
- **Existing backend** (`backend/`) gets a new route group:
  `/api/v1/admin/*`, all behind `authenticate` (Supabase Auth) +
  `authorize(['DENTIST','STAFF','ADMIN'])`. `PATIENT` role gets 403.
- **No new database tables.** Existing schema already covers this:
  `profiles` (role, identity), `patients` (extended profile),
  `appointments`, `payments`, `services`. RLS policies already exist per
  `supabase/migrations/20260828000003_rls_policies.sql` — admin routes use
  a per-request client scoped to the caller's token so RLS is enforced even
  if an `authorize()` check is ever wrong (defense in depth, matching the
  existing pattern in `patients.ts`/`PatientService`).

## Backend — new routes

All under `authenticate` + `authorize(['DENTIST','STAFF','ADMIN'])`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/admin/dashboard` | Today's appointment count, this month's revenue, new patients this week, pending payments count |
| GET | `/api/v1/admin/patients` | Paginated list, search by name/phone/email |
| GET | `/api/v1/admin/patients/:id` | Full profile + visit history + payment history |
| POST | `/api/v1/admin/patients` | Create walk-in patient (creates `auth.users` + `profiles` + `patients` row) |
| GET | `/api/v1/admin/appointments?date=&status=` | List appointments (default today) |
| POST | `/api/v1/admin/appointments` | Book new appointment |
| PATCH | `/api/v1/admin/appointments/:id` | Update status (completed/cancelled/no-show) or reschedule |
| GET | `/api/v1/admin/payments?status=&fromDate=&toDate=` | Payment ledger |
| POST | `/api/v1/admin/payments` | Record a payment against an appointment |
| PATCH | `/api/v1/admin/payments/:id` | Update status (e.g. mark refunded) |
| GET | `/api/v1/admin/payments/export?fromDate=&toDate=&format=csv` | Stream CSV: date, patient, service, amount, status, method |

No hard-delete endpoints anywhere — only status transitions (cancelled,
no-show, refunded), consistent with medical-record retention norms.

New service files, following the existing `PatientService`/`ServiceService`
pattern (a class taking a `supabase-js` client per call):
- `backend/src/services/AdminService.ts` — dashboard aggregate, patient
  create/list
- `backend/src/services/AppointmentService.ts` — appointment CRUD (doesn't
  exist yet)
- `backend/src/services/PaymentService.ts` — payment CRUD + CSV export
  (doesn't exist yet)

New route file: `backend/src/api/routes/admin.ts`, registered in
`server.ts` alongside `auth`/`patients`/`services`.

## Frontend — `admin/` app pages

| Route | Purpose |
|---|---|
| `/login` | Email + password form, calls existing `POST /api/v1/auth/login` |
| `/` | Dashboard home: today's appointments + 4 stat tiles |
| `/patients` | Searchable table |
| `/patients/new` | Add walk-in patient form |
| `/patients/:id` | Detail: profile, visit history, payment history |
| `/appointments` | Day-list view: book, reschedule, change status |
| `/payments` | Ledger table: filter by date/status, record payment, export CSV |

Auth guard: no valid session, or role not in `['DENTIST','STAFF','ADMIN']`,
redirects to `/login`. Session (access + refresh token) held in memory +
`localStorage`, `Authorization: Bearer <token>` sent on every request,
401 response from any admin call triggers auto-redirect to `/login`.

## Error handling & data flow

Frontend form → Joi-validated backend route → service layer → supabase-js
client scoped to caller's token → RLS-enforced Postgres write. Failed
writes surface inline in the form, not silently swallowed. Empty lists
show an explicit empty state ("No appointments today"), never a blank
screen.

## Testing

- **Backend**: unit tests for `AdminService`/`AppointmentService`/
  `PaymentService` with a mocked `supabase-js` client, matching
  `backend/tests/unit/`. At least one integration test per route group
  under `backend/tests/integration/` (needs live/local Supabase, same
  pattern as existing `auth.integration.ts`).
- **Frontend**: no test runner exists in this repo yet; not adding one
  for this feature alone. Verify via a manual Playwright smoke pass:
  log in → book appointment → record payment → confirm it appears on
  dashboard stats and patient history.
