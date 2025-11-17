import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/notification/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/notification/index.js')>();
  return {
    ...actual,
    getNotificationWithDeliveries: vi.fn(),
  };
});

import { buildServer } from '../../src/server.js';
import { getNotificationWithDeliveries } from '../../src/lib/notification/index.js';

const mockedGetNotification = vi.mocked(getNotificationWithDeliveries);

describe('story-3 delivery status', () => {
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
    mockedGetNotification.mockReset();
  });

  it('returns delivery details when notification exists', async () => {
    const notificationId = 'a0d0f0c0-1234-4abc-8def-1234567890ab';

    mockedGetNotification.mockResolvedValueOnce({
      id: notificationId,
      title: 'Title',
      body: 'Body',
      imageUrl: null,
      customData: null,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      deliveries: [
        {
          deviceId: 'device-1',
          status: 'FAILED',
          errorCode: 'Unregistered',
          errorMessage: 'Token invalid',
          deliveredAt: null,
          createdAt: new Date('2025-01-01T00:01:00Z'),
          device: {
            id: 'device-1',
            token: 'token-1',
            platform: 'IOS',
            playerAccountId: 'player-1',
            createdAt: new Date('2025-01-01T00:00:00Z'),
            updatedAt: new Date('2025-01-01T00:00:00Z'),
          },
          notification: {
            id: notificationId,
            title: 'Title',
            body: 'Body',
            imageUrl: null,
            customData: null,
            createdAt: new Date('2025-01-01T00:00:00Z'),
          },
        },
      ],
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/notifications/${notificationId}`,
      headers: { 'x-api-key': 'story-key' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      notificationId,
      title: 'Title',
      body: 'Body',
      imageUrl: null,
      customData: null,
      createdAt: '2025-01-01T00:00:00.000Z',
      deliveryLogs: [
        {
          deviceId: 'device-1',
          status: 'FAILED',
          errorCode: 'Unregistered',
          errorMessage: 'Token invalid',
          sentAt: '2025-01-01T00:01:00.000Z',
          deliveredAt: null,
        },
      ],
    });
    expect(mockedGetNotification).toHaveBeenCalledWith(notificationId);
  });

  it('returns 404 when notification is missing', async () => {
    mockedGetNotification.mockResolvedValueOnce(null);

    const urlId = '00000000-0000-4000-8000-000000000000';

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/notifications/${urlId}`,
      headers: { 'x-api-key': 'story-key' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Notification not found',
      },
    });
    expect(mockedGetNotification).toHaveBeenCalledWith(urlId);
  });

  it('returns 400 when notification id is not a UUID', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications/not-a-uuid',
      headers: { 'x-api-key': 'story-key' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
      },
    });
    expect(mockedGetNotification).not.toHaveBeenCalled();
  });
});
