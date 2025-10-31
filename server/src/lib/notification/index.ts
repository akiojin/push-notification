import { DeliveryStatus, Prisma } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '../prisma.js';

const notificationCreateSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  imageUrl: z.string().url().optional(),
  customData: z.record(z.string(), z.any()).optional(),
  deviceTokens: z.array(z.string().min(1)).min(1),
});

export type NotificationCreateInput = z.infer<typeof notificationCreateSchema>;

export async function createNotification(input: NotificationCreateInput) {
  const data = notificationCreateSchema.parse(input);

  const devices = await prisma.device.findMany({
    where: {
      token: {
        in: data.deviceTokens,
      },
    },
  });

  if (devices.length !== data.deviceTokens.length) {
    const missing = data.deviceTokens.filter(
      (token) => !devices.some((device) => device.token === token),
    );
    throw new Error(`Unknown device tokens: ${missing.join(', ')}`);
  }

  return prisma.$transaction(async (tx) => {
    const notification = await tx.notification.create({
      data: {
        title: data.title,
        body: data.body,
        imageUrl: data.imageUrl,
        customData: (data.customData ?? null) as Prisma.InputJsonValue,
      },
    });

    await tx.deliveryLog.createMany({
      data: devices.map((device) => ({
        notificationId: notification.id,
        deviceId: device.id,
        status: DeliveryStatus.PENDING,
      })),
    });

    return notification;
  });
}

export async function getNotificationWithDeliveries(id: string) {
  return prisma.notification.findUnique({
    where: { id },
    include: {
      deliveries: {
        include: {
          device: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}
