import type { FastifyInstance } from 'fastify';
import Joi from 'joi';
import { InquiryService } from '../../services/InquiryService.js';
import { validate } from '../../middleware/validation.js';

const createInquirySchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  phone: Joi.string().min(6).max(20).required(),
  serviceInterest: Joi.string().max(120),
  preferredDate: Joi.date().raw(),
  preferredTime: Joi.string().max(50),
});

export default async function inquiryRoutes(fastify: FastifyInstance): Promise<void> {
  const inquiryService = new InquiryService();

  /**
   * @post /api/v1/inquiries
   * @description Public lead-capture form (name, phone, service interest,
   *   preferred date/time). No auth — anyone can submit a booking inquiry.
   * @returns {object} 201 - the created inquiry
   */
  fastify.post(
    '/',
    {
      preHandler: validate(createInquirySchema),
      config: { rateLimit: { max: 8, timeWindow: '10 minutes' } },
    },
    async (request, reply) => {
      const inquiry = await inquiryService.createPublic(request.body as never);
      reply.status(201).send(inquiry);
    },
  );
}
