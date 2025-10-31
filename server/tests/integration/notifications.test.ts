import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/notification/index.js', () => ({
  createNotification: vi.fn()
}));

import { buildServer } from '../../src/server.js';
import { createNotification } from '../../src/lib/notification/index.js';

const mockedCreate = vi.mocked(createNotification);

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
