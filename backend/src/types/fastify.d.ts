import type { SupabaseClient } from '@supabase/supabase-js';

export type UserRole = 'PATIENT' | 'DENTIST' | 'STAFF' | 'ADMIN';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
    supabase?: SupabaseClient;
    accessToken?: string;
  }
}
