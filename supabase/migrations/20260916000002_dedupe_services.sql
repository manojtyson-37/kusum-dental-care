-- The seed migration's "on conflict do nothing" was a no-op — services had
-- no unique constraint to conflict against — so re-running the seed (or
-- applying it twice) inserted a second copy of all 7 services.
--
-- Keep the oldest row per name, delete the rest, then add the unique
-- constraint that should have existed from the start so this can't recur.

delete from public.services a
using public.services b
where a.name = b.name
  and (a.created_at, a.id) > (b.created_at, b.id);

alter table public.services add constraint services_name_key unique (name);
