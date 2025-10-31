import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { deleteDevice, findDeviceByToken, listNotificationsByDevice, upsertDevice } from '../lib/device/index.js';
import { buildErrorResponse, buildValidationError, zodErrorToDetails } from '../utils/errors.js';

const registerBody = z.object({
  token: z.string().min(1),
  platform: z.enum(['IOS', 'ANDROID']),
  playerAccountId: z.string().min(1).optional(),
});

const tokenParamsSchema = z.object({ token: z.string().min(1) });

// eslint-disable-next-line @typescript-eslint/require-await
const tokensRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/v1/tokens/:token', async (request, reply) => {
    const parsedParams = tokenParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      reply.code(400).send(buildValidationError(zodErrorToDetails(parsedParams.error)));
      return;
    }
    const { token } = parsedParams.data;

    const device = await findDeviceByToken(token);
    if (!device) {
      reply.code(404).send(buildErrorResponse('NOT_FOUND', 'Token not found'));
      return;
    }
    const deliveries = await listNotificationsByDevice(device.id);

    reply.send({
      id: device.id,
      token: device.token,
      platform: device.platform,
      playerAccountId: device.playerAccountId,
      createdAt: device.createdAt.toISOString(),
      updatedAt: device.updatedAt.toISOString(),
      deliveries: deliveries.map((delivery) => ({
        id: delivery.id,
        status: delivery.status,
        errorCode: delivery.errorCode,
        errorMessage: delivery.errorMessage,
        deliveredAt: delivery.deliveredAt ? delivery.deliveredAt.toISOString() : null,
        createdAt: delivery.createdAt.toISOString(),
        notification: {
          id: delivery.notification.id,
          title: delivery.notification.title,
          body: delivery.notification.body,
          imageUrl: delivery.notification.imageUrl,
          customData: delivery.notification.customData,
          createdAt: delivery.notification.createdAt.toISOString(),
        },
      })),
    });
  });

  fastify.post('/api/v1/tokens', async (request, reply) => {
    const parsedBody = registerBody.safeParse(request.body);
    if (!parsedBody.success) {
      reply.code(400).send(buildValidationError(zodErrorToDetails(parsedBody.error)));
      return;
    }
    const body = parsedBody.data;
    const device = await upsertDevice(body);
    reply.code(201).send({
      id: device.id,
      token: device.token,
      platform: device.platform,
      playerAccountId: device.playerAccountId,
      createdAt: device.createdAt.toISOString(),
      updatedAt: device.updatedAt.toISOString(),
    });
  });

  fastify.delete('/api/v1/tokens/:token', async (request, reply) => {
    const parsedParams = tokenParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      reply.code(400).send(buildValidationError(zodErrorToDetails(parsedParams.error)));
      return;
    }
    const { token } = parsedParams.data;
    try {
      await deleteDevice(token);
    } catch (error) {
      const maybeError = error as { code?: string; name?: string } | undefined;
      if (maybeError?.code === 'P2025' || maybeError?.name === 'PrismaClientKnownRequestError') {
        reply.code(204).send();
        return;
      }
      throw error;
    }
    reply.code(204).send();
  });
};

export default tokensRoutes;
