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

    expect(updateDeliveryStatus).toHaveBeenNthCalledWith(1, {
      deliveryId: 'delivery-ios',
      status: 'SUCCESS',
    });
    expect(updateDeliveryStatus).toHaveBeenNthCalledWith(2, {
      deliveryId: 'delivery-android',
      status: 'SUCCESS',
    });
  });

  it('records failure details when provider throws error', async () => {
    vi.mocked(sendApnsNotification).mockRejectedValueOnce(new NotificationProviderError('boom', 'APNS_ERROR'));

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

    expect(updateDeliveryStatus).toHaveBeenCalledWith({
      deliveryId: 'delivery-ios',
      status: 'FAILED',
      errorCode: 'APNS_ERROR',
      errorMessage: 'boom',
    });
  });
});
