import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import {
  deleteDevice,
  findDeviceByToken,
  listNotificationsByDevice,
  upsertDevice,
} from '../lib/device/index.js';

const registerBody = z.object({
  token: z.string().min(1),
  platform: z.enum(['IOS', 'ANDROID']),
  playerAccountId: z.string().min(1).optional(),
});

// eslint-disable-next-line @typescript-eslint/require-await
const tokensRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/v1/tokens/:token', async (request, reply) => {
    const params = z.object({ token: z.string().min(1) }).parse(request.params);
    const device = await findDeviceByToken(params.token);
    if (!device) {
      reply.code(404).send({ error: 'Token not found' });
      return;
    }
    const deliveries = await listNotificationsByDevice(device.id);

    reply.send({
      id: device.id,
      token: device.token,
      platform: device.platform,
      playerAccountId: device.playerAccountId,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt,
      deliveries,
    });
  });

  fastify.post('/api/v1/tokens', async (request, reply) => {
    const body = registerBody.parse(request.body);
    const device = await upsertDevice(body);
    reply.code(201).send({ id: device.id });
  });

  fastify.delete('/api/v1/tokens/:token', async (request, reply) => {
    const params = z.object({ token: z.string().min(1) }).parse(request.params);
    try {
      await deleteDevice(params.token);
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
