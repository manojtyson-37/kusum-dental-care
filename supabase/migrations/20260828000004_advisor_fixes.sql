-- Fixes for supabase db advisors findings after initial push:
-- 1. set_updated_at had a mutable search_path (WARN).
-- 2. handle_new_user was callable directly by anon/authenticated via
--    PostgREST RPC (/rest/v1/rpc/handle_new_user) since every new function
--    grants EXECUTE to PUBLIC by default. It must only ever run as the
--    auth.users insert trigger, never as a public endpoint — revoke.
--    (Trigger firing does not require EXECUTE privilege, so this does not
--    break signup.)

alter function public.set_updated_at() set search_path = '';

revoke execute on function public.handle_new_user() from public, anon, authenticated;
