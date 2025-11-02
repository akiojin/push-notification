import { Platform } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '../prisma.js';

const deviceUpsertSchema = z.object({
  token: z.string().min(1),
  platform: z.nativeEnum(Platform),
  playerAccountId: z.string().min(1).optional(),
});

export type DeviceUpsertInput = z.infer<typeof deviceUpsertSchema>;

export async function upsertDevice(input: DeviceUpsertInput) {
  const data = deviceUpsertSchema.parse(input);
  return prisma.device.upsert({
    where: { token: data.token },
    create: {
      token: data.token,
      platform: data.platform,
      playerAccountId: data.playerAccountId,
    },
    update: {
      platform: data.platform,
      playerAccountId: data.playerAccountId,
    },
  });
}

export async function deleteDevice(token: string) {
  return prisma.device.delete({
    where: { token },
  });
}

export async function findDeviceByToken(token: string) {
  return prisma.device.findUnique({
    where: { token },
  });
}

export async function listNotificationsByDevice(deviceId: string) {
  return prisma.deliveryLog.findMany({
    where: { deviceId },
    include: { notification: true },
    orderBy: { createdAt: 'desc' },
  });
}

const deviceUpdateSchema = z
  .object({
    token: z.string().min(1).optional(),
    platform: z.nativeEnum(Platform).optional(),
    playerAccountId: z.string().min(1).nullable().optional(),
  })
  .refine(
    (data) =>
      data.token !== undefined ||
      data.platform !== undefined ||
      Object.prototype.hasOwnProperty.call(data, 'playerAccountId'),
    {
      message: 'At least one field must be provided',
    },
  );

export type DeviceUpdateInput = z.infer<typeof deviceUpdateSchema>;

export async function updateDevice(existingToken: string, input: DeviceUpdateInput) {
  const data = deviceUpdateSchema.parse(input);

  return prisma.device.update({
    where: { token: existingToken },
    data: {
      ...(data.token !== undefined ? { token: data.token } : {}),
      ...(data.platform !== undefined ? { platform: data.platform } : {}),
      ...(Object.prototype.hasOwnProperty.call(data, 'playerAccountId')
        ? { playerAccountId: data.playerAccountId ?? null }
        : {}),
    },
  });
}
