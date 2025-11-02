import { afterAll, beforeAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

let container: StartedPostgreSqlContainer | undefined;

beforeAll(async () => {
  if (process.env.DATABASE_URL) {
    process.env.API_KEY = process.env.API_KEY ?? 'test-key';
    return;
  }

  try {
    container = await new PostgreSqlContainer().start();
    process.env.DATABASE_URL = container.getConnectionUri();
  } catch (error) {
    console.warn('Testcontainers PostgreSQL was not started:', error);
  } finally {
    process.env.API_KEY = process.env.API_KEY ?? 'test-key';
  }
});

afterAll(async () => {
  if (container) {
    await container.stop();
  }
});
