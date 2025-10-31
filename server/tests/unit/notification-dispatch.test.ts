import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/notification/apns.js', () => ({
  sendApnsNotification: vi.fn(),
  shutdownApnsProvider: vi.fn(),
}));

vi.mock('../../src/lib/notification/fcm.js', () => ({
  sendFcmNotification: vi.fn(),
  resetFirebaseApp: vi.fn(),
}));

vi.mock('../../src/lib/delivery/index.js', () => ({
  updateDeliveryStatus: vi.fn(),
}));

const { dispatchDeliveries } = await import('../../src/lib/notification/index.js');
const { sendApnsNotification } = await import('../../src/lib/notification/apns.js');
const { sendFcmNotification } = await import('../../src/lib/notification/fcm.js');
const { updateDeliveryStatus } = await import('../../src/lib/delivery/index.js');
const { NotificationProviderError } = await import('../../src/lib/notification/errors.js');

describe('dispatchDeliveries', () => {
  beforeEach(() => {
    vi.mocked(sendApnsNotification).mockReset();
    vi.mocked(sendFcmNotification).mockReset();
    vi.mocked(updateDeliveryStatus).mockReset();
  });

  it('sends notifications to each platform and marks success', async () => {
    vi.mocked(sendApnsNotification).mockResolvedValueOnce(undefined);
    vi.mocked(sendFcmNotification).mockResolvedValueOnce(undefined);

    await dispatchDeliveries({
      notification: {
        id: 'notif-id',
        title: 'Title',
        body: 'Body',
        imageUrl: null,
        customData: null,
      },
      devices: [
        { id: 'ios-device', token: 'apns-token', platform: 'IOS' },
        { id: 'android-device', token: 'fcm-token', platform: 'ANDROID' },
      ],
      deliveries: [
        { id: 'delivery-ios', deviceId: 'ios-device' },
        { id: 'delivery-android', deviceId: 'android-device' },
      ],
      payload: {
        title: 'Title',
        body: 'Body',
        tokens: ['apns-token', 'fcm-token'],
      },
    });

    expect(sendApnsNotification).toHaveBeenCalledWith({
      token: 'apns-token',
      title: 'Title',
      body: 'Body',
      imageUrl: undefined,
      customData: undefined,
    });
    expect(sendFcmNotification).toHaveBeenCalledWith({
      token: 'fcm-token',
      title: 'Title',
      body: 'Body',
      imageUrl: undefined,
      customData: undefined,
    });

    const firstCallArgs = vi.mocked(updateDeliveryStatus).mock.calls[0]?.[0];
    const secondCallArgs = vi.mocked(updateDeliveryStatus).mock.calls[1]?.[0];

    expect(firstCallArgs).toMatchObject({
      deliveryId: 'delivery-ios',
      status: 'SUCCESS',
      retryCount: 0,
      nextAttemptAt: null,
      errorCode: null,
      errorMessage: null,
    });
    expect(firstCallArgs?.lastAttemptAt).toBeInstanceOf(Date);
    expect(firstCallArgs?.deliveredAt).toBeInstanceOf(Date);

    expect(secondCallArgs).toMatchObject({
      deliveryId: 'delivery-android',
      status: 'SUCCESS',
      retryCount: 0,
      nextAttemptAt: null,
      errorCode: null,
      errorMessage: null,
    });
    expect(secondCallArgs?.lastAttemptAt).toBeInstanceOf(Date);
    expect(secondCallArgs?.deliveredAt).toBeInstanceOf(Date);
  });

  it('records failure details when provider throws error', async () => {
    vi.mocked(sendApnsNotification).mockRejectedValue(new NotificationProviderError('boom', 'APNS_ERROR'));

    await dispatchDeliveries({
      notification: {
        id: 'notif-id',
        title: 'Title',
        body: 'Body',
        imageUrl: null,
        customData: null,
      },
      devices: [{ id: 'ios-device', token: 'apns-token', platform: 'IOS' }],
      deliveries: [{ id: 'delivery-ios', deviceId: 'ios-device' }],
      payload: {
        title: 'Title',
        body: 'Body',
        tokens: ['apns-token'],
      },
    });

    expect(sendApnsNotification).toHaveBeenCalledTimes(3);

    const lastCall = vi.mocked(updateDeliveryStatus).mock.calls.at(-1)?.[0];
    expect(lastCall).toMatchObject({
      deliveryId: 'delivery-ios',
      status: 'FAILED',
      errorCode: 'APNS_ERROR',
      errorMessage: 'boom',
      retryCount: 3,
      nextAttemptAt: null,
    });
    expect(lastCall?.lastAttemptAt).toBeInstanceOf(Date);
    expect(lastCall?.lastErrorAt).toBeInstanceOf(Date);
  });
});
