import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { loadEnv, resetEnvCache } from '../../src/config/env.js';

describe('loadEnv', () => {
  beforeEach(() => {
    resetEnvCache();
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
    delete process.env.API_KEY;
  });

  it('throws when required env vars are missing', () => {
    delete process.env.DATABASE_URL;
    delete process.env.API_KEY;

    expect(() => loadEnv()).toThrowError(/Invalid environment configuration/);
  });

  it('returns parsed env when required vars provided', () => {
    process.env.DATABASE_URL = 'https://example.com';
    process.env.API_KEY = 'secret';

    const env = loadEnv();
    expect(env.API_KEY).toBe('secret');
    expect(env.DATABASE_URL).toBe('https://example.com');
  });
});
