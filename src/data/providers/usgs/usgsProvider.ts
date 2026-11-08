import type { Earthquake } from '../../../domain/earthquake/types';
import { ProviderError } from '../errors';
import type {
  DataProvider,
  ProviderCacheState,
  ProviderRequestContext,
  ProviderResult,
} from '../types';
import { parseUsgsGeoJson } from './parseUsgsGeoJson';

export const USGS_FEED_URL =
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';

export const USGS_DATASET = 'USGS Earthquake Feed v1.0 all_day';
export const USGS_SOURCE_PROVIDER = 'USGS';
export const USGS_POLL_INTERVAL_MS = 5 * 60 * 1000;

function buildHeaders(
  cache: ProviderCacheState | null | undefined,
): Headers {
  const headers = new Headers({ Accept: 'application/json' });
  if (cache?.etag) {
    headers.set('If-None-Match', cache.etag);
  }
  if (cache?.lastModified) {
    headers.set('If-Modified-Since', cache.lastModified);
  }
  return headers;
}

async function requestFeed(
  headers: Headers,
  signal: AbortSignal,
): Promise<Response> {
  return fetch(USGS_FEED_URL, {
    method: 'GET',
    headers,
    signal,
    cache: 'no-store',
    redirect: 'follow',
  });
}

function toProviderError(
  error: unknown,
  signal: AbortSignal,
): ProviderError {
  if (error instanceof ProviderError) {
    return error;
  }
  if (
    signal.aborted ||
    (error instanceof DOMException && error.name === 'AbortError')
  ) {
    return new ProviderError('ABORTED', 'USGS フィードの取得が中止されました。', {
      cause: error,
    });
  }
  return new ProviderError(
    'NETWORK',
    'USGS への接続に失敗しました。CORS またはネットワークを確認してください。',
    { cause: error, retryable: true },
  );
}

export const usgsProvider: DataProvider<void, Earthquake> = {
  id: 'usgs-earthquake-feed',
  name: 'USGS Earthquake Feed',

  async fetch(
    _query: void,
    context: ProviderRequestContext,
  ): Promise<ProviderResult<Earthquake>> {
    const cache = context.cache ?? null;
    const conditionalHeaders = buildHeaders(cache);
    const hasConditionalHeaders =
      conditionalHeaders.has('If-None-Match') ||
      conditionalHeaders.has('If-Modified-Since');

    let response: Response;
    try {
      response = await requestFeed(conditionalHeaders, context.signal);
    } catch (error) {
      if (context.signal.aborted) {
        throw toProviderError(error, context.signal);
      }

      // Conditional request headers are not CORS-safelisted. If a provider
      // rejects the preflight, retry once without them rather than losing the
      // catalog entirely.
      if (!hasConditionalHeaders) {
        throw toProviderError(error, context.signal);
      }

      try {
        response = await requestFeed(
          new Headers({ Accept: 'application/json' }),
          context.signal,
        );
      } catch (fallbackError) {
        throw toProviderError(fallbackError, context.signal);
      }
    }

    if (response.status === 304) {
      return {
        records: [],
        retrievedAt: context.now.toISOString(),
        warnings: [],
        notModified: true,
        cache,
      };
    }

    if (!response.ok) {
      throw new ProviderError(
        'HTTP',
        `USGS フィードの取得に失敗しました（HTTP ${response.status}）。`,
        {
          retryable: response.status >= 500 || response.status === 429,
        },
      );
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch (error) {
      throw new ProviderError(
        'PARSE',
        'USGS フィードの JSON を解析できませんでした。',
        { cause: error },
      );
    }

    const parsed = parseUsgsGeoJson(json, {
      retrievedAt: context.now.toISOString(),
      dataset: USGS_DATASET,
    });

    return {
      records: parsed.events,
      retrievedAt: context.now.toISOString(),
      ...(parsed.sourceUpdatedAt !== undefined
        ? { sourceUpdatedAt: parsed.sourceUpdatedAt }
        : {}),
      warnings: parsed.warnings,
      notModified: false,
      cache: {
        etag: response.headers.get('etag'),
        lastModified: response.headers.get('last-modified'),
      },
    };
  },
};
