import { afterEach, describe, expect, it, vi } from 'vitest';
import { jmaFixture } from './fixtures';
import { jmaProvider } from './jmaProvider';

const now = new Date('2026-11-08T03:00:00Z');

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('jmaProvider', () => {
  it('fetches and parses the JMA list without conditional headers', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(jmaFixture), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await jmaProvider.fetch(undefined, {
      signal: new AbortController().signal,
      now,
      cache: { etag: '"unused"', lastModified: 'unused' },
    });

    expect(result.records).toHaveLength(4);
    expect(result.notModified).toBe(false);
    expect(result.cache).toBeNull();
    expect(result.sourceUpdatedAt).toBe('2026-11-08T02:24:00.000Z');

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get('If-None-Match')).toBeNull();
    expect(headers.get('If-Modified-Since')).toBeNull();
  });

  it('reports HTTP failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('error', { status: 503 })),
    );

    await expect(
      jmaProvider.fetch(undefined, {
        signal: new AbortController().signal,
        now,
        cache: null,
      }),
    ).rejects.toMatchObject({ code: 'HTTP' });
  });

  it('reports network failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    );

    await expect(
      jmaProvider.fetch(undefined, {
        signal: new AbortController().signal,
        now,
        cache: null,
      }),
    ).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('reports aborted requests', async () => {
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')),
    );

    await expect(
      jmaProvider.fetch(undefined, {
        signal: controller.signal,
        now,
        cache: null,
      }),
    ).rejects.toMatchObject({ code: 'ABORTED' });
  });
});
