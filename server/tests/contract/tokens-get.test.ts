import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('../../src/lib/device/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/device/index.js')>();
  return {
    ...actual,
    findDeviceByToken: vi.fn(async (token: string) =>
      token === 'missing'
        ? null
        : {
            id: '22222222-2222-4222-8222-222222222222',
            token,
            platform: 'IOS',
            playerAccountId: 'player-1',
            createdAt: new Date('2025-01-01T00:00:00Z'),
            updatedAt: new Date('2025-01-02T00:00:00Z'),
          },
    ),
    listNotificationsByDevice: vi.fn(async () => [
      {
        id: '33333333-3333-4333-8333-333333333333',
        status: 'SUCCESS',
        errorCode: null,
        errorMessage: null,
        deliveredAt: new Date('2025-01-03T00:00:00Z'),
        createdAt: new Date('2025-01-03T00:00:00Z'),
        notification: {
          id: '11111111-1111-4111-8111-111111111111',
          title: 'Hello',
          body: 'World',
          imageUrl: null,
          customData: null,
          createdAt: new Date('2025-01-01T00:00:00Z'),
        },
      },
    ]),
  };
});

import { buildServer } from '../../src/server.js';
import { resetEnvCache } from '../../src/config/env.js';

const DeviceWithDeliveriesSchema = z.object({
  id: z.string().uuid(),
  token: z.string(),
  platform: z.enum(['IOS', 'ANDROID']),
  playerAccountId: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deliveries: z
    .array(
      z.object({
        id: z.string().uuid(),
        status: z.enum(['PENDING', 'SUCCESS', 'FAILED']),
        errorCode: z.string().nullable(),
        errorMessage: z.string().nullable(),
        deliveredAt: z.string().datetime().nullable(),
        createdAt: z.string().datetime(),
        notification: z.object({
          id: z.string().uuid(),
          title: z.string(),
          body: z.string(),
          imageUrl: z.string().nullable(),
          customData: z.any().nullable(),
          createdAt: z.string().datetime(),
        }),
      }),
    )
    .max(10_000),
});

const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

describe('contract: GET /api/v1/tokens/:token', () => {
  const originalEnv = { ...process.env };
  let app: Awaited<ReturnType<typeof buildServer>>['app'];

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.API_KEY = 'test-key';
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';

    resetEnvCache();

    const built = await buildServer();
    app = built.app;
  });

  afterAll(async () => {
    await app.close();
    process.env = originalEnv;
    resetEnvCache();
  });

  it('returns DeviceWithDeliveriesResponse schema when token exists', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/tokens/device-token',
      headers: {
        'x-api-key': 'test-key',
      },
    });

    expect(response.statusCode).toBe(200);
    const parsed = DeviceWithDeliveriesSchema.safeParse(response.json());
    if (!parsed.success) {
      throw new Error(parsed.error.toString());
    }
  });

  it('returns NotFound error payload when token missing', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/tokens/missing',
      headers: {
        'x-api-key': 'test-key',
      },
    });

    expect(response.statusCode).toBe(404);
    const parsed = ErrorResponseSchema.safeParse(response.json());
    if (!parsed.success) {
      throw new Error(parsed.error.toString());
    }
    expect(parsed.data.error.code).toBe('NOT_FOUND');
  });
});
