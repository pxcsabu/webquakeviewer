import { describe, expect, it } from 'vitest';
import {
  CATALOG_PROVIDERS,
  CATALOG_PROVIDER_OPTIONS,
  DEFAULT_CATALOG_PROVIDER,
} from './catalogProviders';

describe('catalog providers', () => {
  it('defaults to the JMA earthquake list', () => {
    expect(DEFAULT_CATALOG_PROVIDER).toBe('jma');
    expect(CATALOG_PROVIDERS.jma.provider.id).toBe('jma-earthquake-feed');
    expect(CATALOG_PROVIDERS.jma.sourceProvider).toBe('JMA');
  });

  it('keeps USGS available as a separate source', () => {
    expect(CATALOG_PROVIDERS.usgs.provider.id).toBe(
      'usgs-earthquake-feed',
    );
    expect(CATALOG_PROVIDERS.usgs.sourceProvider).toBe('USGS');
  });

  it('exposes both options to the UI', () => {
    expect(CATALOG_PROVIDER_OPTIONS.map((option) => option.id)).toEqual([
      'jma',
      'usgs',
    ]);
  });
});
