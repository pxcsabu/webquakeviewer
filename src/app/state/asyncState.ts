export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  status: AsyncStatus;
  data: T | null;
  error: string | null;
  lastUpdated: string | null;
}

export function createInitialAsyncState<T>(): AsyncState<T> {
  return {
    status: 'idle',
    data: null,
    error: null,
    lastUpdated: null,
  };
}

export function toLoading<T>(previous: AsyncState<T>): AsyncState<T> {
  return {
    ...previous,
    status: 'loading',
    error: null,
  };
}

export function toSuccess<T>(
  data: T,
  lastUpdated: string | null,
): AsyncState<T> {
  return {
    status: 'success',
    data,
    error: null,
    lastUpdated,
  };
}

export function toError<T>(
  error: string,
  previous: AsyncState<T>,
): AsyncState<T> {
  return {
    ...previous,
    status: 'error',
    error,
  };
}
