import type { SupabaseClient } from '@supabase/supabase-js';
import { NotFoundError } from '../utils/errors.js';
import { supabaseAdmin } from '../lib/supabase.js';

export interface CreateInquiryInput {
  name: string;
  phone: string;
  serviceInterest?: string;
  preferredDate?: string;
  preferredTime?: string;
}

export interface InquiryListFilters {
  status?: string;
}

function waLink(phone: string, name: string, serviceInterest?: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  const withCountry = digits.startsWith('91') ? digits : `91${digits}`;
  const text = `Hi ${name}, this is Dr. Kusum's Dental Care${
    serviceInterest ? ` regarding your inquiry about ${serviceInterest}` : ''
  }. `;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(text)}`;
}

export class InquiryService {
  /** Public, unauthenticated — always via supabaseAdmin (no caller identity to scope RLS to). */
  async createPublic(input: CreateInquiryInput) {
    const { data, error } = await supabaseAdmin
      .from('contact_inquiries')
      .insert({
        name: input.name,
        phone: input.phone,
        subject: input.serviceInterest ?? 'Booking inquiry',
        service_interest: input.serviceInterest ?? null,
        preferred_date: input.preferredDate ?? null,
        preferred_time: input.preferredTime ?? null,
        status: 'PENDING',
      })
      .select('id, name, phone, service_interest, preferred_date, preferred_time, status, created_at')
      .single();

    if (error || !data) throw new NotFoundError(error?.message ?? 'Could not save inquiry');
    return data;
  }

  async list(client: SupabaseClient, filters: InquiryListFilters = {}) {
    let query = client
      .from('contact_inquiries')
      .select('id, name, email, phone, service_interest, preferred_date, preferred_time, status, created_at')
      .order('created_at', { ascending: false });

    if (filters.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw new NotFoundError(error.message);

    return (data ?? []).map((row) => ({
      ...row,
      waLink: row.phone ? waLink(row.phone, row.name, row.service_interest ?? undefined) : null,
    }));
  }

  async updateStatus(client: SupabaseClient, id: string, status: string) {
    const patch: Record<string, unknown> = { status };
    if (status === 'CONTACTED') patch.responded_at = new Date().toISOString();

    const { data, error } = await client
      .from('contact_inquiries')
      .update(patch)
      .eq('id', id)
      .select('id, name, phone, status, responded_at')
      .single();

    if (error || !data) throw new NotFoundError('Inquiry not found');
    return data;
  }
}
