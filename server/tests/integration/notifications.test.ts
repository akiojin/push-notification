import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/notification/index.js', () => ({
  createNotification: vi.fn(),
  getNotificationWithDeliveries: vi.fn()
}));

import { buildServer } from '../../src/server.js';
import { createNotification, getNotificationWithDeliveries } from '../../src/lib/notification/index.js';

const mockedCreate = vi.mocked(createNotification);
const mockedGet = vi.mocked(getNotificationWithDeliveries);

describe('notifications routes', () => {
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
    mockedCreate.mockReset();
    mockedGet.mockReset();
  });

  it('returns notification status by id', async () => {
    mockedGet.mockResolvedValueOnce({
      id: '11111111-1111-1111-8111-111111111111',
      title: 'Hello',
      body: 'World',
      imageUrl: null,
      customData: null,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      deliveries: [
        {
          deviceId: 'device-id',
          status: 'SUCCESS',
          errorCode: null,
          errorMessage: null,
          deliveredAt: new Date('2025-01-02T00:00:00Z'),
          createdAt: new Date('2025-01-02T00:00:00Z')
        }
      ]
    } as never);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications/11111111-1111-1111-8111-111111111111',
      headers: {
        'x-api-key': 'test-key'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(mockedGet).toHaveBeenCalledWith('11111111-1111-1111-8111-111111111111');
    expect(response.json()).toHaveProperty('notificationId', '11111111-1111-1111-8111-111111111111');
  });

  it('returns 404 when notification not found', async () => {
    mockedGet.mockResolvedValueOnce(null);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications/00000000-0000-0000-0000-000000000000',
      headers: {
        'x-api-key': 'test-key'
      }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'Notification not found' });
  });

  it('creates notification and returns id', async () => {
    mockedCreate.mockResolvedValueOnce({ id: 'notif-id' });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications',
      headers: {
        'x-api-key': 'test-key'
      },
      payload: {
        title: 'Hello',
        body: 'World',
        deviceTokens: ['abc']
      }
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ id: 'notif-id' });
    expect(mockedCreate).toHaveBeenCalledWith({
      title: 'Hello',
      body: 'World',
      deviceTokens: ['abc']
    });
  });

  it('returns 400 when device tokens unknown', async () => {
    mockedCreate.mockRejectedValueOnce(new Error('Unknown device tokens: abc'));

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications',
      headers: {
        'x-api-key': 'test-key'
      },
      payload: {
        title: 'Hello',
        body: 'World',
        deviceTokens: ['abc']
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: 'Unknown device tokens: abc' });
  });
});
