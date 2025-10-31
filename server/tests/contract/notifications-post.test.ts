import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('../../src/lib/notification/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/notification/index.js')>();
  return {
    ...actual,
    createNotification: vi.fn(async (input: { tokens: string[] }) => {
      if (input.tokens.includes('unknown')) {
        throw new actual.UnknownDeviceTokensError(['unknown']);
      }
      return {
        notificationId: '11111111-1111-4111-8111-222222222222',
        deliveryLogs: input.tokens.map(() => ({
          deviceId: '22222222-2222-4222-8222-222222222222',
          status: 'PENDING',
        })),
      };
    }),
  };
});

import { buildServer } from '../../src/server.js';
import { resetEnvCache } from '../../src/config/env.js';

const NotificationResponseSchema = z.object({
  notificationId: z.string().uuid(),
  deliveryLogs: z.array(
    z.object({
      deviceId: z.string().uuid(),
      status: z.enum(['PENDING', 'SUCCESS', 'FAILED']),
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

describe('contract: POST /api/v1/notifications', () => {
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

  it('accepts notification and returns NotificationResponse schema', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications',
      headers: {
        'x-api-key': 'test-key',
      },
      payload: {
        title: 'Hello',
        body: 'World',
        tokens: ['44444444-4444-4444-8444-444444444444'],
      },
    });

    expect(response.statusCode).toBe(202);
    const parsed = NotificationResponseSchema.safeParse(response.json());
    if (!parsed.success) {
      throw new Error(parsed.error.toString());
    }
  });

  it('returns validation error when payload invalid', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications',
      headers: {
        'x-api-key': 'test-key',
      },
      payload: {
        body: 'World',
        tokens: [],
      },
    });

    expect(response.statusCode).toBe(400);
    const parsed = ErrorResponseSchema.safeParse(response.json());
    if (!parsed.success) {
      throw new Error(parsed.error.toString());
    }
    expect(parsed.data.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns UNKNOWN_TOKENS when devices not found', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications',
      headers: {
        'x-api-key': 'test-key',
      },
      payload: {
        title: 'Hello',
        body: 'World',
        tokens: ['unknown'],
      },
    });

    expect(response.statusCode).toBe(400);
    const parsed = ErrorResponseSchema.safeParse(response.json());
    if (!parsed.success) {
      throw new Error(parsed.error.toString());
    }
    expect(parsed.data.error.code).toBe('UNKNOWN_TOKENS');
  });
});
