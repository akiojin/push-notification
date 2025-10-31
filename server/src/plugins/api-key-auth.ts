import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import { loadEnv } from '../config/env.js';
import { buildErrorResponse } from '../utils/errors.js';

// eslint-disable-next-line @typescript-eslint/require-await
const apiKeyAuthPlugin: FastifyPluginAsync = async (fastify) => {
  const publicPrefixes = ['/healthz', '/docs', '/docs/json'];
  const env = loadEnv();

  fastify.addHook('onRequest', async (request, reply) => {
    const path = request.url;
    if (publicPrefixes.some((prefix) => path.startsWith(prefix))) {
      return;
    }

    const headerKey = request.headers['x-api-key'];
    if (!headerKey || headerKey !== env.API_KEY) {
      reply.code(401).send(buildErrorResponse('UNAUTHORIZED', 'Invalid or missing API key'));
      return reply;
    }
  });
};

export default fp(apiKeyAuthPlugin);
