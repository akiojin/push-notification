import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { deleteDevice, upsertDevice } from '../lib/device/index.js';

const registerBody = z.object({
  token: z.string().min(1),
  platform: z.enum(['IOS', 'ANDROID']),
  playerAccountId: z.string().min(1).optional(),
});

// eslint-disable-next-line @typescript-eslint/require-await
const tokensRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/api/v1/tokens', async (request, reply) => {
    const body = registerBody.parse(request.body);
    const device = await upsertDevice(body);
    reply.code(201).send({ id: device.id });
  });

  fastify.delete('/api/v1/tokens/:token', async (request, reply) => {
    const params = z.object({ token: z.string().min(1) }).parse(request.params);
    await deleteDevice(params.token);
    reply.code(204).send();
  });
};

export default tokensRoutes;
