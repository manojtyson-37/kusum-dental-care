import type { IncomingMessage, ServerResponse } from 'node:http';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../../backend/src/server.js';

// Reused across warm invocations of the same function instance — building
// the Fastify app on every request would be needlessly slow.
let appPromise: Promise<FastifyInstance> | null = null;

function getApp(): Promise<FastifyInstance> {
  if (!appPromise) appPromise = buildServer();
  return appPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const app = await getApp();
  await app.ready();
  app.server.emit('request', req, res);
}
