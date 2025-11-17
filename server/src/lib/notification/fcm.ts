import { readFileSync } from 'node:fs';
import path from 'node:path';

import { App, cert, deleteApp, getApps, initializeApp, ServiceAccount } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

import { loadEnv } from '../../config/env.js';
import { NotificationConfigurationError, NotificationProviderError } from './errors.js';

type RawServiceAccount = {
  project_id: string;
  private_key: string;
  client_email: string;
};

let firebaseApp: App | null = null;

function isRawServiceAccount(value: unknown): value is RawServiceAccount {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const account = value as Record<string, unknown>;
  return (
    typeof account.project_id === 'string' &&
    typeof account.private_key === 'string' &&
    typeof account.client_email === 'string'
  );
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
  const credentialsJson: unknown = JSON.parse(readFileSync(credentialsPath, 'utf8'));

  if (!isRawServiceAccount(credentialsJson)) {
    throw new NotificationConfigurationError('Invalid FCM credentials: missing required fields');
  }
  const serviceAccount: ServiceAccount = {
    projectId: credentialsJson.project_id,
    clientEmail: credentialsJson.client_email,
    privateKey: credentialsJson.private_key,
  };

  if (mockUrl) {
    const emulatorHost = new URL(mockUrl).host;
    process.env.FIREBASE_EMULATOR_HOST = emulatorHost;
    process.env.FIREBASE_EMULATOR_ORIGIN = mockUrl;
  }

  firebaseApp = initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.projectId,
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
      data: payload.customData
        ? Object.fromEntries(
            Object.entries(payload.customData).map(([key, value]) => [key, String(value)]),
          )
        : undefined,
    });
  } catch (error) {
    if (
      error instanceof NotificationProviderError ||
      error instanceof NotificationConfigurationError
    ) {
      throw error;
    }
    const firebaseCode =
      (error as { code?: string; errorInfo?: { code?: string } }).code ??
      (error as { errorInfo?: { code?: string } }).errorInfo?.code;
    const message = error instanceof Error ? error.message : String(error);
    throw new NotificationProviderError(`FCM send error: ${message}`, firebaseCode, payload.token);
  }
}

export async function resetFirebaseApp() {
  const apps = getApps();
  for (const app of apps) {
    await deleteApp(app).catch(() => undefined);
  }
  firebaseApp = null;
}
