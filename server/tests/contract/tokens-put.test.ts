import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('../../src/lib/device/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/device/index.js')>();
  return {
    ...actual,
    updateDevice: vi.fn(async (_existingToken: string, updates: { token?: string; platform?: string; playerAccountId?: string | null }) => ({
      id: '22222222-2222-4222-8222-222222222222',
      token: updates.token ?? 'existing-token',
      platform: updates.platform ?? 'IOS',
      playerAccountId: updates.playerAccountId ?? 'player-1',
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-02T00:00:00Z'),
    })),
  };
});

import { buildServer } from '../../src/server.js';
import { resetEnvCache } from '../../src/config/env.js';
import { updateDevice } from '../../src/lib/device/index.js';

const DeviceResponseSchema = z.object({
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

describe('contract: PUT /api/v1/tokens/:token', () => {
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

  beforeEach(() => {
    vi.mocked(updateDevice).mockClear();
  });

  it('returns DeviceResponse schema when update succeeds', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/tokens/original-token',
      headers: {
        'x-api-key': 'test-key',
      },
      payload: {
        token: 'rotated-token',
        platform: 'ANDROID',
        playerAccountId: 'player-2',
      },
    });

    expect(response.statusCode).toBe(200);
    const parsed = DeviceResponseSchema.safeParse(response.json());
    if (!parsed.success) {
      throw new Error(parsed.error.toString());
    }
    expect(updateDevice).toHaveBeenCalledWith('original-token', {
      token: 'rotated-token',
      platform: 'ANDROID',
      playerAccountId: 'player-2',
    });
  });

  it('returns validation error when body has no fields', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/tokens/original-token',
      headers: {
        'x-api-key': 'test-key',
      },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    const parsed = ErrorResponseSchema.safeParse(response.json());
    if (!parsed.success) {
      throw new Error(parsed.error.toString());
    }
    expect(parsed.data.error.code).toBe('VALIDATION_ERROR');
    expect(updateDevice).not.toHaveBeenCalled();
  });

  it('maps Prisma not-found error to 404 response', async () => {
    vi.mocked(updateDevice).mockRejectedValueOnce(Object.assign(new Error('not found'), { code: 'P2025' }));

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/tokens/missing-token',
      headers: {
        'x-api-key': 'test-key',
      },
      payload: {
        platform: 'IOS',
      },
    });

    expect(response.statusCode).toBe(404);
    const parsed = ErrorResponseSchema.safeParse(response.json());
    if (!parsed.success) {
      throw new Error(parsed.error.toString());
    }
    expect(parsed.data.error.code).toBe('NOT_FOUND');
  });

  it('maps unique constraint violation to conflict response', async () => {
    vi.mocked(updateDevice).mockRejectedValueOnce(Object.assign(new Error('conflict'), { code: 'P2002' }));

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/tokens/original-token',
      headers: {
        'x-api-key': 'test-key',
      },
      payload: {
        token: 'existing-token',
      },
    });

    expect(response.statusCode).toBe(409);
    const parsed = ErrorResponseSchema.safeParse(response.json());
    if (!parsed.success) {
      throw new Error(parsed.error.toString());
    }
    expect(parsed.data.error.code).toBe('TOKEN_CONFLICT');
  });
});
