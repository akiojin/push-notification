import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/device/index.js', () => ({
  upsertDevice: vi.fn(),
  updateDevice: vi.fn(),
  deleteDevice: vi.fn(),
  findDeviceByToken: vi.fn(),
  listNotificationsByDevice: vi.fn(),
}));

const { buildServer } = await import('../../src/server.js');
const deviceModule = await import('../../src/lib/device/index.js');
const upsertDeviceMock = vi.mocked(deviceModule.upsertDevice);

let server: Awaited<ReturnType<typeof buildServer>>['app'];

describe('tokens routes validation', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.API_KEY = 'test';
    process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/test';

    const built = await buildServer();
    server = built.app;
  });

  afterAll(async () => {
    await server.close();
  });

  it('returns 400 for invalid payload', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/tokens',
      headers: {
        'x-api-key': 'test',
      },
      payload: {
        token: '',
        platform: 'IOS',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(upsertDeviceMock).not.toHaveBeenCalled();
  });
});
