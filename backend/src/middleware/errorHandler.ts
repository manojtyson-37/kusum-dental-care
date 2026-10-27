import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError, ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { config } from '../utils/config.js';

export function errorHandler(
  error: FastifyError | AppError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  const requestId = request.id;

  if (error instanceof AppError) {
    logger.warn(error.message, { requestId, statusCode: error.statusCode, name: error.name });
    reply.status(error.statusCode).send({
      error: error.name,
      message: error.message,
      ...(error instanceof ValidationError ? { details: error.details } : {}),
    });
    return;
  }

  logger.error(error.message, { requestId, stack: error.stack });

  const statusCode = 'statusCode' in error && error.statusCode ? error.statusCode : 500;
  reply.status(statusCode).send({
    error: 'InternalServerError',
    message: config.isProduction ? 'An unexpected error occurred' : error.message,
  });
}
