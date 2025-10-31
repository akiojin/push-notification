import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { UnknownDeviceTokensError, createNotification, getNotificationWithDeliveries } from '../lib/notification/index.js';
import { buildErrorResponse, buildValidationError, zodErrorToDetails } from '../utils/errors.js';

const createNotificationSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  imageUrl: z.string().url().optional(),
  customData: z.record(z.string(), z.any()).optional(),
  tokens: z.array(z.string().min(1)).min(1).max(1000),
});

const notificationIdSchema = z.object({ id: z.string().uuid() });

// eslint-disable-next-line @typescript-eslint/require-await
const notificationsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/v1/notifications/:id', async (request, reply) => {
    const parsedParams = notificationIdSchema.safeParse(request.params);
    if (!parsedParams.success) {
      reply.code(400).send(buildValidationError(zodErrorToDetails(parsedParams.error)));
      return;
    }
    const params = parsedParams.data;
    const notification = await getNotificationWithDeliveries(params.id);
    if (!notification) {
      reply.code(404).send(buildErrorResponse('NOT_FOUND', 'Notification not found'));
      return;
    }

    reply.send({
      notificationId: notification.id,
      title: notification.title,
      body: notification.body,
      imageUrl: notification.imageUrl,
      customData: notification.customData,
      createdAt: notification.createdAt.toISOString(),
      deliveryLogs: notification.deliveries.map((delivery) => ({
        deviceId: delivery.deviceId,
        status: delivery.status,
        errorCode: delivery.errorCode,
        errorMessage: delivery.errorMessage,
        sentAt: delivery.createdAt.toISOString(),
        deliveredAt: delivery.deliveredAt ? delivery.deliveredAt.toISOString() : null,
      })),
    });
  });

  fastify.post('/api/v1/notifications', async (request, reply) => {
    const parsedBody = createNotificationSchema.safeParse(request.body);
    if (!parsedBody.success) {
      reply.code(400).send(buildValidationError(zodErrorToDetails(parsedBody.error)));
      return;
    }
    const payload = parsedBody.data;

    try {
      const notification = await createNotification(payload);
      reply.code(202).send(notification);
    } catch (error) {
      if (error instanceof UnknownDeviceTokensError) {
        reply
          .code(400)
          .send(
            buildErrorResponse('UNKNOWN_TOKENS', error.message, {
              tokens: error.tokens,
            }),
          );
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw error;
    }
  });
};

export default notificationsRoutes;
