import type { FastifyInstance } from 'fastify';
import Joi from 'joi';
import { AuthService } from '../../services/AuthService.js';
import { validate } from '../../middleware/validation.js';
import { authenticate } from '../../middleware/auth.js';

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  fullName: Joi.string().min(2).max(120).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const oauthSessionSchema = Joi.object({
  accessToken: Joi.string().required(),
  refreshToken: Joi.string().required(),
});

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  const authService = new AuthService();

  /**
   * @post /api/v1/auth/register
   * @description Register a new patient/staff user
   * @param {string} email - User email
   * @param {string} password - User password (min 8 chars)
   * @param {string} fullName - Full name
   * @returns {object} 201 - {user, accessToken, refreshToken}
   * @returns {object} 400 - Validation error
   * @returns {object} 409 - Email already registered
   */
  fastify.post(
    '/register',
    {
      preHandler: validate(registerSchema),
      config: { rateLimit: { max: 5, timeWindow: '10 minutes' } },
    },
    async (request, reply) => {
      const { email, password, fullName } = request.body as {
        email: string;
        password: string;
        fullName: string;
      };
      const result = await authService.register(email, password, fullName);
      reply.status(201).send(result);
    },
  );

  /**
   * @post /api/v1/auth/login
   * @description User login with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {object} 200 - {user, accessToken, refreshToken}
   * @returns {object} 401 - {error: "Invalid credentials"}
   */
  fastify.post(
    '/login',
    {
      preHandler: validate(loginSchema),
      config: { rateLimit: { max: 10, timeWindow: '5 minutes' } },
    },
    async (request, reply) => {
      const { email, password } = request.body as { email: string; password: string };
      const result = await authService.login(email, password);
      reply.status(200).send(result);
    },
  );

  /**
   * @post /api/v1/auth/oauth-session
   * @description Exchange a Supabase OAuth session (e.g. Google sign-in,
   *   already completed client-side) for the same {user, accessToken,
   *   refreshToken} shape /auth/login returns.
   * @param {string} accessToken - Supabase access token from the OAuth callback
   * @param {string} refreshToken - Supabase refresh token from the OAuth callback
   * @returns {object} 200 - {user, accessToken, refreshToken}
   * @returns {object} 401 - {error: "Invalid session"}
   */
  fastify.post(
    '/oauth-session',
    {
      preHandler: validate(oauthSessionSchema),
      config: { rateLimit: { max: 10, timeWindow: '5 minutes' } },
    },
    async (request, reply) => {
      const { accessToken, refreshToken } = request.body as { accessToken: string; refreshToken: string };
      const result = await authService.sessionFromToken(accessToken, refreshToken);
      reply.status(200).send(result);
    },
  );

  /**
   * @post /api/v1/auth/refresh-token
   * @description Exchange a valid refresh token for a new access token
   * @param {string} refreshToken - Refresh token
   * @returns {object} 200 - {accessToken}
   * @returns {object} 401 - Invalid or expired token
   */
  fastify.post(
    '/refresh-token',
    {
      preHandler: validate(refreshSchema),
      config: { rateLimit: { max: 20, timeWindow: '5 minutes' } },
    },
    async (request, reply) => {
      const { refreshToken } = request.body as { refreshToken: string };
      const result = await authService.refreshToken(refreshToken);
      reply.status(200).send(result);
    },
  );

  /**
   * @post /api/v1/auth/logout
   * @description Invalidate the current access token
   * @returns {object} 200 - {message: "Logged out"}
   */
  fastify.post('/logout', { preHandler: authenticate }, async (request, reply) => {
    const token = request.headers.authorization!.slice('Bearer '.length);
    await authService.logout(token);
    reply.status(200).send({ message: 'Logged out' });
  });
}
