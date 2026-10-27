import type { SupabaseClient } from '@supabase/supabase-js';
import { NotFoundError } from '../utils/errors.js';

export interface PaymentListFilters {
  status?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export interface CreatePaymentInput {
  appointmentId: string;
  patientId: string;
  amount: number;
  currency?: string;
  paymentMethod?: string;
  status?: string;
  paymentDate?: string;
}

export interface UpdatePaymentInput {
  status?: string;
  paymentDate?: string;
  receiptUrl?: string;
}

const PAYMENT_SELECT = `id, amount, currency, payment_method, status, payment_date, receipt_url,
  patient:profiles!payments_patient_id_fkey(id, full_name),
  appointment:appointments(id, appointment_date, service:services(name))`;

function toCsvField(value: unknown): string {
  const str = String(value ?? '');
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/** All methods take the caller's RLS-scoped client — payments RLS restricts
 * writes to is_staff() (see supabase/migrations/..._rls_policies.sql). */
export class PaymentService {
  async list(client: SupabaseClient, filters: PaymentListFilters = {}) {
    const { status, fromDate, toDate, page = 1, pageSize = 50 } = filters;

    let query = client
      .from('payments')
      .select(PAYMENT_SELECT)
      .order('payment_date', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (status) query = query.eq('status', status);
    if (fromDate) query = query.gte('payment_date', fromDate);
    if (toDate) query = query.lte('payment_date', toDate);

    const { data, error } = await query;
    if (error) throw new NotFoundError(error.message);

    return data;
  }

  async create(client: SupabaseClient, data: CreatePaymentInput) {
    const { data: row, error } = await client
      .from('payments')
      .insert({
        appointment_id: data.appointmentId,
        patient_id: data.patientId,
        amount: data.amount,
        currency: data.currency ?? 'INR',
        payment_method: data.paymentMethod,
        status: data.status ?? 'COMPLETED',
        payment_date: data.paymentDate ?? new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !row) throw new NotFoundError(error?.message ?? 'Failed to create payment');

    return row;
  }

  async updateStatus(client: SupabaseClient, id: string, data: UpdatePaymentInput) {
    const update: Record<string, unknown> = {};
    if (data.status) update.status = data.status;
    if (data.paymentDate) update.payment_date = data.paymentDate;
    if (data.receiptUrl) update.receipt_url = data.receiptUrl;

    const { data: row, error } = await client
      .from('payments')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error || !row) throw new NotFoundError('Payment not found');

    return row;
  }

  async exportCsv(client: SupabaseClient, filters: { fromDate?: string; toDate?: string }) {
    let query = client.from('payments').select(PAYMENT_SELECT).order('payment_date', { ascending: false });
    if (filters.fromDate) query = query.gte('payment_date', filters.fromDate);
    if (filters.toDate) query = query.lte('payment_date', filters.toDate);

    const { data, error } = await query;
    if (error) throw new NotFoundError(error.message);

    const rows = (data ?? []) as unknown as Array<{
      payment_date: string | null;
      amount: number;
      status: string;
      payment_method: string | null;
      patient: { full_name: string } | null;
      appointment: { service: { name: string } | null } | null;
    }>;

    const header = 'date,patient,service,amount,status,method';
    const lines = rows.map((row) =>
      [
        row.payment_date ?? '',
        row.patient?.full_name ?? '',
        row.appointment?.service?.name ?? '',
        row.amount,
        row.status,
        row.payment_method ?? '',
      ]
        .map(toCsvField)
        .join(','),
    );

    return [header, ...lines].join('\n');
  }
}
