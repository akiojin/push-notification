import 'dotenv/config';

import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify from 'fastify';

import { loadEnv } from './config/env.js';
import { getLoggerOptions } from './config/logger.js';
import apiKeyAuth from './plugins/api-key-auth.js';
import notificationsRoutes from './routes/notifications.js';
import tokensRoutes from './routes/tokens.js';

export async function buildServer() {
  const env = loadEnv();
  const app = Fastify({ logger: getLoggerOptions() });

  await app.register(cors, { origin: true });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Push Notification API',
        version: '1.0.0',
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });

  await app.register(apiKeyAuth);
  await app.register(tokensRoutes);
  await app.register(notificationsRoutes);

  app.get('/healthz', () => ({ status: 'ok' }));

  return { app, port: Number(env.PORT) } as const;
}

if (process.env.NODE_ENV !== 'test') {
  const { app, port } = await buildServer();
  try {
    await app.listen({ port, host: '0.0.0.0' });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}
