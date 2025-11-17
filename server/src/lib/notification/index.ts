import { DeliveryStatus, Platform, Prisma } from '@prisma/client';
import { z } from 'zod';

import { updateDeliveryStatus } from '../delivery/index.js';
import { deleteDevice } from '../device/index.js';
import { prisma } from '../prisma.js';
import { sendApnsNotification } from './apns.js';
import { NotificationConfigurationError, NotificationProviderError } from './errors.js';
import { sendFcmNotification } from './fcm.js';

export const MAX_DELIVERY_ATTEMPTS = 3;
const INITIAL_BACKOFF_MS = 50;
const INVALID_TOKEN_CODES = new Set([
  'Unregistered',
  'BadDeviceToken',
  'DeviceTokenNotForTopic',
  'MissingDeviceToken',
  'APNS_SEND_FAILED',
  'APNS_INVALID_TOKEN',
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

export async function createNotification(
  input: NotificationCreateInput,
): Promise<NotificationCreateResult> {
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

  const { notification, deliveries } = await prisma.$transaction(async (tx) => {
    const notification = await tx.notification.create({
      data: {
        title: data.title,
        body: data.body,
        imageUrl: data.imageUrl,
        customData: (data.customData ?? null) as Prisma.InputJsonValue,
      },
    });

    const deliveryRecords = await Promise.all(
      devices.map((device) =>
        tx.deliveryLog.create({
          data: {
            notificationId: notification.id,
            deviceId: device.id,
            status: DeliveryStatus.PENDING,
          },
          select: {
            id: true,
            deviceId: true,
          },
        }),
      ),
    );

    return { notification, deliveries: deliveryRecords };
  });

  void dispatchDeliveries({
    notification,
    devices,
    deliveries,
    payload: data,
  });

  return {
    notificationId: notification.id,
    deliveryLogs: deliveries.map((delivery) => ({
      deviceId: delivery.deviceId,
      status: DeliveryStatus.PENDING,
    })),
  };
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

export async function dispatchDeliveries({
  notification,
  devices,
  deliveries,
  payload,
}: {
  notification: {
    id: string;
    title: string;
    body: string;
    imageUrl: string | null;
    customData: Prisma.InputJsonValue | null;
  };
  devices: Array<{ id: string; token: string; platform: Platform }>;
  deliveries: Array<{ id: string; deviceId: string }>;
  payload: NotificationCreateInput;
}) {
  await Promise.allSettled(
    deliveries.map(async (delivery) => {
      const device = devices.find((d) => d.id === delivery.deviceId);
      if (!device) {
        return;
      }

      let attempt = 0;
      while (attempt < MAX_DELIVERY_ATTEMPTS) {
        const attemptStartedAt = new Date();
        try {
          if (device.platform === Platform.IOS) {
            await sendApnsNotification({
              token: device.token,
              title: notification.title,
              body: notification.body,
              imageUrl: notification.imageUrl ?? undefined,
              customData: payload.customData ?? undefined,
            });
          } else {
            await sendFcmNotification({
              token: device.token,
              title: notification.title,
              body: notification.body,
              imageUrl: notification.imageUrl ?? undefined,
              customData: payload.customData ?? undefined,
            });
          }

          await updateDeliveryStatus({
            deliveryId: delivery.id,
            status: DeliveryStatus.SUCCESS,
            retryCount: attempt,
            errorCode: null,
            errorMessage: null,
            lastAttemptAt: attemptStartedAt,
            nextAttemptAt: null,
            lastErrorAt: null,
            deliveredAt: attemptStartedAt,
          });
          return;
        } catch (error) {
          attempt += 1;
          const isLastAttempt = attempt >= MAX_DELIVERY_ATTEMPTS;
          const message = error instanceof Error ? error.message : String(error);
          const code =
            error instanceof NotificationProviderError ||
            error instanceof NotificationConfigurationError
              ? error.code
              : undefined;
          const backoff = INITIAL_BACKOFF_MS * 2 ** (attempt - 1);

          await updateDeliveryStatus({
            deliveryId: delivery.id,
            status: isLastAttempt ? DeliveryStatus.FAILED : DeliveryStatus.PENDING,
            errorCode: code ?? 'DELIVERY_FAILED',
            errorMessage: message,
            retryCount: attempt,
            lastAttemptAt: attemptStartedAt,
            lastErrorAt: attemptStartedAt,
            nextAttemptAt: isLastAttempt ? null : new Date(attemptStartedAt.getTime() + backoff),
          });

          if (isLastAttempt) {
            if (code && INVALID_TOKEN_CODES.has(code)) {
              try {
                await deleteDevice(device.token);
              } catch (deleteError) {
                // device might already be deleted; log and continue
                if (deleteError instanceof Error) {
                  console.warn(
                    `Failed to delete device token ${device.token}: ${deleteError.message}`,
                  );
                }
              }
            }
            return;
          }

          await delay(backoff);
        }
      }
    }),
  );
}
