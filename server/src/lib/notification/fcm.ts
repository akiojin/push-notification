import { readFileSync } from 'node:fs';
import path from 'node:path';

import { App, initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

import { loadEnv } from '../../config/env.js';
import { NotificationConfigurationError, NotificationProviderError } from './errors.js';

let firebaseApp: App | null = null;

function getMessagingBaseUrl() {
  const env = loadEnv();
  const baseUrl = process.env.FCM_MOCK_URL;
  return baseUrl ?? 'https://fcm.googleapis.com';
}

function ensureFirebaseApp() {
  if (firebaseApp) {
    return firebaseApp;
  }

  const env = loadEnv();
  const mockUrl = process.env.FCM_MOCK_URL;
  if (!env.FCM_CREDENTIALS) {
    throw new NotificationConfigurationError('Missing FCM configuration');
  }

  const credentialsPath = path.resolve(env.FCM_CREDENTIALS);
  const credentialsJson = JSON.parse(readFileSync(credentialsPath, 'utf8'));

  if (mockUrl) {
    const emulatorHost = new URL(mockUrl).host;
    process.env.FIREBASE_EMULATOR_HOST = emulatorHost;
    process.env.FIREBASE_EMULATOR_ORIGIN = mockUrl;
  }

  firebaseApp = initializeApp({
    credential: cert(credentialsJson),
    projectId: credentialsJson.project_id,
  });
  return firebaseApp;
}

export interface FcmPayload {
  token: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  customData?: Record<string, unknown> | null;
}

export async function sendFcmNotification(payload: FcmPayload) {
  try {
    const app = ensureFirebaseApp();
    const messaging = getMessaging(app);

    await messaging.send({
      token: payload.token,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl ?? undefined,
      },
      data: payload.customData ? Object.fromEntries(Object.entries(payload.customData).map(([key, value]) => [key, String(value)])) : undefined,
    },
    // options
    process.env.FCM_MOCK_URL
      ? {
          // Workaround: firebase-admin SDK doesn't expose direct base URL override.
          // Instead, we temporarily set emulator host via environment variable.
          // This block is left empty because the actual override uses env var below.
        }
      : undefined);
  } catch (error) {
    if (error instanceof NotificationProviderError || error instanceof NotificationConfigurationError) {
      throw error;
    }
    const firebaseCode = (error as { code?: string; errorInfo?: { code?: string } }).code ??
      (error as { errorInfo?: { code?: string } }).errorInfo?.code;
    const message = error instanceof Error ? error.message : String(error);
    throw new NotificationProviderError(`FCM send error: ${message}`, firebaseCode, payload.token);
  }
}

export function resetFirebaseApp() {
  const apps = getApps();
  for (const app of apps) {
    app.delete().catch(() => undefined);
  }
  firebaseApp = null;
}
