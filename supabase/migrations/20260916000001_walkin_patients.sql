-- Decouple patient records from Supabase auth accounts.
--
-- Public patient self-signup/login has been removed from the product.
-- Every patient record was still backed by a real auth.users row created
-- behind the scenes purely to satisfy this FK and a NOT NULL/unique email
-- — a login credential nobody would ever use. That forced every
-- doctor-entered walk-in patient to have a unique email on hand before a
-- record could be created at all.
--
-- Staff/dentist/admin accounts are untouched: they still sign in and still
-- go through auth.users normally. This only changes how PATIENT rows come
-- into existence.

-- Drop the FK to auth.users (name found dynamically — it was declared
-- inline, so it carries Postgres's auto-generated name, not a fixed one).
do $$
declare
  fk_name text;
begin
  select conname into fk_name
  from pg_constraint
  where conrelid = 'public.profiles'::regclass
    and confrelid = 'auth.users'::regclass
    and contype = 'f';

  if fk_name is not null then
    execute format('alter table public.profiles drop constraint %I', fk_name);
  end if;
end $$;

-- Walk-in patients created by staff now get a generated id instead of
-- reusing an auth.users id.
alter table public.profiles alter column id set default gen_random_uuid();

-- Doctor may not have a walk-in patient's email on hand at booking time.
alter table public.profiles alter column email drop not null;
