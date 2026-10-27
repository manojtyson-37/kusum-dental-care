import type { SupabaseClient } from '@supabase/supabase-js';
import { ConflictError, NotFoundError } from '../utils/errors.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { config } from '../utils/config.js';

export interface PatientListFilters {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreatePatientInput {
  email?: string;
  fullName: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  city?: string;
}

function startOfWeek(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = (day + 6) % 7; // Monday as start of week
  now.setUTCDate(now.getUTCDate() - diff);
  now.setUTCHours(0, 0, 0, 0);
  return now.toISOString();
}

function countDistinct(rows: Array<{ patient_id: string }> | null): number {
  return new Set((rows ?? []).map((r) => r.patient_id)).size;
}

function sumAmount(rows: Array<{ amount: number }> | null): number {
  return (rows ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
}

export class AdminService {
  async getDashboardStats(client: SupabaseClient) {
    const today = new Date().toISOString().slice(0, 10);

    const [
      { data: todayAppts },
      { data: upcomingAppts },
      { data: visitedRows },
      { data: inTreatmentRows },
      { data: completedPayments },
      { data: pendingPayments },
      { data: newPatients },
      { count: availableSlots },
    ] = await Promise.all([
      client.from('appointments').select('id').eq('appointment_date', today),
      client
        .from('appointments')
        .select('id')
        .eq('status', 'SCHEDULED')
        .gte('appointment_date', today),
      client.from('appointments').select('patient_id').eq('status', 'COMPLETED'),
      client.from('appointments').select('patient_id').in('status', ['SCHEDULED', 'IN_PROGRESS']),
      client.from('payments').select('amount').eq('status', 'COMPLETED'),
      client.from('payments').select('amount').eq('status', 'PENDING'),
      client.from('profiles').select('id').eq('role', 'PATIENT').gte('created_at', startOfWeek()),
      client
        .from('appointment_slots')
        .select('id', { count: 'exact', head: true })
        .eq('is_available', true)
        .gte('date', today),
    ]);

    return {
      appointmentsToday: (todayAppts ?? []).length,
      appointmentsUpcoming: (upcomingAppts ?? []).length,
      patientsVisited: countDistinct(visitedRows as Array<{ patient_id: string }> | null),
      patientsInTreatment: countDistinct(inTreatmentRows as Array<{ patient_id: string }> | null),
      paymentsCompletedCount: (completedPayments ?? []).length,
      paymentsCompletedAmount: sumAmount(completedPayments as Array<{ amount: number }> | null),
      paymentsPendingCount: (pendingPayments ?? []).length,
      paymentsPendingAmount: sumAmount(pendingPayments as Array<{ amount: number }> | null),
      newPatientsThisWeek: (newPatients ?? []).length,
      availableSlots: availableSlots ?? 0,
    };
  }

  async getAnalytics(client: SupabaseClient) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 5);
    sixMonthsAgo.setUTCDate(1);
    sixMonthsAgo.setUTCHours(0, 0, 0, 0);

    const [{ data: payments }, { data: appointments }] = await Promise.all([
      client
        .from('payments')
        .select('amount, payment_date')
        .eq('status', 'COMPLETED')
        .gte('payment_date', sixMonthsAgo.toISOString()),
      client
        .from('appointments')
        .select('status, service:services(name)')
        .in('status', ['COMPLETED', 'NO_SHOW', 'CANCELLED']),
    ]);

    // Revenue by month — always includes the trailing 6 months, zero-filled.
    const monthBuckets: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(sixMonthsAgo);
      d.setUTCMonth(d.getUTCMonth() + (5 - i));
      monthBuckets.push({ month: d.toISOString().slice(0, 7), revenue: 0 });
    }
    for (const row of payments ?? []) {
      const month = String(row.payment_date).slice(0, 7);
      const bucket = monthBuckets.find((b) => b.month === month);
      if (bucket) bucket.revenue += Number(row.amount);
    }

    // Treatment-type breakdown — count of resolved appointments per service.
    const treatmentCounts = new Map<string, number>();
    for (const row of appointments ?? []) {
      const name = (row as unknown as { service?: { name?: string } }).service?.name ?? 'Unknown';
      treatmentCounts.set(name, (treatmentCounts.get(name) ?? 0) + 1);
    }
    const treatmentBreakdown = [...treatmentCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // No-show rate — of resolved appointments (excludes still-scheduled ones).
    const resolvedTotal = (appointments ?? []).length;
    const noShowCount = (appointments ?? []).filter((a) => a.status === 'NO_SHOW').length;
    const noShowRate = resolvedTotal > 0 ? noShowCount / resolvedTotal : 0;

    return { revenueByMonth: monthBuckets, treatmentBreakdown, noShowRate, noShowCount, resolvedTotal };
  }

  async getPatient(client: SupabaseClient, id: string) {
    const { data: profile, error } = await client
      .from('profiles')
      .select(
        'id, full_name, email, phone, date_of_birth, gender, created_at, patients(address, city, state, postal_code, insurance_provider, insurance_id, emergency_contact_name, emergency_contact_phone, last_visit_date)',
      )
      .eq('id', id)
      .eq('role', 'PATIENT')
      .single();

    if (error || !profile) throw new NotFoundError('Patient not found');

    const { data: appointments } = await client
      .from('appointments')
      .select('id, appointment_date, start_time, status, service:services(name)')
      .eq('patient_id', id)
      .order('appointment_date', { ascending: false });

    return { ...profile, appointments: appointments ?? [] };
  }

  // Solo-doctor clinic — the staff picker should only ever show Dr. Kusum.
  // Filtering by role alone would also surface any stray ADMIN/STAFF/
  // DENTIST-role row (e.g. an old test fixture), so pin to her account id.
  async listStaff(client: SupabaseClient) {
    const { data, error } = await client
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', config.doctorUserId)
      .in('role', ['DENTIST', 'STAFF', 'ADMIN']);

    if (error) throw new NotFoundError(error.message);
    return data ?? [];
  }

  async listPatients(client: SupabaseClient, filters: PatientListFilters = {}) {
    const { search, page = 1, pageSize = 20 } = filters;

    let query = client
      .from('profiles')
      .select('id, full_name, email, phone, created_at, patients(last_visit_date)', { count: 'exact' })
      .eq('role', 'PATIENT')
      .order('full_name', { ascending: true })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) throw new NotFoundError(error.message);

    return { items: data ?? [], total: count ?? 0, page, pageSize };
  }

  /**
   * Patients created here are walk-ins entered by staff — there is no
   * patient login anywhere in the product, so this does not create an
   * auth.users row at all (profiles.id no longer requires one; see the
   * walkin_patients migration). Uses supabaseAdmin because profiles has no
   * staff-insert RLS policy yet (only self-update) — this is the one
   * documented exception to "always use the caller's RLS-scoped client",
   * justified because it only ever touches the row this same call just
   * created.
   */
  async createPatient(client: SupabaseClient, data: CreatePatientInput) {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .insert({
        email: data.email || null,
        full_name: data.fullName,
        phone: data.phone,
        date_of_birth: data.dateOfBirth,
        gender: data.gender,
        role: 'PATIENT',
      })
      .select('id, full_name, email, phone')
      .single();

    if (error || !profile) {
      throw new ConflictError(error?.message ?? 'Could not create patient record');
    }

    const { error: patientError } = await client
      .from('patients')
      .upsert({ id: profile.id, address: data.address, city: data.city });

    if (patientError) throw new NotFoundError(patientError.message);

    return profile;
  }
}
