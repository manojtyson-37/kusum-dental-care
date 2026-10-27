import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '../utils/config.js';
import type { UserRole } from '../types/fastify.js';

export type { UserRole };

/** Admin client — service_role key, bypasses RLS. Trusted server-only use. */
export const supabaseAdmin: SupabaseClient = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * Per-request client scoped to the caller's access token, so every query
 * runs through Postgres RLS as that user — never bypass RLS for user-facing
 * reads/writes.
 */
export function createUserClient(accessToken: string): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
