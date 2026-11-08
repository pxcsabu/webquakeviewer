export type ProviderErrorCode =
  | 'NETWORK'
  | 'HTTP'
  | 'PARSE'
  | 'VALIDATION'
  | 'ABORTED'
  | 'UNKNOWN';

interface ProviderErrorOptions {
  cause?: unknown;
  retryable?: boolean;
}

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly retryable: boolean;

  constructor(
    code: ProviderErrorCode,
    message: string,
    options: ProviderErrorOptions = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'ProviderError';
    this.code = code;
    this.retryable = options.retryable ?? false;
  }
}
