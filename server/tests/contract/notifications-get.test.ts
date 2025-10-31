import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('../../src/lib/notification/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/notification/index.js')>();
  return {
    ...actual,
    getNotificationWithDeliveries: vi.fn(async (id: string) =>
      id === 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
        ? null
        : {
            id,
            title: 'Hello',
            body: 'World',
            imageUrl: null,
            customData: { action: 'open' },
            createdAt: new Date('2025-01-01T00:00:00Z'),
            deliveries: [
              {
                deviceId: '22222222-2222-4222-8222-222222222222',
                status: 'SUCCESS',
                errorCode: null,
                errorMessage: null,
                deliveredAt: new Date('2025-01-02T00:00:00Z'),
                createdAt: new Date('2025-01-01T12:00:00Z'),
              },
            ],
          },
    ),
  };
});

import { buildServer } from '../../src/server.js';
import { resetEnvCache } from '../../src/config/env.js';

const NotificationStatusSchema = z.object({
  notificationId: z.string().uuid(),
  title: z.string(),
  body: z.string(),
  imageUrl: z.string().url().nullable(),
  customData: z.any().nullable(),
  createdAt: z.string().datetime(),
  deliveryLogs: z.array(
    z.object({
      deviceId: z.string().uuid(),
      status: z.enum(['PENDING', 'SUCCESS', 'FAILED']),
      errorCode: z.string().nullable(),
      errorMessage: z.string().nullable(),
      sentAt: z.string().datetime(),
      deliveredAt: z.string().datetime().nullable(),
    }),
  ),
});

const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

describe('contract: GET /api/v1/notifications/:id', () => {
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

  it('returns NotificationStatusResponse schema', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications/11111111-1111-4111-8111-111111111111',
      headers: {
        'x-api-key': 'test-key',
      },
    });

    expect(response.statusCode).toBe(200);
    const parsed = NotificationStatusSchema.safeParse(response.json());
    if (!parsed.success) {
      throw new Error(parsed.error.toString());
    }
  });

  it('returns NOT_FOUND error response for missing id', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
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
