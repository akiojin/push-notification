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
