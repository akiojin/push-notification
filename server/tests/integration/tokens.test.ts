import { Prisma } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/device/index.js', () => ({
  upsertDevice: vi.fn(async (input: { token: string; platform: string; playerAccountId?: string }) => ({
    id: 'device-id',
    ...input
  })),
  deleteDevice: vi.fn(async () => undefined)
}));

import { buildServer } from '../../src/server.js';
import { deleteDevice, upsertDevice } from '../../src/lib/device/index.js';

const mockedUpsert = vi.mocked(upsertDevice);
const mockedDelete = vi.mocked(deleteDevice);

describe('tokens routes', () => {
  const originalEnv = { ...process.env };
  let app: Awaited<ReturnType<typeof buildServer>>['app'];

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.API_KEY = 'test-key';
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';

    const built = await buildServer();
    app = built.app;
  });

  afterAll(async () => {
    await app.close();
    process.env = originalEnv;
  });

  beforeEach(() => {
    mockedUpsert.mockClear();
    mockedDelete.mockClear();
  });

  it('creates or updates a device token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/tokens',
      headers: {
        'x-api-key': 'test-key'
      },
      payload: {
        token: 'abc',
        platform: 'IOS'
      }
    });

    expect(response.statusCode).toBe(201);
    expect(mockedUpsert).toHaveBeenCalledWith({ token: 'abc', platform: 'IOS' });
    expect(response.json()).toHaveProperty('id', 'device-id');
  });

  it('deletes a device token and ignores missing records', async () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      'Record to delete does not exist.',
      'P2025',
      Prisma.prismaVersion.client
    );

    mockedDelete.mockRejectedValueOnce(prismaError);

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/tokens/missing',
      headers: {
        'x-api-key': 'test-key'
      }
    });

    expect(response.statusCode).toBe(204);
    expect(mockedDelete).toHaveBeenCalledWith('missing');
  });
});
