import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { resetEnvCache } from '../../src/config/env.js';
import { buildServer } from '../../src/server.js';

describe('rate limiting', () => {
  const originalEnv = { ...process.env };
  let app: Awaited<ReturnType<typeof buildServer>>['app'];

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.API_KEY = 'test-key';
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.RATE_LIMIT_MAX = '1';
    process.env.RATE_LIMIT_TIME_WINDOW = '1 minute';
    resetEnvCache();

    const built = await buildServer();
    app = built.app;
  });

  afterAll(async () => {
    await app.close();
    process.env = originalEnv;
    resetEnvCache();
  });

  it('returns SPEC error payload when rate limit exceeded', async () => {
    const first = await app.inject({
      method: 'GET',
      url: '/healthz'
    });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({
      method: 'GET',
      url: '/healthz'
    });

    expect(second.statusCode).toBe(429);
    expect(second.headers).toHaveProperty('retry-after');
    expect(second.json()).toMatchObject({
      statusCode: 429,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: expect.stringContaining('Rate limit exceeded'),
        details: {
          retryAfter: expect.anything()
        }
      }
    });
  });
});
