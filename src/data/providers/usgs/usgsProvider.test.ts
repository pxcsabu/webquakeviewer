import { afterEach, describe, expect, it, vi } from 'vitest';
import { usgsFixture } from './fixtures';
import { usgsProvider } from './usgsProvider';

const now = new Date('2026-01-01T12:00:00Z');

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('usgsProvider', () => {
  it('fetches, parses, and returns cache validators', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(usgsFixture), {
        status: 200,
        headers: {
          ETag: '"abc"',
          'Last-Modified': 'Sun, 08 Nov 2026 05:00:00 GMT',
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await usgsProvider.fetch(undefined, {
      signal: new AbortController().signal,
      now,
      cache: null,
    });

    expect(result.records).toHaveLength(2);
    expect(result.notModified).toBe(false);
    expect(result.sourceUpdatedAt).toBe('2026-01-01T00:06:40.000Z');
    expect(result.cache).toEqual({
      etag: '"abc"',
      lastModified: 'Sun, 08 Nov 2026 05:00:00 GMT',
    });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(init.headers).get('If-None-Match')).toBeNull();
  });

  it('sends conditional headers and handles 304', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 304 }));
    vi.stubGlobal('fetch', fetchMock);

    const cache = {
      etag: '"abc"',
      lastModified: 'Sun, 08 Nov 2026 05:00:00 GMT',
    };
    const result = await usgsProvider.fetch(undefined, {
      signal: new AbortController().signal,
      now,
      cache,
    });

    expect(result.notModified).toBe(true);
    expect(result.records).toEqual([]);

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get('If-None-Match')).toBe('"abc"');
    expect(headers.get('If-Modified-Since')).toBe(cache.lastModified);
  });

  it('retries once without conditional headers when preflight fails', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(usgsFixture), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await usgsProvider.fetch(undefined, {
      signal: new AbortController().signal,
      now,
      cache: { etag: '"abc"', lastModified: null },
    });

    expect(result.records).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(new Headers(secondInit.headers).has('If-None-Match')).toBe(false);
  });

  it('reports HTTP failures as provider errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('error', { status: 500 })),
    );

    await expect(
      usgsProvider.fetch(undefined, {
        signal: new AbortController().signal,
        now,
        cache: null,
      }),
    ).rejects.toMatchObject({ code: 'HTTP' });
  });

  it('reports network failures as provider errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    );

    await expect(
      usgsProvider.fetch(undefined, {
        signal: new AbortController().signal,
        now,
        cache: null,
      }),
    ).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('reports an aborted request as ABORTED', async () => {
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')),
    );

    await expect(
      usgsProvider.fetch(undefined, {
        signal: controller.signal,
        now,
        cache: null,
      }),
    ).rejects.toMatchObject({ code: 'ABORTED' });
  });
});
