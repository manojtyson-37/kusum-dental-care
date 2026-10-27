import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { supabaseAdmin } from '../lib/supabase.js';
import { logger } from '../utils/logger.js';

const AUDITED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SENSITIVE_FIELDS = new Set(['password', 'refreshToken', 'accessToken']);

function redact(payload: unknown): unknown {
  if (payload === null || typeof payload !== 'object') return payload;
  const clone: Record<string, unknown> = { ...(payload as Record<string, unknown>) };
  for (const key of Object.keys(clone)) {
    if (SENSITIVE_FIELDS.has(key)) delete clone[key];
  }
  return clone;
}

function actionFromMethod(method: string): 'CREATE' | 'UPDATE' | 'DELETE' {
  if (method === 'POST') return 'CREATE';
  if (method === 'DELETE') return 'DELETE';
  return 'UPDATE';
}

export const auditPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.addHook('onResponse', async (request: FastifyRequest, reply) => {
    if (!AUDITED_METHODS.has(request.method)) return;
    if (reply.statusCode >= 400) return;

    try {
      // service_role client bypasses RLS by design — audit_logs has no
      // client-facing policies at all (see supabase/migrations RLS file).
      await supabaseAdmin.from('audit_logs').insert({
        user_id: request.user?.id ?? null,
        entity_type: request.routeOptions?.url ?? request.url,
        entity_id: (request.params as { id?: string } | undefined)?.id ?? null,
        action: actionFromMethod(request.method),
        new_values: redact(request.body),
        ip_address: request.ip,
        user_agent: request.headers['user-agent'] ?? null,
      });
    } catch (err) {
      logger.error('audit log write failed', { error: (err as Error).message });
    }
  });
});
