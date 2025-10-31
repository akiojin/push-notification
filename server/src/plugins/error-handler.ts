import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';

import { buildErrorResponse, buildValidationError, zodErrorToDetails } from '../utils/errors.js';

const errorHandlerPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error, request, reply) => {
    if (reply.sent) {
      return reply;
    }

    if (error instanceof ZodError) {
      reply.code(400);
      return reply.send(buildValidationError(zodErrorToDetails(error)));
    }

    if (error.validation) {
      reply.code(400);
      return reply.send(
        buildValidationError({
          issues: error.validation,
        }),
      );
    }

    const statusCodeFromError =
      typeof (error as { statusCode?: number }).statusCode === 'number'
        ? (error as { statusCode: number }).statusCode
        : undefined;

    let statusCode = statusCodeFromError ?? reply.statusCode;
    if (!statusCode || statusCode < 400) {
      statusCode = 500;
    }

    if (typeof (error as { error?: unknown }).error === 'object') {
      reply.code(statusCode);

      if (statusCode >= 500) {
        fastify.log.error({ err: error }, 'Unhandled exception');
      }

      return reply.send(error);
    }

    if (statusCode < 500) {
      reply.code(statusCode);
      return reply.send(buildErrorResponse('BAD_REQUEST', error.message ?? 'Request failed'));
    }

    reply.code(500);
    fastify.log.error({ err: error }, 'Unhandled exception');
    return reply.send(buildErrorResponse('INTERNAL_SERVER_ERROR', 'Unexpected server error'));
  });
};

export default fp(errorHandlerPlugin);
