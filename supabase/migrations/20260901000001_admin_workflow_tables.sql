-- Admin workflow: booking inquiries (lead capture), fast visit logger/EHR,
-- patient medical alerts, file attachments, and invoices.

-- ---------------------------------------------------------------------------
-- contact_inquiries: extend for booking-inquiry lead capture + new status set
-- ---------------------------------------------------------------------------
alter table public.contact_inquiries
  add column if not exists service_interest text,
  add column if not exists preferred_date date,
  add column if not exists preferred_time text;

-- The original contact-form flow always sent email+message; the new
-- booking-inquiry flow (name/phone/service/preferred date-time) doesn't
-- collect either, so both become optional and the app fills in a
-- default subject/message for the new flow.
alter table public.contact_inquiries alter column email drop not null;
alter table public.contact_inquiries alter column message drop not null;

create type public.inquiry_status_v2 as enum ('PENDING', 'CONTACTED', 'CONFIRMED', 'ARCHIVED');

alter table public.contact_inquiries
  alter column status drop default;

alter table public.contact_inquiries
  alter column status type public.inquiry_status_v2
  using (
    case status::text
      when 'NEW' then 'PENDING'
      when 'RESPONDED' then 'CONTACTED'
      when 'CLOSED' then 'ARCHIVED'
      else 'PENDING'
    end
  )::public.inquiry_status_v2;

alter table public.contact_inquiries
  alter column status set default 'PENDING';

drop type public.inquiry_status;
alter type public.inquiry_status_v2 rename to inquiry_status;

create index if not exists contact_inquiries_status_idx on public.contact_inquiries (status);

-- ---------------------------------------------------------------------------
-- patients: quick medical-alert flags surfaced on every record lookup
-- ---------------------------------------------------------------------------
alter table public.patients
  add column if not exists is_diabetic boolean not null default false,
  add column if not exists is_hypertensive boolean not null default false,
  add column if not exists has_bleeding_risk boolean not null default false,
  add column if not exists has_penicillin_allergy boolean not null default false;

-- ---------------------------------------------------------------------------
-- visit_logs: 30-second walk-in / completed-treatment EHR entry
-- ---------------------------------------------------------------------------
create table public.visit_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id),
  logged_by uuid not null references public.profiles(id),
  treatment text not null,
  clinical_notes text,
  prescription text,
  follow_up_date date,
  amount_charged numeric(10, 2),
  visit_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index visit_logs_patient_idx on public.visit_logs (patient_id, visit_date desc);

alter table public.visit_logs enable row level security;
-- Admin-only surface (STAFF/DENTIST/ADMIN via service_role through the backend) —
-- no direct client policies, same pattern as audit_logs/notification_queue.

-- ---------------------------------------------------------------------------
-- patient_files: x-rays and other attachments (metadata; blobs in Storage)
-- ---------------------------------------------------------------------------
create table public.patient_files (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id),
  uploaded_by uuid not null references public.profiles(id),
  file_name text not null,
  storage_path text not null,
  file_type text,
  size_bytes integer,
  created_at timestamptz not null default now()
);

create index patient_files_patient_idx on public.patient_files (patient_id);

alter table public.patient_files enable row level security;

-- ---------------------------------------------------------------------------
-- invoices: 1-click receipt/invoice generation
-- ---------------------------------------------------------------------------
create type public.invoice_status as enum ('UNPAID', 'PAID');

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id),
  visit_id uuid references public.visit_logs(id),
  created_by uuid not null references public.profiles(id),
  items jsonb not null,
  amount numeric(10, 2) not null,
  status public.invoice_status not null default 'UNPAID',
  storage_path text,
  created_at timestamptz not null default now()
);

create index invoices_patient_idx on public.invoices (patient_id);

alter table public.invoices enable row level security;

-- ---------------------------------------------------------------------------
-- Storage bucket for x-rays/files and generated invoice PDFs — private,
-- accessed only via signed URLs issued by the backend (service_role).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('patient-files', 'patient-files', false)
on conflict (id) do nothing;
