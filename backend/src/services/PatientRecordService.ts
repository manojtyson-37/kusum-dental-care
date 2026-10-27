import { NotFoundError } from '../utils/errors.js';
import { supabaseAdmin } from '../lib/supabase.js';

/**
 * Assembles the full instant-lookup patient record: profile + medical
 * alerts, visit history, attached files, and outstanding balance. Reads
 * span tables with no client RLS policies (visit_logs, patient_files,
 * invoices) alongside ones that do (profiles, patients, payments) — uses
 * supabaseAdmin throughout for one consistent, fully-populated view,
 * gated by the STAFF/DENTIST/ADMIN authorize() at the route level.
 */
export class PatientRecordService {
  async search(query: string) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select(
        'id, full_name, phone, email, patients(last_visit_date, is_diabetic, is_hypertensive, has_bleeding_risk, has_penicillin_allergy)',
      )
      .eq('role', 'PATIENT')
      .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(15);

    if (error) throw new NotFoundError(error.message);
    return data ?? [];
  }

  async getFullRecord(patientId: string) {
    const [{ data: profile, error: profileError }, { data: visits }, { data: files }, { data: invoices }, { data: payments }] =
      await Promise.all([
        supabaseAdmin
          .from('profiles')
          .select(
            'id, full_name, email, phone, date_of_birth, gender, allergies, medical_history, patients(address, city, last_visit_date, is_diabetic, is_hypertensive, has_bleeding_risk, has_penicillin_allergy)',
          )
          .eq('id', patientId)
          .eq('role', 'PATIENT')
          .single(),
        supabaseAdmin
          .from('visit_logs')
          .select('*')
          .eq('patient_id', patientId)
          .order('visit_date', { ascending: false }),
        supabaseAdmin
          .from('patient_files')
          .select('id, file_name, storage_path, file_type, size_bytes, created_at')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false }),
        supabaseAdmin
          .from('invoices')
          .select('id, amount, status, items, storage_path, created_at')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false }),
        supabaseAdmin
          .from('payments')
          .select('id, amount, status, payment_date')
          .eq('patient_id', patientId)
          .eq('status', 'PENDING'),
      ]);

    if (profileError || !profile) throw new NotFoundError('Patient not found');

    const filesWithUrls = await Promise.all(
      (files ?? []).map(async (f) => {
        const { data: signed } = await supabaseAdmin.storage
          .from('patient-files')
          .createSignedUrl(f.storage_path, 3600);
        return { ...f, url: signed?.signedUrl ?? null };
      }),
    );

    const unpaidInvoiceTotal = (invoices ?? [])
      .filter((inv) => inv.status === 'UNPAID')
      .reduce((sum, inv) => sum + Number(inv.amount), 0);
    const pendingPaymentTotal = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      ...profile,
      visits: visits ?? [],
      files: filesWithUrls,
      invoices: invoices ?? [],
      outstandingBalance: unpaidInvoiceTotal + pendingPaymentTotal,
    };
  }
}
