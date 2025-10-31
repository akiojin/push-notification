import type { LoggerOptions } from 'pino';

import { loadEnv } from './env.js';

let cachedOptions: LoggerOptions | null = null;

export function getLoggerOptions(): LoggerOptions {
  if (cachedOptions) {
    return cachedOptions;
  }

  const env = loadEnv();
  cachedOptions = {
    level: env.LOG_LEVEL,
    transport:
      env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
          }
        : undefined,
  };
  return cachedOptions;
}

export function resetLoggerOptions() {
  cachedOptions = null;
}
