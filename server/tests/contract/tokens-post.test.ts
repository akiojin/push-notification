import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('../../src/lib/device/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/device/index.js')>();
  return {
    ...actual,
    upsertDevice: vi.fn(async (input: { token: string; platform: string; playerAccountId?: string }) => ({
      id: '22222222-2222-4222-8222-222222222222',
      token: input.token,
      platform: input.platform,
      playerAccountId: input.playerAccountId ?? null,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-02T00:00:00Z'),
    })),
  };
});

import { buildServer } from '../../src/server.js';
import { resetEnvCache } from '../../src/config/env.js';

const RegisterTokenResponseSchema = z.object({
  id: z.string().uuid(),
  token: z.string().min(1),
  platform: z.enum(['IOS', 'ANDROID']),
  playerAccountId: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

describe('contract: POST /api/v1/tokens', () => {
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

  it('returns DeviceResponse schema on success', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/tokens',
      headers: {
        'x-api-key': 'test-key',
      },
      payload: {
        token: 'device-token',
        platform: 'IOS',
      },
    });

    expect(response.statusCode).toBe(201);
    const parsed = RegisterTokenResponseSchema.safeParse(response.json());
    if (!parsed.success) {
      throw new Error(parsed.error.toString());
    }
  });

  it('returns validation error payload when body invalid', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/tokens',
      headers: {
        'x-api-key': 'test-key',
      },
      payload: {
        platform: 'IOS',
      },
    });

    expect(response.statusCode).toBe(400);
    const parsed = ErrorResponseSchema.safeParse(response.json());
    if (!parsed.success) {
      throw new Error(parsed.error.toString());
    }
    expect(parsed.data.error.code).toBe('VALIDATION_ERROR');
  });
});
