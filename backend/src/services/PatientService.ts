import type { SupabaseClient } from '@supabase/supabase-js';
import { NotFoundError } from '../utils/errors.js';

export interface AppointmentHistoryFilters {
  status?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

/**
 * All methods take the caller's RLS-scoped client (see lib/supabase.js
 * createUserClient) — access control is enforced by Postgres RLS policies,
 * not re-implemented here.
 */
export class PatientService {
  async getProfile(client: SupabaseClient, patientId: string) {
    const { data, error } = await client
      .from('profiles')
      .select(
        `id, email, full_name, phone, date_of_birth, gender, profile_photo_url,
         patients ( address, city, state, postal_code, insurance_provider,
                     insurance_id, emergency_contact_name, emergency_contact_phone,
                     last_visit_date )`,
      )
      .eq('id', patientId)
      .single();

    if (error || !data) {
      throw new NotFoundError('Patient not found');
    }

    return data;
  }

  async updateProfile(client: SupabaseClient, patientId: string, data: Record<string, unknown>) {
    const profileFields = ['full_name', 'phone', 'date_of_birth', 'gender', 'profile_photo_url'];
    const patientFields = [
      'address',
      'city',
      'state',
      'postal_code',
      'insurance_provider',
      'insurance_id',
      'emergency_contact_name',
      'emergency_contact_phone',
    ];

    const profileUpdate = Object.fromEntries(
      Object.entries(data).filter(([key]) => profileFields.includes(key)),
    );
    const patientUpdate = Object.fromEntries(
      Object.entries(data).filter(([key]) => patientFields.includes(key)),
    );

    if (Object.keys(profileUpdate).length > 0) {
      const { error } = await client.from('profiles').update(profileUpdate).eq('id', patientId);
      if (error) throw new NotFoundError(error.message);
    }

    if (Object.keys(patientUpdate).length > 0) {
      const { error } = await client
        .from('patients')
        .upsert({ id: patientId, ...patientUpdate });
      if (error) throw new NotFoundError(error.message);
    }

    return this.getProfile(client, patientId);
  }

  async getAppointmentHistory(
    client: SupabaseClient,
    patientId: string,
    filters: AppointmentHistoryFilters = {},
  ) {
    const { status, fromDate, toDate, page = 1, pageSize = 20 } = filters;

    let query = client
      .from('appointments')
      .select('*')
      .eq('patient_id', patientId)
      .order('appointment_date', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (status) query = query.eq('status', status);
    if (fromDate) query = query.gte('appointment_date', fromDate);
    if (toDate) query = query.lte('appointment_date', toDate);

    const { data, error } = await query;
    if (error) throw new NotFoundError(error.message);

    return data;
  }

  async getMedicalRecords(client: SupabaseClient, patientId: string) {
    const { data, error } = await client
      .from('profiles')
      .select('medical_history, allergies')
      .eq('id', patientId)
      .single();

    if (error || !data) {
      throw new NotFoundError('Patient not found');
    }

    return data;
  }
}
