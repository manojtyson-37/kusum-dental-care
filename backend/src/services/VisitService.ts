import { NotFoundError } from '../utils/errors.js';
import { supabaseAdmin } from '../lib/supabase.js';

export interface LogVisitInput {
  patientId: string;
  loggedBy: string;
  treatment: string;
  clinicalNotes?: string;
  prescription?: string;
  followUpDate?: string;
  amountCharged?: number;
  visitDate?: string;
}

/**
 * visit_logs has no client-facing RLS policies (admin-only surface, same
 * pattern as audit_logs/notification_queue) — always goes through
 * supabaseAdmin, gated by the STAFF/DENTIST/ADMIN authorize() at the route.
 */
export class VisitService {
  async logVisit(input: LogVisitInput) {
    const { data, error } = await supabaseAdmin
      .from('visit_logs')
      .insert({
        patient_id: input.patientId,
        logged_by: input.loggedBy,
        treatment: input.treatment,
        clinical_notes: input.clinicalNotes ?? null,
        prescription: input.prescription ?? null,
        follow_up_date: input.followUpDate ?? null,
        amount_charged: input.amountCharged ?? null,
        visit_date: input.visitDate ?? new Date().toISOString().slice(0, 10),
      })
      .select('*')
      .single();

    if (error || !data) throw new NotFoundError(error?.message ?? 'Could not log visit');

    await supabaseAdmin
      .from('patients')
      .update({ last_visit_date: data.visit_date })
      .eq('id', input.patientId);

    return data;
  }

  async listForPatient(patientId: string) {
    const { data, error } = await supabaseAdmin
      .from('visit_logs')
      .select('*')
      .eq('patient_id', patientId)
      .order('visit_date', { ascending: false });

    if (error) throw new NotFoundError(error.message);
    return data ?? [];
  }

  /** Patients matching name/phone with an autocomplete-sized result set. */
  async searchPatientsByPhoneOrName(query: string) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, phone, email')
      .eq('role', 'PATIENT')
      .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(10);

    if (error) throw new NotFoundError(error.message);
    return data ?? [];
  }
}
