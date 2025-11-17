import { Notification as ApnNotification, Provider as ApnProvider } from 'apn';

import { loadEnv } from '../../config/env.js';
import { NotificationConfigurationError, NotificationProviderError } from './errors.js';

let provider: ApnProvider | null = null;

function getProvider() {
  if (provider) {
    return provider;
  }

  const env = loadEnv();
  if (!env.APNS_PRIVATE_KEY || !env.APNS_KEY_ID || !env.APNS_TEAM_ID || !env.APNS_BUNDLE_ID) {
    throw new NotificationConfigurationError('Missing APNs configuration');
  }

  provider = new ApnProvider({
    token: {
      key: env.APNS_PRIVATE_KEY.replace(/\\n/g, '\n'),
      keyId: env.APNS_KEY_ID,
      teamId: env.APNS_TEAM_ID,
    },
    production: env.NODE_ENV === 'production',
    ...(process.env.APNS_MOCK_URL
      ? (() => {
          const url = new URL(process.env.APNS_MOCK_URL);
          return {
            address: url.hostname,
            port: Number(url.port) || 443,
            rejectUnauthorized: false,
          };
        })()
      : {}),
  });
  return provider;
}

export interface ApnsPayload {
  token: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  customData?: Record<string, unknown> | null;
}

export async function sendApnsNotification(payload: ApnsPayload) {
  try {
    const env = loadEnv();
    const client = getProvider();
    const notification = new ApnNotification();
    notification.topic = env.APNS_BUNDLE_ID!;
    notification.alert = {
      title: payload.title,
      body: payload.body,
    };

    let payloadData: Record<string, unknown> =
      typeof notification.payload === 'object' && notification.payload !== null
        ? (notification.payload as Record<string, unknown>)
        : {};

    if (payload.imageUrl) {
      notification.aps = {
        'mutable-content': 1,
      };
      payloadData = {
        ...payloadData,
        image: payload.imageUrl,
      };
      notification.payload = payloadData;
    }

    if (payload.customData) {
      payloadData = {
        ...payloadData,
        data: payload.customData,
      };
      notification.payload = payloadData;
    }

    const result = await client.send(notification, payload.token);
    if (result.failed.length > 0) {
      const failure = result.failed[0];
      const reason = failure.response?.reason ?? failure.error?.message ?? 'APNS_SEND_FAILED';
      throw new NotificationProviderError(
        `APNs delivery failed: ${reason}`,
        reason,
        failure.device ?? payload.token,
      );
    }
  } catch (error) {
    if (error instanceof NotificationProviderError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new NotificationProviderError(`APNs send error: ${message}`, undefined, payload.token);
  }
}

export function shutdownApnsProvider() {
  if (provider) {
    provider.shutdown();
    provider = null;
  }
}
