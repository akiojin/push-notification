import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { createNotification, getNotificationWithDeliveries } from '../lib/notification/index.js';

const createNotificationSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  imageUrl: z.string().url().optional(),
  customData: z.record(z.string(), z.any()).optional(),
  deviceTokens: z.array(z.string().min(1)).min(1),
});

// eslint-disable-next-line @typescript-eslint/require-await
const notificationsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/v1/notifications/:id', async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const notification = await getNotificationWithDeliveries(params.id);
    if (!notification) {
      reply.code(404).send({ error: 'Notification not found' });
      return;
    }

    reply.send({
      notificationId: notification.id,
      title: notification.title,
      body: notification.body,
      imageUrl: notification.imageUrl,
      customData: notification.customData,
      createdAt: notification.createdAt,
      deliveryLogs: notification.deliveries.map((delivery) => ({
        deviceId: delivery.deviceId,
        status: delivery.status,
        errorCode: delivery.errorCode,
        errorMessage: delivery.errorMessage,
        sentAt: delivery.createdAt,
        deliveredAt: delivery.deliveredAt,
      })),
    });
  });

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
