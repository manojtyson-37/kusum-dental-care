import type { FastifyInstance } from 'fastify';
import { createClient } from '@supabase/supabase-js';
import Joi from 'joi';
import { ServiceService } from '../../services/ServiceService.js';
import { validate } from '../../middleware/validation.js';
import { config } from '../../utils/config.js';

const listQuerySchema = Joi.object({
  category: Joi.string(),
  page: Joi.number().integer().min(1),
  pageSize: Joi.number().integer().min(1).max(100),
});

// Public catalog — no auth required. Uses the anon-key client so RLS's
// "services_select_active_public" policy governs visibility.
const publicClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export default async function serviceRoutes(fastify: FastifyInstance): Promise<void> {
  const serviceService = new ServiceService();

  fastify.get('/', { preHandler: validate(listQuerySchema, 'query') }, async (request, reply) => {
    const result = await serviceService.listServices(
      publicClient,
      request.query as Record<string, unknown>,
    );
    reply.status(200).send(result);
  });

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const service = await serviceService.getService(publicClient, request.params.id);
    reply.status(200).send(service);
  });

  fastify.get<{ Params: { category: string } }>('/category/:category', async (request, reply) => {
    const services = await serviceService.getServicesByCategory(
      publicClient,
      request.params.category,
    );
    reply.status(200).send(services);
  });
}
