import type { FastifyInstance } from 'fastify';
import Joi from 'joi';
import { PatientService } from '../../services/PatientService.js';
import { validate } from '../../middleware/validation.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { ForbiddenError } from '../../utils/errors.js';

const updateProfileSchema = Joi.object({
  full_name: Joi.string().min(2).max(120),
  phone: Joi.string().max(20),
  date_of_birth: Joi.date().raw(),
  gender: Joi.string().max(20),
  profile_photo_url: Joi.string().uri(),
  address: Joi.string().max(255),
  city: Joi.string().max(100),
  state: Joi.string().max(100),
  postal_code: Joi.string().max(20),
  insurance_provider: Joi.string().max(100),
  insurance_id: Joi.string().max(100),
  emergency_contact_name: Joi.string().max(120),
  emergency_contact_phone: Joi.string().max(20),
}).min(1);

const historyQuerySchema = Joi.object({
  status: Joi.string(),
  fromDate: Joi.date().raw(),
  toDate: Joi.date().raw(),
  page: Joi.number().integer().min(1),
  pageSize: Joi.number().integer().min(1).max(100),
});

// Belt-and-suspenders app-level check: RLS is the real enforcement, but a
// clear 403 here beats an opaque empty result from Postgres for the client.
function ensureSelfOrStaff(requesterId: string, requesterRole: string, targetId: string): void {
  const staffRoles = ['DENTIST', 'STAFF', 'ADMIN'];
  if (requesterId !== targetId && !staffRoles.includes(requesterRole)) {
    throw new ForbiddenError("Cannot access another patient's data");
  }
}

export default async function patientRoutes(fastify: FastifyInstance): Promise<void> {
  const patientService = new PatientService();

  fastify.addHook('preHandler', authenticate);

  fastify.get('/me', async (request, reply) => {
    const profile = await patientService.getProfile(request.supabase!, request.user!.id);
    reply.status(200).send(profile);
  });

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const profile = await patientService.getProfile(request.supabase!, request.params.id);
    reply.status(200).send(profile);
  });

  fastify.put<{ Params: { id: string } }>(
    '/:id',
    { preHandler: validate(updateProfileSchema), config: { rateLimit: { max: 20, timeWindow: '5 minutes' } } },
    async (request, reply) => {
      ensureSelfOrStaff(request.user!.id, request.user!.role, request.params.id);
      const updated = await patientService.updateProfile(
        request.supabase!,
        request.params.id,
        request.body as Record<string, unknown>,
      );
      reply.status(200).send(updated);
    },
  );

  fastify.get<{ Params: { id: string } }>(
    '/:id/history',
    { preHandler: validate(historyQuerySchema, 'query') },
    async (request, reply) => {
      ensureSelfOrStaff(request.user!.id, request.user!.role, request.params.id);
      const history = await patientService.getAppointmentHistory(
        request.supabase!,
        request.params.id,
        request.query as Record<string, unknown>,
      );
      reply.status(200).send(history);
    },
  );

  fastify.get<{ Params: { id: string } }>('/:id/records', async (request, reply) => {
    ensureSelfOrStaff(request.user!.id, request.user!.role, request.params.id);
    const records = await patientService.getMedicalRecords(request.supabase!, request.params.id);
    reply.status(200).send(records);
  });

  fastify.put<{ Params: { id: string } }>(
    '/:id/preferences',
    { preHandler: authorize(['PATIENT', 'ADMIN']), config: { rateLimit: { max: 20, timeWindow: '5 minutes' } } },
    async (request, reply) => {
      ensureSelfOrStaff(request.user!.id, request.user!.role, request.params.id);
      reply.status(200).send({ message: 'Preferences updated' });
    },
  );
}
