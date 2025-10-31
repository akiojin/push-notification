import { DeliveryStatus, Prisma } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';

import { prisma } from '../lib/prisma.js';
import { dispatchDeliveries, MAX_DELIVERY_ATTEMPTS } from '../lib/notification/index.js';

const DEFAULT_POLL_INTERVAL_MS = 1000;

let timer: NodeJS.Timeout | null = null;
let processing = false;
let stopped = true;

export async function processPendingDeliveries(logger: FastifyBaseLogger) {
  const now = new Date();
  const pending = await prisma.deliveryLog.findMany({
    where: {
      status: DeliveryStatus.PENDING,
      retryCount: {
        lt: MAX_DELIVERY_ATTEMPTS,
      },
      OR: [
        { nextAttemptAt: null },
        {
          nextAttemptAt: {
            lte: now,
          },
        },
      ],
    },
    include: {
      device: true,
      notification: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
    take: 20,
  });

  if (pending.length === 0) {
    return;
  }

  const grouped = new Map<string, typeof pending>();
  for (const delivery of pending) {
    if (!delivery.notification || !delivery.device) {
      continue;
    }
    const existing = grouped.get(delivery.notificationId);
    if (existing) {
      existing.push(delivery);
    } else {
      grouped.set(delivery.notificationId, [delivery]);
    }
  }

  for (const [, deliveries] of grouped) {
    const notification = deliveries[0]?.notification;
    if (!notification) {
      continue;
    }

    const devices = deliveries
      .map((delivery) => delivery.device)
      .filter((device): device is NonNullable<typeof deliveries[number]['device']> => Boolean(device))
      .map((device) => ({
        id: device.id,
        token: device.token,
        platform: device.platform,
      }));

    if (devices.length === 0) {
      continue;
    }

    const customData = notification.customData as Prisma.JsonValue | null;
    const payload = {
      title: notification.title,
      body: notification.body,
      imageUrl: notification.imageUrl ?? undefined,
      customData: (customData && typeof customData === 'object') ? (customData as Record<string, unknown>) : undefined,
      tokens: devices.map((device) => device.token),
    };

    await dispatchDeliveries({
      notification: {
        id: notification.id,
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
        customData: notification.customData,
      },
      devices,
      deliveries: deliveries.map((delivery) => ({
        id: delivery.id,
        deviceId: delivery.deviceId,
      })),
      payload,
    });
  }

  logger.info({ processed: pending.length }, 'delivery retry job processed pending deliveries');
}

export function startDeliveryRetryWorker(logger: FastifyBaseLogger, intervalMs = DEFAULT_POLL_INTERVAL_MS) {
  if (timer) {
    return stopDeliveryRetryWorker;
  }
  stopped = false;

  const tick = async () => {
    if (stopped) {
      return;
    }
    if (processing) {
      timer = setTimeout(tick, intervalMs);
      return;
    }

    processing = true;
    try {
      await processPendingDeliveries(logger);
    } catch (error) {
      logger.error({ err: error }, 'delivery retry job failed');
    } finally {
      processing = false;
      if (!stopped) {
        timer = setTimeout(tick, intervalMs);
      }
    }
  };

  void tick();
  return stopDeliveryRetryWorker;
}

export function stopDeliveryRetryWorker() {
  stopped = true;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}
