export class NotificationProviderError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'NotificationProviderError';
  }
}

export class NotificationConfigurationError extends NotificationProviderError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_MISSING');
    this.name = 'NotificationConfigurationError';
  }
}
