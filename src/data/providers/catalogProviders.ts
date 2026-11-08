import type { Earthquake } from '../../domain/earthquake/types';
import {
  JMA_POLL_INTERVAL_MS,
  JMA_SOURCE_PROVIDER,
  jmaProvider,
} from './jma/jmaProvider';
import {
  USGS_POLL_INTERVAL_MS,
  USGS_SOURCE_PROVIDER,
  usgsProvider,
} from './usgs/usgsProvider';
import type { DataProvider } from './types';

export type CatalogProviderId = 'jma' | 'usgs';

export interface CatalogProviderDefinition {
  id: CatalogProviderId;
  label: string;
  provider: DataProvider<void, Earthquake>;
  /** Value used in event.source.provider and the IndexedDB provider index. */
  sourceProvider: string;
  pollIntervalMs: number;
}

export const CATALOG_PROVIDERS: Record<
  CatalogProviderId,
  CatalogProviderDefinition
> = {
  jma: {
    id: 'jma',
    label: '気象庁 地震情報',
    provider: jmaProvider,
    sourceProvider: JMA_SOURCE_PROVIDER,
    pollIntervalMs: JMA_POLL_INTERVAL_MS,
  },
  usgs: {
    id: 'usgs',
    label: 'USGS',
    provider: usgsProvider,
    sourceProvider: USGS_SOURCE_PROVIDER,
    pollIntervalMs: USGS_POLL_INTERVAL_MS,
  },
};

export const DEFAULT_CATALOG_PROVIDER: CatalogProviderId = 'jma';

export const CATALOG_PROVIDER_OPTIONS: readonly {
  id: CatalogProviderId;
  label: string;
}[] = [
  { id: 'jma', label: '気象庁 地震情報' },
  { id: 'usgs', label: 'USGS' },
];
