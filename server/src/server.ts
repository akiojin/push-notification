import 'dotenv/config';

import { randomUUID } from 'node:crypto';

import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify from 'fastify';

import { loadEnv } from './config/env.js';
import { loadOpenApiDocument } from './config/openapi.js';
import { getLoggerOptions } from './config/logger.js';
import apiKeyAuth from './plugins/api-key-auth.js';
import errorHandler from './plugins/error-handler.js';
import loggerMiddleware from './middleware/logger.js';
import { startDeliveryRetryWorker, stopDeliveryRetryWorker } from './jobs/delivery-retry.js';
import notificationsRoutes from './routes/notifications.js';
import tokensRoutes from './routes/tokens.js';
import { buildErrorResponse } from './utils/errors.js';

export async function buildServer() {
  const env = loadEnv();
  const app = Fastify({
    logger: getLoggerOptions(),
    genReqId: (req) => {
      const headerId = req.headers['x-request-id'];
      if (typeof headerId === 'string' && headerId.trim().length > 0) {
        return headerId;
      }
      return randomUUID();
    },
    requestIdLogLabel: 'requestId',
  });

  await app.register(cors, { origin: true });

  const rateLimitMax = env.RATE_LIMIT_MAX ? Number(env.RATE_LIMIT_MAX) : 100;
  const rateLimitTimeWindow = env.RATE_LIMIT_TIME_WINDOW ?? '1 minute';

  await app.register(rateLimit, {
    max: Number.isFinite(rateLimitMax) && rateLimitMax > 0 ? rateLimitMax : 100,
    timeWindow: rateLimitTimeWindow,
    errorResponseBuilder: (_request, context) => {
      const rawRetryAfter = context.after;
      const retryAfterSeconds = Number(rawRetryAfter);
      const retryAfterValue = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds : rawRetryAfter;
      const hasRetryAfter = retryAfterValue !== undefined && retryAfterValue !== null;
      const message = hasRetryAfter
        ? `Rate limit exceeded. Please retry after ${retryAfterValue} ${typeof retryAfterValue === 'number' ? 'seconds' : ''}`.trim()
        : 'Rate limit exceeded. Please retry later';

      return {
        statusCode: 429,
        ...buildErrorResponse('RATE_LIMIT_EXCEEDED', message, {
          ...(hasRetryAfter ? { retryAfter: retryAfterValue } : {}),
        }),
      };
    },
  });

  const openApiDocument = loadOpenApiDocument();

  await app.register(swagger, {
    openapi: openApiDocument,
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });

  await app.register(loggerMiddleware);
  await app.register(apiKeyAuth);
  await app.register(errorHandler);
  await app.register(tokensRoutes);
  await app.register(notificationsRoutes);

  app.get('/healthz', () => ({ status: 'ok' }));

  if (env.NODE_ENV !== 'test') {
    const intervalValue = env.DELIVERY_RETRY_INTERVAL_MS ? Number(env.DELIVERY_RETRY_INTERVAL_MS) : undefined;
    const batchValue = env.DELIVERY_RETRY_BATCH_SIZE ? Number(env.DELIVERY_RETRY_BATCH_SIZE) : undefined;

    const stopWorker = startDeliveryRetryWorker(app.log, {
      intervalMs: intervalValue && intervalValue > 0 ? intervalValue : undefined,
      batchSize: batchValue && batchValue > 0 ? batchValue : undefined,
    });

    app.addHook('onClose', async () => {
      stopWorker();
    });
  }

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
