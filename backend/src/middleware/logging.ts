import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { logger } from '../utils/logger.js';

export const loggingPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.addHook('onResponse', async (request, reply) => {
    logger.info('request completed', {
      requestId: request.id,
      method: request.method,
      path: request.url,
      statusCode: reply.statusCode,
      durationMs: reply.elapsedTime,
    });
  });
});
