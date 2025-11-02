import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/device/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/device/index.js')>();
  return {
    ...actual,
    upsertDevice: vi.fn(async (input) => ({
      id: `device-${input.token}`,
      token: input.token,
      platform: input.platform,
      playerAccountId: input.playerAccountId ?? null,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
    })),
    findDeviceByToken: vi.fn(async (token: string) =>
      token === 'missing'
        ? null
        : {
            id: `device-${token}`,
            token,
            platform: 'IOS',
            playerAccountId: 'player-1',
            createdAt: new Date('2025-01-01T00:00:00Z'),
            updatedAt: new Date('2025-01-01T00:00:00Z'),
          }
    ),
    listNotificationsByDevice: vi.fn(async () => []),
    deleteDevice: vi.fn(async () => undefined),
  };
});

import { buildServer } from '../../src/server.js';
import {
  upsertDevice,
  findDeviceByToken,
  listNotificationsByDevice,
  deleteDevice,
} from '../../src/lib/device/index.js';

const mockedUpsert = vi.mocked(upsertDevice);
const mockedFind = vi.mocked(findDeviceByToken);
const mockedList = vi.mocked(listNotificationsByDevice);
const mockedDelete = vi.mocked(deleteDevice);

describe('story-2 device lifecycle', () => {
  const originalEnv = { ...process.env };
  let app: Awaited<ReturnType<typeof buildServer>>['app'];

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.API_KEY = 'story-key';
    process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/test';

    const built = await buildServer();
    app = built.app;
  });

  afterAll(async () => {
    await app.close();
    process.env = originalEnv;
  });

  beforeEach(() => {
    mockedUpsert.mockClear();
    mockedFind.mockClear();
    mockedList.mockClear();
    mockedDelete.mockClear();
  });

  it('registers, fetches, and deletes device tokens', async () => {
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/tokens',
      headers: { 'x-api-key': 'story-key' },
      payload: {
        token: 'ios-lifecycle-token',
        platform: 'IOS',
        playerAccountId: 'player-1',
      },
    });

    expect(registerResponse.statusCode).toBe(201);
    expect(mockedUpsert).toHaveBeenCalledWith({
      token: 'ios-lifecycle-token',
      platform: 'IOS',
      playerAccountId: 'player-1',
    });

    const fetchResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/tokens/ios-lifecycle-token',
      headers: { 'x-api-key': 'story-key' },
    });

    expect(fetchResponse.statusCode).toBe(200);
    expect(mockedFind).toHaveBeenCalledWith('ios-lifecycle-token');
    expect(mockedList).toHaveBeenCalled();

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: '/api/v1/tokens/ios-lifecycle-token',
      headers: { 'x-api-key': 'story-key' },
    });

    expect(deleteResponse.statusCode).toBe(204);
    expect(mockedDelete).toHaveBeenCalledWith('ios-lifecycle-token');

    const missingResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/tokens/missing',
      headers: { 'x-api-key': 'story-key' },
    });

    expect(missingResponse.statusCode).toBe(404);
  });
});
