import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  config({ path: envPath });
} else {
  config();
}

const requiredVariables = ['DATABASE_URL', 'API_KEY'];
const missing = requiredVariables.filter((name) => {
  const value = process.env[name];
  return value === undefined || String(value).trim().length === 0;
});

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const optionalVariables = [
  'RATE_LIMIT_MAX',
  'RATE_LIMIT_TIME_WINDOW',
  'DELIVERY_RETRY_INTERVAL_MS',
  'DELIVERY_RETRY_BATCH_SIZE',
  'APNS_KEY_ID',
  'APNS_TEAM_ID',
  'APNS_BUNDLE_ID',
  'APNS_PRIVATE_KEY',
  'FCM_CREDENTIALS',
];

const unsetOptional = optionalVariables.filter((name) => process.env[name] === undefined);

if (unsetOptional.length > 0) {
  console.warn(
    `Optional environment variables not set: ${unsetOptional.join(', ')}. Default values or platform-specific features may be disabled.`,
  );
}

console.log('Environment validation passed.');
