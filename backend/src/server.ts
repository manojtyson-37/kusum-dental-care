import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { Server as SocketIOServer } from 'socket.io';
import { randomUUID } from 'node:crypto';
import { config } from './utils/config.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { loggingPlugin } from './middleware/logging.js';
import { auditPlugin } from './middleware/audit.js';
import { registerSwagger } from './utils/swagger.js';
import { supabaseAdmin } from './lib/supabase.js';
import authRoutes from './api/routes/auth.js';
import patientRoutes from './api/routes/patients.js';
import serviceRoutes from './api/routes/services.js';
import adminRoutes from './api/routes/admin.js';
import inquiryRoutes from './api/routes/inquiries.js';

export async function buildServer() {
  const fastify = Fastify({
    genReqId: () => randomUUID(),
    disableRequestLogging: true,
  });

  await fastify.register(helmet);
  await fastify.register(cors, {
    origin: (origin, callback) => {
      // No Origin header (curl, server-to-server, health checks) — allow.
      if (!origin || config.allowedOrigins.includes(origin) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  });
  await fastify.register(rateLimit, {
    global: false,
    max: 100,
    timeWindow: '1 minute',
  });
  await fastify.register(loggingPlugin);
  await fastify.register(auditPlugin);
  await registerSwagger(fastify);

  fastify.setErrorHandler(errorHandler);

  fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
  await fastify.register(patientRoutes, { prefix: '/api/v1/patients' });
  await fastify.register(serviceRoutes, { prefix: '/api/v1/services' });
  await fastify.register(adminRoutes, { prefix: '/api/v1/admin' });
  await fastify.register(inquiryRoutes, { prefix: '/api/v1/inquiries' });

  return fastify;
}

async function testSupabaseConnection(): Promise<void> {
  const { error } = await supabaseAdmin.from('services').select('id').limit(1);
  if (error) {
    logger.error('Supabase connection failed', { error: error.message });
    throw new Error(error.message);
  }
  logger.info('Supabase connection established');
}

async function start(): Promise<void> {
  await testSupabaseConnection();

  const fastify = await buildServer();
  await fastify.listen({ port: config.port, host: '0.0.0.0' });
  logger.info(`HTTP server listening on port ${config.port}`);

  // Shares the same port/server as the API — PaaS hosts (Railway, Render,
  // etc.) expose one public port per service, so a second listener on
  // WS_PORT would be unreachable in production.
  const io = new SocketIOServer(fastify.server, { cors: { origin: config.allowedOrigins, credentials: true } });
  io.on('connection', (socket) => {
    logger.info('socket connected', { socketId: socket.id });
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    io.close();
    await fastify.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

// VERCEL is set automatically in that runtime — the serverless function
// imports buildServer() directly and must never call .listen() itself.
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  start().catch((err) => {
    logger.error('Failed to start server', { error: (err as Error).message });
    process.exit(1);
  });
}
