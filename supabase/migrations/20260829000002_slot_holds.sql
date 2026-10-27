-- Ephemeral "someone else has this slot open right now" holds for the
-- patient-facing booking picker. A hold expires on its own (checked against
-- now() wherever it's read) — no cron/cleanup job needed.
--
-- Only ever read/written by the backend's BookingService via the
-- service_role client — never directly from the browser — so this table
-- has RLS enabled with zero client policies, same pattern as audit_logs/
-- notification_queue/otps.
create table public.slot_holds (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start_time time not null,
  end_time time not null,
  session_token text not null,
  held_until timestamptz not null,
  created_at timestamptz not null default now()
);

create index slot_holds_date_idx on public.slot_holds (date);

alter table public.slot_holds enable row level security;
