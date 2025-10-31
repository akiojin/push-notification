import { Prisma } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/device/index.js', () => ({
  upsertDevice: vi.fn(async (input: { token: string; platform: string; playerAccountId?: string }) => ({
    id: 'device-id',
    token: input.token,
    platform: input.platform,
    playerAccountId: input.playerAccountId ?? null,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-02T00:00:00Z')
  })),
  deleteDevice: vi.fn(async () => undefined),
  findDeviceByToken: vi.fn(async (token: string) =>
    token === 'missing'
      ? null
      : {
          id: 'device-id',
          token,
          platform: 'IOS',
          playerAccountId: 'player-1',
          createdAt: new Date('2025-01-01T00:00:00Z'),
          updatedAt: new Date('2025-01-02T00:00:00Z')
        }
  ),
  listNotificationsByDevice: vi.fn(async () => [
    {
      id: 'delivery-id',
      notificationId: 'notif-id',
      deviceId: 'device-id',
      status: 'SUCCESS',
      errorCode: null,
      errorMessage: null,
      deliveredAt: new Date('2025-01-03T00:00:00Z'),
      createdAt: new Date('2025-01-03T00:00:00Z'),
      updatedAt: new Date('2025-01-03T00:00:00Z'),
      notification: {
        id: 'notif-id',
        title: 'Hello',
        body: 'World',
        imageUrl: null,
        customData: null,
        createdAt: new Date('2025-01-01T00:00:00Z')
      }
    }
  ])
}));

import { buildServer } from '../../src/server.js';
import {
  deleteDevice,
  findDeviceByToken,
  listNotificationsByDevice,
  upsertDevice
} from '../../src/lib/device/index.js';

const mockedUpsert = vi.mocked(upsertDevice);
const mockedDelete = vi.mocked(deleteDevice);
const mockedFind = vi.mocked(findDeviceByToken);
const mockedList = vi.mocked(listNotificationsByDevice);

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
    mockedFind.mockClear();
    mockedList.mockClear();
  });

  it('retrieves device by token with deliveries', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/tokens/device-token',
      headers: {
        'x-api-key': 'test-key'
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('id', 'device-id');
    expect(body).toHaveProperty('deliveries');
    expect(Array.isArray(body.deliveries)).toBe(true);
    expect(body.deliveries[0]).toHaveProperty('notification');
    expect(mockedFind).toHaveBeenCalledWith('device-token');
    expect(mockedList).toHaveBeenCalledWith('device-id');
  });

  it('returns 404 when device token not found', async () => {
    mockedFind.mockResolvedValueOnce(null);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/tokens/missing',
      headers: {
        'x-api-key': 'test-key'
      }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Token not found',
      },
    });
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
    expect(response.json()).toEqual({
      id: 'device-id',
      token: 'abc',
      platform: 'IOS',
      playerAccountId: null,
      createdAt: new Date('2025-01-01T00:00:00Z').toISOString(),
      updatedAt: new Date('2025-01-02T00:00:00Z').toISOString()
    });
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
