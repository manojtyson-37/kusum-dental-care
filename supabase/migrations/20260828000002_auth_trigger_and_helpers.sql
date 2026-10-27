-- Auto-create a profile row when a new auth.users row is created, and seed
-- the role into raw_app_meta_data so RLS policies can read it from the JWT
-- (app_metadata is not user-editable, unlike user_metadata — see security
-- checklist). Only 'PATIENT' self-signup is allowed here; STAFF/DENTIST/ADMIN
-- roles must be granted afterwards by an admin via the service_role key.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role public.user_role;
begin
  -- Ignore any role the client tried to self-assign in user_metadata; only
  -- PATIENT is allowed at signup time.
  requested_role := 'PATIENT';

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    requested_role
  );

  update auth.users
  set raw_app_meta_data = raw_app_meta_data || jsonb_build_object('role', requested_role)
  where id = new.id;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin-only role change: updates both profiles.role and the JWT claim.
-- Callable only via service_role (used from a trusted backend context), so
-- it stays outside the RLS-governed API surface even though it lives in
-- public and is SECURITY DEFINER.
create or replace function public.set_user_role(target_user_id uuid, new_role public.user_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set role = new_role, updated_at = now() where id = target_user_id;

  update auth.users
  set raw_app_meta_data = raw_app_meta_data || jsonb_build_object('role', new_role)
  where id = target_user_id;
end;
$$;

revoke execute on function public.set_user_role(uuid, public.user_role) from public, anon, authenticated;

-- Shared updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_services_updated_at before update on public.services
  for each row execute function public.set_updated_at();
create trigger set_appointments_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();
create trigger set_reviews_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();
