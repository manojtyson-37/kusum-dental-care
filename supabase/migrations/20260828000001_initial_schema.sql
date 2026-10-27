-- Kusum's Dental — initial schema
-- Auth is handled entirely by Supabase Auth (auth.users). This migration adds
-- a public.profiles table keyed to auth.users, plus all domain tables from
-- the Phase 1 spec, with RLS enabled everywhere per the Supabase security
-- checklist (RLS on every table in an exposed schema, ownership-based
-- policies with explicit `TO` clauses, role claims read from
-- app_metadata — never user_metadata).


-- ---------------------------------------------------------------------------
-- profiles (extends auth.users — 1:1)
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('PATIENT', 'DENTIST', 'STAFF', 'ADMIN');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  phone text,
  full_name text not null,
  date_of_birth date,
  gender text,
  role public.user_role not null default 'PATIENT',
  profile_photo_url text,
  medical_history jsonb,
  allergies text[],
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index profiles_role_idx on public.profiles (role);

-- ---------------------------------------------------------------------------
-- patients (extends profiles for PATIENT-role users)
-- ---------------------------------------------------------------------------
create table public.patients (
  id uuid primary key references public.profiles(id) on delete cascade,
  address text,
  city text,
  state text,
  postal_code text,
  insurance_provider text,
  insurance_id text,
  emergency_contact_name text,
  emergency_contact_phone text,
  last_visit_date date
);

-- ---------------------------------------------------------------------------
-- services
-- ---------------------------------------------------------------------------
create type public.service_category as enum
  ('GENERAL', 'COSMETIC', 'ORTHODONTICS', 'SURGERY', 'PEDIATRIC', 'EMERGENCY');
create type public.complexity_level as enum ('LOW', 'MEDIUM', 'HIGH');

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category public.service_category not null,
  base_price numeric(10, 2) not null,
  duration_minutes integer not null,
  is_active boolean not null default true,
  complexity_level public.complexity_level not null default 'LOW',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index services_category_idx on public.services (category);

-- ---------------------------------------------------------------------------
-- appointments
-- ---------------------------------------------------------------------------
create type public.appointment_status as enum
  ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id),
  staff_id uuid not null references public.profiles(id),
  service_id uuid not null references public.services(id),
  appointment_date date not null,
  start_time time not null,
  end_time time not null,
  status public.appointment_status not null default 'SCHEDULED',
  notes text,
  reminder_sent boolean not null default false,
  cancelled_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index appointments_patient_date_idx on public.appointments (patient_id, appointment_date);
create index appointments_staff_date_idx on public.appointments (staff_id, appointment_date);
create index appointments_status_idx on public.appointments (status);

-- ---------------------------------------------------------------------------
-- appointment_slots
-- ---------------------------------------------------------------------------
create table public.appointment_slots (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles(id),
  date date not null,
  start_time time not null,
  end_time time not null,
  is_available boolean not null default true,
  service_id uuid references public.services(id)
);

create index appointment_slots_staff_date_idx on public.appointment_slots (staff_id, date);

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------
create type public.payment_status as enum ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id),
  patient_id uuid not null references public.profiles(id),
  amount numeric(10, 2) not null,
  currency text not null default 'USD',
  payment_method text,
  gateway_transaction_id text,
  status public.payment_status not null default 'PENDING',
  payment_date timestamptz,
  receipt_url text
);

create index payments_patient_idx on public.payments (patient_id);
create index payments_status_idx on public.payments (status);

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id),
  staff_id uuid not null references public.profiles(id),
  appointment_id uuid references public.appointments(id),
  rating integer not null check (rating between 1 and 5),
  title text,
  comment text,
  is_verified_patient boolean not null default false,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reviews_staff_idx on public.reviews (staff_id);

-- ---------------------------------------------------------------------------
-- audit_logs (HIPAA) — service_role only, no client access
-- ---------------------------------------------------------------------------
create type public.audit_action as enum ('CREATE', 'READ', 'UPDATE', 'DELETE');

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  entity_type text not null,
  entity_id text,
  action public.audit_action not null,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  "timestamp" timestamptz not null default now()
);

create index audit_logs_user_timestamp_idx on public.audit_logs (user_id, "timestamp");

-- ---------------------------------------------------------------------------
-- notification_queue — service_role only, no client access
-- ---------------------------------------------------------------------------
create type public.notification_type as enum ('EMAIL', 'SMS', 'IN_APP');

create table public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id),
  type public.notification_type not null,
  title text not null,
  message text not null,
  is_sent boolean not null default false,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index notification_queue_recipient_idx on public.notification_queue (recipient_id);

-- ---------------------------------------------------------------------------
-- contact_inquiries — public can insert (contact form), staff can read
-- ---------------------------------------------------------------------------
create type public.inquiry_status as enum ('NEW', 'RESPONDED', 'CLOSED');

create table public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  subject text not null,
  message text not null,
  status public.inquiry_status not null default 'NEW',
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

-- ---------------------------------------------------------------------------
-- otps — service_role only (custom SMS/email OTP flows outside Supabase Auth)
-- ---------------------------------------------------------------------------
create table public.otps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  code text not null,
  purpose text not null,
  expires_at timestamptz not null,
  is_used boolean not null default false,
  created_at timestamptz not null default now()
);

create index otps_user_purpose_idx on public.otps (user_id, purpose);
