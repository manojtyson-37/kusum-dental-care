import type { SupabaseClient } from '@supabase/supabase-js';
import { NotFoundError } from '../utils/errors.js';

export interface ServiceFilters {
  category?: string;
  page?: number;
  pageSize?: number;
}

export class ServiceService {
  async listServices(client: SupabaseClient, filters: ServiceFilters = {}) {
    const { category, page = 1, pageSize = 20 } = filters;

    let query = client
      .from('services')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .order('name', { ascending: true })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (category) query = query.eq('category', category);

    const { data, count, error } = await query;
    if (error) throw new NotFoundError(error.message);

    return { items: data, total: count ?? 0, page, pageSize };
  }

  async getService(client: SupabaseClient, serviceId: string) {
    const { data, error } = await client
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      throw new NotFoundError('Service not found');
    }

    return data;
  }

  async getServicesByCategory(client: SupabaseClient, category: string) {
    const { data, error } = await client
      .from('services')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw new NotFoundError(error.message);

    return data;
  }
}
