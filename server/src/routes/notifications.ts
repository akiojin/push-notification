import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { createNotification } from '../lib/notification/index.js';

const createNotificationSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  imageUrl: z.string().url().optional(),
  customData: z.record(z.string(), z.any()).optional(),
  deviceTokens: z.array(z.string().min(1)).min(1),
});

// eslint-disable-next-line @typescript-eslint/require-await
const notificationsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/api/v1/notifications', async (request, reply) => {
    const payload = createNotificationSchema.parse(request.body);

    try {
      const notification = await createNotification(payload);
      reply.code(202).send({ id: notification.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.startsWith('Unknown device tokens')) {
        reply.code(400).send({ error: message });
        return;
      }
      throw error;
    }
  });
};

export default notificationsRoutes;
