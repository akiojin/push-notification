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
  };
});

vi.mock('../../src/lib/notification/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/notification/index.js')>();
  return {
    ...actual,
    createNotification: vi.fn(async (payload) => ({
      notificationId: '2f8585f4-3a92-4b6c-8e62-4aa8bdc51c60',
      deliveryLogs: payload.tokens.map((token) => ({
        deviceId: `device-${token}`,
        status: 'PENDING',
      })),
    })),
    getNotificationWithDeliveries: vi.fn(),
  };
});

import { buildServer } from '../../src/server.js';
import { upsertDevice } from '../../src/lib/device/index.js';
import { createNotification } from '../../src/lib/notification/index.js';

const mockedUpsert = vi.mocked(upsertDevice);
const mockedCreateNotification = vi.mocked(createNotification);

describe('story-1 realtime notification', () => {
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
    mockedCreateNotification.mockClear();
  });

  it('registers multiple devices and sends rich notification payload', async () => {
    const registerPayloads = [
      { token: 'ios-token', platform: 'IOS', playerAccountId: 'player-1' },
      { token: 'android-token', platform: 'ANDROID', playerAccountId: 'player-1' },
    ];

    for (const payload of registerPayloads) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tokens',
        headers: { 'x-api-key': 'story-key' },
        payload,
      });

      expect(response.statusCode).toBe(201);
    }

    expect(mockedUpsert).toHaveBeenCalledTimes(2);
    expect(mockedUpsert).toHaveBeenCalledWith({ token: 'ios-token', platform: 'IOS', playerAccountId: 'player-1' });
    expect(mockedUpsert).toHaveBeenCalledWith({ token: 'android-token', platform: 'ANDROID', playerAccountId: 'player-1' });

    const notificationPayload = {
      title: 'New Raid Available! ⚔️',
      body: 'Join the raid within 5 minutes to earn double rewards.',
      tokens: ['ios-token', 'android-token'],
      imageUrl: 'https://cdn.example.com/events/raid.png',
      customData: {
        action: 'open_raid',
        raidId: 'raid-123',
        expiresAt: '2025-11-02T09:00:00Z',
      },
    } as const;

    const notificationResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications',
      headers: { 'x-api-key': 'story-key' },
      payload: notificationPayload,
    });

    expect(notificationResponse.statusCode).toBe(202);
    expect(notificationResponse.json()).toEqual({
      notificationId: '2f8585f4-3a92-4b6c-8e62-4aa8bdc51c60',
      deliveryLogs: [
        { deviceId: 'device-ios-token', status: 'PENDING' },
        { deviceId: 'device-android-token', status: 'PENDING' },
      ],
    });

    expect(mockedCreateNotification).toHaveBeenCalledWith(notificationPayload);
  });
});
