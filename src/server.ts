import Fastify from 'fastify';
import formbody from '@fastify/formbody';
import { healthRoutes } from './routes/health';
import { webhookRoutes } from './routes/webhook';

export function buildServer() {
  const server = Fastify({ logger: true });

  server.register(formbody);
  server.register(healthRoutes);
  server.register(webhookRoutes);

  return server;
}