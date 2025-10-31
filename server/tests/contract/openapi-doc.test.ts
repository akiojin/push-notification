import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { resetEnvCache } from '../../src/config/env.js';
import { loadOpenApiDocument, resetOpenApiCache } from '../../src/config/openapi.js';
import { buildServer } from '../../src/server.js';

describe('contract: GET /docs/json', () => {
  const originalEnv = { ...process.env };
  let app: Awaited<ReturnType<typeof buildServer>>['app'];

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.API_KEY = 'test-key';
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';

    resetEnvCache();
    resetOpenApiCache();

    const built = await buildServer();
    app = built.app;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    process.env = originalEnv;
    resetEnvCache();
    resetOpenApiCache();
  });

  it('returns the OpenAPI document defined in specs', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/docs/json',
    });

    expect(response.statusCode).toBe(200);
    const specification = loadOpenApiDocument();
    expect(response.json()).toEqual(specification);
  });
});
