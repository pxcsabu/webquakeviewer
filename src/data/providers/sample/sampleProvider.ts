import type { Earthquake } from '../../../domain/earthquake/types';
import { validateEarthquake } from '../../../domain/earthquake/validation';
import { ProviderError } from '../errors';
import type {
  DataProvider,
  ProviderRequestContext,
  ProviderResult,
} from '../types';
import { sampleEarthquakes } from './fixtures';

function validatedSampleRecords(): Earthquake[] {
  return sampleEarthquakes.map((event) => {
    const result = validateEarthquake(event);
    if (!result.ok) {
      const details = result.issues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join('; ');
      throw new ProviderError(
        'VALIDATION',
        `開発用サンプルの検証に失敗しました: ${details}`,
      );
    }
    return result.value;
  });
}

/**
 * Development fixture provider.
 *
 * This provider performs no network access and its records are never written to
 * IndexedDB by the application.
 */
export const sampleProvider: DataProvider<void, Earthquake> = {
  id: 'development-sample',
  name: 'Development Sample',
  async fetch(
    _query: void,
    context: ProviderRequestContext,
  ): Promise<ProviderResult<Earthquake>> {
    if (context.signal.aborted) {
      throw new ProviderError('ABORTED', 'サンプルデータの読み込みが中止されました。');
    }

    return {
      records: validatedSampleRecords(),
      retrievedAt: context.now.toISOString(),
      warnings: [
        'ILLUSTRATIVE: 開発用サンプルです。実際の地震観測データではありません。',
      ],
      notModified: false,
      cache: null,
    };
  },
};
