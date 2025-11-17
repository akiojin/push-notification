#!/usr/bin/env tsx

/**
 * API Key Generation Script
 *
 * Generates a new API key for authentication.
 * Usage:
 *   npm run generate-api-key
 *   or
 *   tsx scripts/generate-api-key.ts
 *
 * Output:
 *   - API Key (UUIDv4 format) - to be used in API requests
 *   - Hashed Key (bcrypt) - to be stored in environment variables
 */

import { randomUUID } from 'node:crypto';
import { hash } from 'bcrypt';

const BCRYPT_ROUNDS = 10;

async function generateApiKey() {
  // Generate UUIDv4 as API key
  const apiKey = randomUUID();

  // Hash the API key using bcrypt
  const hashedKey = await hash(apiKey, BCRYPT_ROUNDS);

  console.log('\n=================================');
  console.log('API Key Generated Successfully!');
  console.log('=================================\n');

  console.log('API Key (use this in API requests):');
  console.log(`  ${apiKey}\n`);

  console.log('Hashed Key (add to .env file):');
  console.log(`  API_KEY=${hashedKey}\n`);

  console.log('Example .env entry:');
  console.log(`  API_KEY=${hashedKey}`);
  console.log('\nIMPORTANT: Store the API Key securely. It cannot be recovered from the hash.');
  console.log('=================================\n');
}

generateApiKey().catch((error) => {
  console.error('Error generating API key:', error);
  process.exit(1);
});
