import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/notification/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/notification/index.js')>();
  return {
    ...actual,
    dispatchDeliveries: vi.fn(),
    MAX_DELIVERY_ATTEMPTS: 3,
  };
});

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: {
    deliveryLog: {
      findMany: vi.fn(),
    },
  },
}));

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
} as const;

const { processPendingDeliveries } = await import('../../src/jobs/delivery-retry.js');
const { prisma } = await import('../../src/lib/prisma.js');
const { dispatchDeliveries } = await import('../../src/lib/notification/index.js');

describe('delivery-retry job', () => {
  beforeEach(() => {
    vi.mocked(prisma.deliveryLog.findMany).mockReset();
    vi.mocked(dispatchDeliveries).mockReset();
    mockLogger.info.mockReset();
    mockLogger.error.mockReset();
  });

  it('dispatches grouped deliveries by notification', async () => {
    vi.mocked(prisma.deliveryLog.findMany).mockResolvedValueOnce([
      {
        id: 'delivery-1',
        notificationId: 'notif-1',
        deviceId: 'device-1',
        retryCount: 1,
        status: 'PENDING',
        nextAttemptAt: null,
        notification: {
          id: 'notif-1',
          title: 'Title',
          body: 'Body',
          imageUrl: null,
          customData: { foo: 'bar' },
        },
        device: {
          id: 'device-1',
          token: 'token-1',
          platform: 'IOS',
        },
      },
      {
        id: 'delivery-2',
        notificationId: 'notif-1',
        deviceId: 'device-2',
        retryCount: 0,
        status: 'PENDING',
        nextAttemptAt: null,
        notification: {
          id: 'notif-1',
          title: 'Title',
          body: 'Body',
          imageUrl: null,
          customData: { foo: 'bar' },
        },
        device: {
          id: 'device-2',
          token: 'token-2',
          platform: 'ANDROID',
        },
      },
    ] as never);

    await processPendingDeliveries(mockLogger);

    expect(dispatchDeliveries).toHaveBeenCalledWith({
      notification: {
        id: 'notif-1',
        title: 'Title',
        body: 'Body',
        imageUrl: null,
        customData: { foo: 'bar' },
      },
      devices: [
        { id: 'device-1', token: 'token-1', platform: 'IOS' },
        { id: 'device-2', token: 'token-2', platform: 'ANDROID' },
      ],
      deliveries: [
        { id: 'delivery-1', deviceId: 'device-1' },
        { id: 'delivery-2', deviceId: 'device-2' },
      ],
      payload: {
        title: 'Title',
        body: 'Body',
        imageUrl: undefined,
        customData: { foo: 'bar' },
        tokens: ['token-1', 'token-2'],
      },
    });
  });

  it('logs nothing when no pending deliveries', async () => {
    vi.mocked(prisma.deliveryLog.findMany).mockResolvedValueOnce([]);

    await processPendingDeliveries(mockLogger);

    expect(dispatchDeliveries).not.toHaveBeenCalled();
  });
});
