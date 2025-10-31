import { DeliveryStatus, Prisma } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '../prisma.js';

const notificationCreateSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  imageUrl: z.string().url().optional(),
  customData: z.record(z.string(), z.any()).optional(),
  tokens: z.array(z.string().min(1)).min(1).max(1000),
});

export type NotificationCreateInput = z.infer<typeof notificationCreateSchema>;

export interface NotificationCreateResult {
  notificationId: string;
  deliveryLogs: Array<{
    deviceId: string;
    status: DeliveryStatus;
  }>;
}

export class UnknownDeviceTokensError extends Error {
  readonly tokens: string[];

  constructor(tokens: string[]) {
    super(`Unknown device tokens: ${tokens.join(', ')}`);
    this.name = 'UnknownDeviceTokensError';
    this.tokens = tokens;
  }
}

export async function createNotification(input: NotificationCreateInput): Promise<NotificationCreateResult> {
  const data = notificationCreateSchema.parse(input);

  const devices = await prisma.device.findMany({
    where: {
      token: {
        in: data.tokens,
      },
    },
  });

  if (devices.length !== data.tokens.length) {
    const missing = data.tokens.filter(
      (token) => !devices.some((device) => device.token === token),
    );
    throw new UnknownDeviceTokensError(missing);
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

    return {
      notificationId: notification.id,
      deliveryLogs: devices.map((device) => ({
        deviceId: device.id,
        status: DeliveryStatus.PENDING,
      })),
    };
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
