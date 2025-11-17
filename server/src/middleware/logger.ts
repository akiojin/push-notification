import { FastifyPluginCallback } from 'fastify';
import fp from 'fastify-plugin';

const loggerMiddleware: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.addHook('onRequest', async (request, reply) => {
    const requestId = request.id;
    reply.header('x-request-id', requestId);
    reply.log = request.log;
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const getResponseTime = (reply as typeof reply & { getResponseTime?: () => number })
      .getResponseTime;
    const responseTime = typeof getResponseTime === 'function' ? getResponseTime() : undefined;
    request.log.info(
      {
        statusCode: reply.statusCode,
        ...(responseTime !== undefined ? { responseTime } : {}),
      },
      'request completed',
    );
  });

  done();
};

export default fp(loggerMiddleware);
