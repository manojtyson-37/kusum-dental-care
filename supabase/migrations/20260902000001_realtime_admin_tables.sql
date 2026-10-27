-- Real-time admin dashboard: staff need direct SELECT RLS on visit_logs and
-- invoices (previously service_role-only, admin-only-via-backend) so the
-- browser's Supabase Realtime subscription — authenticated as that staff
-- member's own session — can receive postgres_changes events. Writes still
-- go exclusively through the backend (supabaseAdmin, for signed URLs and
-- PDF generation), so no INSERT/UPDATE/DELETE policy is added here.

create policy "visit_logs_select_staff" on public.visit_logs
  for select to authenticated
  using (public.is_staff());

create policy "invoices_select_staff" on public.invoices
  for select to authenticated
  using (public.is_staff());

-- Enable Realtime replication for everything the admin dashboard now
-- listens to live.
alter publication supabase_realtime add table public.appointments;
alter publication supabase_realtime add table public.payments;
alter publication supabase_realtime add table public.visit_logs;
alter publication supabase_realtime add table public.invoices;
alter publication supabase_realtime add table public.contact_inquiries;
