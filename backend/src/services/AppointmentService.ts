import type { SupabaseClient } from '@supabase/supabase-js';
import { NotFoundError } from '../utils/errors.js';

export interface AppointmentListFilters {
  date?: string;
  status?: string;
}

export interface CreateAppointmentInput {
  patientId: string;
  staffId: string;
  serviceId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

export interface UpdateAppointmentInput {
  status?: string;
  cancelledReason?: string;
  appointmentDate?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
  staffId?: string;
  serviceId?: string;
}

/**
 * All methods take the caller's RLS-scoped client — appointments RLS
 * already allows patient-self or is_staff() reads/writes, so no app-level
 * role re-check is needed here (see supabase/migrations/..._rls_policies.sql).
 */
export class AppointmentService {
  async listByDate(client: SupabaseClient, filters: AppointmentListFilters = {}) {
    const date = filters.date ?? new Date().toISOString().slice(0, 10);

    let query = client
      .from('appointments')
      .select(
        `id, appointment_date, start_time, end_time, status, notes, cancelled_reason,
         patient:profiles!appointments_patient_id_fkey(id, full_name, phone),
         staff:profiles!appointments_staff_id_fkey(id, full_name),
         service:services(id, name, base_price, duration_minutes)`,
      )
      .eq('appointment_date', date)
      .order('start_time', { ascending: true });

    if (filters.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw new NotFoundError(error.message);

    return data;
  }

  async create(client: SupabaseClient, data: CreateAppointmentInput) {
    const { data: row, error } = await client
      .from('appointments')
      .insert({
        patient_id: data.patientId,
        staff_id: data.staffId,
        service_id: data.serviceId,
        appointment_date: data.appointmentDate,
        start_time: data.startTime,
        end_time: data.endTime,
        notes: data.notes,
      })
      .select()
      .single();

    if (error || !row) throw new NotFoundError(error?.message ?? 'Failed to create appointment');

    return row;
  }

  async updateStatus(client: SupabaseClient, id: string, data: UpdateAppointmentInput) {
    const update: Record<string, unknown> = {};
    if (data.status) update.status = data.status;
    if (data.cancelledReason) update.cancelled_reason = data.cancelledReason;
    if (data.appointmentDate) update.appointment_date = data.appointmentDate;
    if (data.startTime) update.start_time = data.startTime;
    if (data.endTime) update.end_time = data.endTime;
    if (data.notes !== undefined) update.notes = data.notes;
    if (data.staffId) update.staff_id = data.staffId;
    if (data.serviceId) update.service_id = data.serviceId;

    const { data: row, error } = await client
      .from('appointments')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error || !row) throw new NotFoundError('Appointment not found');

    return row;
  }
}
