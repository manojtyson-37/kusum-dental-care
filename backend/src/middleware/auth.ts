import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import { createUserClient, type UserRole } from '../lib/supabase.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed authorization header');
  }
  const token = header.slice('Bearer '.length);

  const client = createUserClient(token);
  const { data, error } = await client.auth.getUser(token);

  if (error || !data.user) {
    throw new UnauthorizedError('Invalid or expired token');
  }

  request.user = {
    id: data.user.id,
    email: data.user.email ?? '',
    role: (data.user.app_metadata?.role as UserRole) ?? 'PATIENT',
  };
  request.supabase = client;
  request.accessToken = token;
}

// By design, not a stopgap: the admin panel is a personal dashboard for the
// clinic's one doctor. Patients never log in — there is no patient-facing
// account system — so there are no roles to separate and anyone who signs in
// is treated as admin. authorize() and requireDoctor() therefore pass any
// authenticated account.
//
// The role and doctor-id checks below are kept intact and can be switched
// back on with ADMIN_OPEN_ACCESS=false if the clinic ever adds staff logins
// or restricts who may register. The trade-off accepted here is that sign-up
// is open to anyone, so anyone who signs up reaches patient data.
const OPEN_ACCESS = process.env.ADMIN_OPEN_ACCESS !== 'false';

export function authorize(roles: UserRole[]): preHandlerHookHandler {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.user) {
      throw new UnauthorizedError('Not authenticated');
    }
    if (OPEN_ACCESS) return;
    if (!roles.includes(request.user.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }
  };
}

// Solo-doctor clinic — the entire admin panel belongs to Dr. Kusum alone.
// Pins access to her specific account id on top of the DENTIST/ADMIN role
// check, so a stray ADMIN-role row (test fixture, mis-set profile) can't
// reach admin data through the API even if RLS would otherwise allow it.
export async function requireDoctor(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  if (!request.user) {
    throw new UnauthorizedError('Not authenticated');
  }
  if (OPEN_ACCESS) return;
  if (request.user.id !== config.doctorUserId) {
    logger.warn('Blocked non-doctor account from admin panel', {
      userId: request.user.id,
      email: request.user.email,
      role: request.user.role,
    });
    throw new ForbiddenError('Admin access is restricted to the clinic owner account');
  }
}
