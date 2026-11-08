import { describe, expect, it } from 'vitest';
import {
  createInitialAsyncState,
  toError,
  toLoading,
  toSuccess,
} from './asyncState';

describe('asyncState', () => {
  it('starts idle and empty', () => {
    expect(createInitialAsyncState<string>()).toEqual({
      status: 'idle',
      data: null,
      error: null,
      lastUpdated: null,
    });
  });

  it('keeps existing data while loading', () => {
    const success = toSuccess(['a'], '2026-11-08T05:00:00Z');
    expect(toLoading(success)).toEqual({
      status: 'loading',
      data: ['a'],
      error: null,
      lastUpdated: '2026-11-08T05:00:00Z',
    });
  });

  it('keeps existing data on error', () => {
    const success = toSuccess(['a'], '2026-11-08T05:00:00Z');
    expect(toError('failed', success)).toEqual({
      status: 'error',
      data: ['a'],
      error: 'failed',
      lastUpdated: '2026-11-08T05:00:00Z',
    });
  });
});
