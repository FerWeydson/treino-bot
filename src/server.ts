import Fastify from 'fastify';
import { healthRoutes } from './routes/health.js';

export function buildServer() {
  const server = Fastify({ logger: true });

  server.register(healthRoutes);

  return server;
}