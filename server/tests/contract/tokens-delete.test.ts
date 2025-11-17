import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

vi.mock('../../src/lib/device/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/device/index.js')>();
  return {
    ...actual,
    deleteDevice: vi.fn(async (token: string) => {
      if (token === 'missing') {
        throw new Prisma.PrismaClientKnownRequestError(
          'Record to delete does not exist.',
          'P2025',
          Prisma.prismaVersion.client,
        );
      }
      return undefined;
    }),
  };
});

import { buildServer } from '../../src/server.js';
import { resetEnvCache } from '../../src/config/env.js';

describe('contract: DELETE /api/v1/tokens/:token', () => {
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

  it('returns 204 for existing token deletion', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/tokens/existing',
      headers: {
        'x-api-key': 'test-key',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe('');
  });

  it('returns 204 even when record missing (idempotent)', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/tokens/missing',
      headers: {
        'x-api-key': 'test-key',
      },
    });

    expect(response.statusCode).toBe(204);
  });
});
