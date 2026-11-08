import type { Earthquake } from '../../../domain/earthquake/types';
import { ProviderError } from '../errors';
import type {
  DataProvider,
  ProviderRequestContext,
  ProviderResult,
} from '../types';
import { parseJmaQuakeList } from './parseJmaQuakeList';

export const JMA_FEED_URL =
  'https://www.jma.go.jp/bosai/quake/data/list.json';

export const JMA_DATASET =
  'JMA 地震情報一覧 (bosai/quake/data/list.json)';
export const JMA_SOURCE_PROVIDER = 'JMA';
export const JMA_POLL_INTERVAL_MS = 5 * 60 * 1000;

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
    return new ProviderError('ABORTED', '気象庁データの取得が中止されました。', {
      cause: error,
    });
  }
  return new ProviderError(
    'NETWORK',
    '気象庁への接続に失敗しました。CORS またはネットワークを確認してください。',
    { cause: error, retryable: true },
  );
}

export const jmaProvider: DataProvider<void, Earthquake> = {
  id: 'jma-earthquake-feed',
  name: 'JMA Earthquake Information',

  async fetch(
    _query: void,
    context: ProviderRequestContext,
  ): Promise<ProviderResult<Earthquake>> {
    let response: Response;
    try {
      // JMA's CORS allow-list does not include If-None-Match or
      // If-Modified-Since, so this provider intentionally performs a plain GET
      // and relies on the application cache for offline/stale fallback.
      response = await fetch(JMA_FEED_URL, {
        method: 'GET',
        headers: new Headers({ Accept: 'application/json' }),
        signal: context.signal,
        cache: 'no-store',
        redirect: 'follow',
      });
    } catch (error) {
      throw toProviderError(error, context.signal);
    }

    if (!response.ok) {
      throw new ProviderError(
        'HTTP',
        `気象庁データの取得に失敗しました（HTTP ${response.status}）。`,
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
        '気象庁データの JSON を解析できませんでした。',
        { cause: error },
      );
    }

    const parsed = parseJmaQuakeList(json, {
      retrievedAt: context.now.toISOString(),
      dataset: JMA_DATASET,
    });

    return {
      records: parsed.events,
      retrievedAt: context.now.toISOString(),
      ...(parsed.latestReportAt !== undefined
        ? { sourceUpdatedAt: parsed.latestReportAt }
        : {}),
      warnings: parsed.warnings,
      notModified: false,
      cache: null,
    };
  },
};
