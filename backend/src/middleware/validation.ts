import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import type { Schema } from 'joi';
import { ValidationError } from '../utils/errors.js';

type ValidationTarget = 'body' | 'query' | 'params';

export function validate(schema: Schema, target: ValidationTarget = 'body'): preHandlerHookHandler {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const payload = request[target];
    const { error, value } = schema.validate(payload, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => d.message);
      throw new ValidationError('Validation failed', details);
    }

    request[target] = value;
  };
}
