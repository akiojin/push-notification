import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/device/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/device/index.js')>();
  let storedDevice = {
    id: 'device-ios-lifecycle-token',
    token: 'ios-lifecycle-token',
    platform: 'IOS' as const,
    playerAccountId: 'player-1' as string | null,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  };

  return {
    ...actual,
    upsertDevice: vi.fn(async (input: { token: string; platform: 'IOS' | 'ANDROID'; playerAccountId?: string }) => {
      storedDevice = {
        ...storedDevice,
        token: input.token,
        platform: input.platform,
        playerAccountId: input.playerAccountId ?? null,
        updatedAt: new Date('2025-01-01T00:00:01Z'),
      };

      return {
        ...storedDevice,
      };
    }),
    updateDevice: vi.fn(
      async (
        token: string,
        updates: { token?: string; platform?: 'IOS' | 'ANDROID'; playerAccountId?: string | null },
      ) => {
        if (token !== storedDevice.token) {
          const error = new Error('Not found');
          Object.assign(error, { code: 'P2025' });
          throw error;
        }

        storedDevice = {
          ...storedDevice,
          token: updates.token ?? storedDevice.token,
          platform: updates.platform ?? storedDevice.platform,
          playerAccountId: Object.prototype.hasOwnProperty.call(updates, 'playerAccountId')
            ? updates.playerAccountId ?? null
            : storedDevice.playerAccountId,
          updatedAt: new Date('2025-01-01T00:00:02Z'),
        };

        return {
          ...storedDevice,
        };
      },
    ),
    findDeviceByToken: vi.fn(async (token: string) => {
      if (token === 'missing') {
        return null;
      }
      if (token === storedDevice.token) {
        return {
          ...storedDevice,
        };
      }
      return null;
    }),
    listNotificationsByDevice: vi.fn(async () => []),
    deleteDevice: vi.fn(async () => undefined),
  };
});

import { buildServer } from '../../src/server.js';
import {
  deleteDevice,
  findDeviceByToken,
  listNotificationsByDevice,
  updateDevice,
  upsertDevice,
} from '../../src/lib/device/index.js';

const mockedUpsert = vi.mocked(upsertDevice);
const mockedUpdate = vi.mocked(updateDevice);
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
    mockedUpdate.mockClear();
    mockedFind.mockClear();
    mockedList.mockClear();
    mockedDelete.mockClear();
  });

  it('registers, updates, fetches, and deletes device tokens', async () => {
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

    const updateResponse = await app.inject({
      method: 'PUT',
      url: '/api/v1/tokens/ios-lifecycle-token',
      headers: { 'x-api-key': 'story-key' },
      payload: {
        token: 'ios-updated-token',
        playerAccountId: 'player-2',
      },
    });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json()).toEqual({
      id: 'device-ios-lifecycle-token',
      token: 'ios-updated-token',
      platform: 'IOS',
      playerAccountId: 'player-2',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:02.000Z',
    });
    expect(mockedUpdate).toHaveBeenCalledWith('ios-lifecycle-token', {
      token: 'ios-updated-token',
      playerAccountId: 'player-2',
    });

    const fetchResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/tokens/ios-updated-token',
      headers: { 'x-api-key': 'story-key' },
    });

    expect(fetchResponse.statusCode).toBe(200);
    expect(mockedFind).toHaveBeenCalledWith('ios-updated-token');
    expect(mockedList).toHaveBeenCalled();

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: '/api/v1/tokens/ios-updated-token',
      headers: { 'x-api-key': 'story-key' },
    });

    expect(deleteResponse.statusCode).toBe(204);
    expect(mockedDelete).toHaveBeenCalledWith('ios-updated-token');

    const missingResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/tokens/missing',
      headers: { 'x-api-key': 'story-key' },
    });

    expect(missingResponse.statusCode).toBe(404);
  });
});
