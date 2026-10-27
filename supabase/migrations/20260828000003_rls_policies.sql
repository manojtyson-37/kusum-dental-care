-- Row Level Security — enabled on every table, policies matched to the
-- actual access model. Role checks read from auth.jwt() app_metadata (set by
-- the trigger/set_user_role in the previous migration), never user_metadata.

-- Helper: is the caller staff (DENTIST/STAFF/ADMIN)?
create or replace function public.is_staff()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('DENTIST', 'STAFF', 'ADMIN');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'ADMIN';
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_select_own_or_staff" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id or public.is_staff());

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- inserts happen only via the handle_new_user trigger (security definer),
-- never directly by clients — no insert policy needed for anon/authenticated.

-- ---------------------------------------------------------------------------
-- patients
-- ---------------------------------------------------------------------------
alter table public.patients enable row level security;

create policy "patients_select_own_or_staff" on public.patients
  for select to authenticated
  using ((select auth.uid()) = id or public.is_staff());

create policy "patients_update_own_or_staff" on public.patients
  for update to authenticated
  using ((select auth.uid()) = id or public.is_staff())
  with check ((select auth.uid()) = id or public.is_staff());

create policy "patients_insert_own_or_staff" on public.patients
  for insert to authenticated
  with check ((select auth.uid()) = id or public.is_staff());

-- ---------------------------------------------------------------------------
-- services — public catalog, staff-managed
-- ---------------------------------------------------------------------------
alter table public.services enable row level security;

create policy "services_select_active_public" on public.services
  for select to anon, authenticated
  using (is_active = true or public.is_staff());

create policy "services_write_staff" on public.services
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- appointments
-- ---------------------------------------------------------------------------
alter table public.appointments enable row level security;

create policy "appointments_select_own_or_staff" on public.appointments
  for select to authenticated
  using (
    (select auth.uid()) = patient_id
    or (select auth.uid()) = staff_id
    or public.is_staff()
  );

create policy "appointments_insert_own_or_staff" on public.appointments
  for insert to authenticated
  with check ((select auth.uid()) = patient_id or public.is_staff());

create policy "appointments_update_own_or_staff" on public.appointments
  for update to authenticated
  using (
    (select auth.uid()) = patient_id
    or (select auth.uid()) = staff_id
    or public.is_staff()
  )
  with check (
    (select auth.uid()) = patient_id
    or (select auth.uid()) = staff_id
    or public.is_staff()
  );

-- ---------------------------------------------------------------------------
-- appointment_slots — public read (availability), staff-managed writes
-- ---------------------------------------------------------------------------
alter table public.appointment_slots enable row level security;

create policy "slots_select_public" on public.appointment_slots
  for select to anon, authenticated
  using (true);

create policy "slots_write_staff" on public.appointment_slots
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------
alter table public.payments enable row level security;

create policy "payments_select_own_or_staff" on public.payments
  for select to authenticated
  using ((select auth.uid()) = patient_id or public.is_staff());

create policy "payments_write_staff" on public.payments
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- reviews — approved reviews are public; patients manage their own
-- ---------------------------------------------------------------------------
alter table public.reviews enable row level security;

create policy "reviews_select_approved_or_own_or_staff" on public.reviews
  for select to anon, authenticated
  using (
    is_approved = true
    or (select auth.uid()) = patient_id
    or public.is_staff()
  );

create policy "reviews_insert_own" on public.reviews
  for insert to authenticated
  with check ((select auth.uid()) = patient_id);

create policy "reviews_update_own_or_staff" on public.reviews
  for update to authenticated
  using ((select auth.uid()) = patient_id or public.is_staff())
  with check ((select auth.uid()) = patient_id or public.is_staff());

-- ---------------------------------------------------------------------------
-- audit_logs — no client policies at all (service_role bypasses RLS)
-- ---------------------------------------------------------------------------
alter table public.audit_logs enable row level security;

-- ---------------------------------------------------------------------------
-- notification_queue — no client policies (service_role only)
-- ---------------------------------------------------------------------------
alter table public.notification_queue enable row level security;

-- ---------------------------------------------------------------------------
-- contact_inquiries — anyone can submit; only staff can read/manage
-- ---------------------------------------------------------------------------
alter table public.contact_inquiries enable row level security;

create policy "contact_inquiries_insert_public" on public.contact_inquiries
  for insert to anon, authenticated
  with check (true);

create policy "contact_inquiries_select_staff" on public.contact_inquiries
  for select to authenticated
  using (public.is_staff());

create policy "contact_inquiries_update_staff" on public.contact_inquiries
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- otps — no client policies (service_role only)
-- ---------------------------------------------------------------------------
alter table public.otps enable row level security;
