import { access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';

import { afterAll, beforeAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

let container: StartedPostgreSqlContainer | undefined;
let dockerAvailable: boolean | null = null;
let hasLoggedWarning = false;

async function detectDockerAvailability() {
  if (dockerAvailable !== null) {
    return dockerAvailable;
  }

  if (process.env.DOCKER_HOST && process.env.DOCKER_HOST.trim().length > 0) {
    dockerAvailable = true;
    return dockerAvailable;
  }

  const socketCandidates = [
    process.env.DOCKER_SOCKET ?? '/var/run/docker.sock',
    '/var/run/podman/podman.sock',
  ];

  for (const socketPath of socketCandidates) {
    if (!socketPath) {
      continue;
    }
    try {
      await access(socketPath, fsConstants.R_OK | fsConstants.W_OK);
      dockerAvailable = true;
      return dockerAvailable;
    } catch {
      // Continue checking other candidates
    }
  }

  dockerAvailable = false;
  return dockerAvailable;
}

function logWarningOnce(message: string, error?: unknown) {
  if (hasLoggedWarning) {
    return;
  }
  hasLoggedWarning = true;
  if (error) {
    console.warn(message, error);
  } else {
    console.warn(message);
  }
}

beforeAll(async () => {
  if (process.env.DATABASE_URL) {
    process.env.API_KEY = process.env.API_KEY ?? 'test-key';
    return;
  }

  const dockerReady = await detectDockerAvailability();

  if (!dockerReady) {
    process.env.TESTCONTAINERS_DISABLE = 'true';
    logWarningOnce('Skipping Testcontainers PostgreSQL: Docker socket not accessible.');
    process.env.API_KEY = process.env.API_KEY ?? 'test-key';
    return;
  }

  try {
    container = await new PostgreSqlContainer().start();
    process.env.DATABASE_URL = container.getConnectionUri();
  } catch (error) {
    logWarningOnce('Testcontainers PostgreSQL was not started:', error);
  } finally {
    process.env.API_KEY = process.env.API_KEY ?? 'test-key';
  }
});

afterAll(async () => {
  if (container) {
    await container.stop();
  }
});
