import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CATALOG_PROVIDERS,
  DEFAULT_CATALOG_PROVIDER,
  type CatalogProviderId,
} from '../../data/providers/catalogProviders';
import { sampleProvider } from '../../data/providers/sample/sampleProvider';
import type { ProviderCacheState } from '../../data/providers/types';
import { sortEarthquakesByTime } from '../../domain/earthquake/sort';
import { filterEventsInJapanRegion } from '../../domain/geography/japanRegion';
import type { Earthquake } from '../../domain/earthquake/types';
import {
  getCachedEarthquakes,
  getProviderState,
  META_LAST_CATALOG_SYNC,
  META_LAST_OPENED_AT,
  META_SCHEMA_VERSION,
  replaceEarthquakesForProvider,
  setMeta,
  setProviderState,
} from '../../storage/indexeddb/catalogCache';
import {
  EARTHSCOPE_DATABASE_VERSION,
  openEarthScopeDatabase,
  type ProviderStateRecord,
} from '../../storage/indexeddb/database';
import { appConfig } from '../env';
import type { AsyncStatus } from './asyncState';

export type CatalogSource = 'none' | 'cache' | 'network' | 'sample';

export interface CatalogState {
  status: AsyncStatus;
  events: Earthquake[];
  source: CatalogSource;
  lastUpdated: string | null;
  error: string | null;
  cacheWarning: string | null;
  providerState: ProviderStateRecord | null;
  providerId: CatalogProviderId;
  providerLabel: string;
  warnings: string[];
  notModified: boolean;
}

const INITIAL_STATE: CatalogState = {
  status: 'loading',
  events: [],
  source: 'none',
  lastUpdated: null,
  error: null,
  cacheWarning: null,
  providerState: null,
  providerId: DEFAULT_CATALOG_PROVIDER,
  providerLabel: CATALOG_PROVIDERS[DEFAULT_CATALOG_PROVIDER].label,
  warnings: [],
  notModified: false,
};

function toErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : '不明なエラーが発生しました。';
}

function createSuccessState(
  previous: CatalogState,
  nextState: ProviderStateRecord,
  events: Earthquake[],
  source: CatalogSource,
  lastUpdated: string,
  cacheWarning: string | null,
  warnings: string[],
  notModified: boolean,
): CatalogState {
  return {
    ...previous,
    status: 'success',
    events,
    source,
    lastUpdated,
    error: null,
    cacheWarning,
    providerState: nextState,
    warnings,
    notModified,
  };
}

export function useCatalog(
  providerId: CatalogProviderId,
): CatalogState & { refresh: () => void } {
  const providerDefinition = CATALOG_PROVIDERS[providerId];
  const [state, setState] = useState<CatalogState>(INITIAL_STATE);
  const [reloadToken, setReloadToken] = useState(0);
  const loadingRef = useRef(false);
  const currentProviderIdRef = useRef<CatalogProviderId | null>(null);

  const refresh = useCallback(() => {
    if (loadingRef.current) {
      return;
    }
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    let db: IDBDatabase | null = null;

    const update = (
      updater: (previous: CatalogState) => CatalogState,
    ): void => {
      if (!cancelled) {
        setState(updater);
      }
    };

    const load = async (): Promise<void> => {
      loadingRef.current = true;
      const providerChanged =
        currentProviderIdRef.current !== providerId;
      currentProviderIdRef.current = providerId;
      update((previous) => {
        const base = providerChanged
          ? {
              ...INITIAL_STATE,
              providerId,
              providerLabel: providerDefinition.label,
            }
          : previous;
        return {
          ...base,
          status: 'loading',
          error: null,
          providerId,
          providerLabel: providerDefinition.label,
        };
      });

      let cacheWarning: string | null = null;
      let cachedEvents: Earthquake[] = [];
      let cachedAt: string | null = null;
      let providerState: ProviderStateRecord | null = null;
      let cacheContainsOutsideJapan = false;

      try {
        try {
          db = await openEarthScopeDatabase();
        } catch (error) {
          cacheWarning = `IndexedDB を利用できません: ${toErrorMessage(error)}`;
          db = null;
        }

        if (cancelled) {
          return;
        }

        if (db !== null) {
          try {
            await setMeta(db, META_LAST_OPENED_AT, new Date().toISOString());
            await setMeta(db, META_SCHEMA_VERSION, EARTHSCOPE_DATABASE_VERSION);
          } catch (error) {
            cacheWarning = `IndexedDB のメタ情報を保存できません: ${toErrorMessage(
              error,
            )}`;
          }

          try {
            const cached = await getCachedEarthquakes(db);
            const cachedForProvider = cached.filter(
              (record) =>
                record.event.source.provider ===
                providerDefinition.sourceProvider,
            );
            if (cachedForProvider.length > 0) {
              const cachedInJapan = filterEventsInJapanRegion(
                cachedForProvider.map((record) => record.event),
              );
              cacheContainsOutsideJapan =
                cachedInJapan.length !== cachedForProvider.length;
              cachedEvents = cachedInJapan;
              cachedAt =
                cachedForProvider[0]?.cachedAt ??
                cachedForProvider[0]?.event.source.retrievedAt ??
                null;
            }

            providerState =
              (await getProviderState(db, providerDefinition.provider.id)) ??
              null;
            if (cachedAt === null && providerState?.lastSuccessAt) {
              cachedAt = providerState.lastSuccessAt;
            }
          } catch (error) {
            cacheWarning = `IndexedDB のキャッシュを読み取れません: ${toErrorMessage(
              error,
            )}`;
          }
        }

        if (cancelled) {
          return;
        }

        if (cachedEvents.length > 0) {
          const cachedSnapshot = sortEarthquakesByTime(cachedEvents);
          update(() => ({
            status: 'loading',
            events: cachedSnapshot,
            source: 'cache',
            lastUpdated: cachedAt,
            error: null,
            cacheWarning,
            providerState,
            providerId,
            providerLabel: providerDefinition.label,
            warnings: [],
            notModified: false,
          }));
        }

        if (appConfig.enableSampleData) {
          const result = await sampleProvider.fetch(undefined, {
            signal: controller.signal,
            now: new Date(),
            cache: null,
          });
          if (cancelled || controller.signal.aborted) {
            return;
          }
          update(() => ({
            status: 'success',
            events: filterEventsInJapanRegion(
              sortEarthquakesByTime(result.records),
            ),
            source: 'sample',
            lastUpdated: result.retrievedAt,
            error: null,
            cacheWarning,
            providerState: null,
            providerId,
            providerLabel: providerDefinition.label,
            warnings: result.warnings,
            notModified: false,
          }));
          return;
        }

        const now = new Date();
        const cacheState: ProviderCacheState | null =
          cachedEvents.length > 0 &&
          providerState &&
          !cacheContainsOutsideJapan
            ? {
                etag: providerState.etag,
                lastModified: providerState.lastModified,
              }
            : null;

        try {
          const result = await providerDefinition.provider.fetch(undefined, {
            signal: controller.signal,
            now,
            cache: cacheState,
          });

          if (cancelled || controller.signal.aborted) {
            return;
          }

          if (result.notModified) {
            const lastSuccessAt =
              providerState?.lastSuccessAt ?? now.toISOString();
            const nextProviderState: ProviderStateRecord = {
              providerId: providerDefinition.provider.id,
              status: 'success',
              lastAttemptAt: now.toISOString(),
              lastSuccessAt,
              lastError: null,
              nextPollAt: new Date(
                now.getTime() + providerDefinition.pollIntervalMs,
              ).toISOString(),
              etag: providerState?.etag ?? result.cache?.etag ?? null,
              lastModified:
                providerState?.lastModified ??
                result.cache?.lastModified ??
                null,
              lastFeedGeneratedAt:
                providerState?.lastFeedGeneratedAt ?? null,
              lastEventCount: cachedEvents.length,
            };

            if (db !== null) {
              try {
                await setProviderState(db, nextProviderState);
              } catch (error) {
                cacheWarning = `プロバイダー状態を保存できません: ${toErrorMessage(
                  error,
                )}`;
              }
            }

            update((previous) =>
              createSuccessState(
                previous,
                nextProviderState,
                sortEarthquakesByTime(cachedEvents),
                'cache',
                lastSuccessAt,
                cacheWarning,
                result.warnings,
                true,
              ),
            );
            return;
          }

          const sortedEvents = filterEventsInJapanRegion(
            sortEarthquakesByTime(result.records),
          );

          if (db !== null) {
            try {
              await replaceEarthquakesForProvider(
                db,
                providerDefinition.sourceProvider,
                sortedEvents,
                result.retrievedAt,
              );
              await setMeta(db, META_LAST_CATALOG_SYNC, result.retrievedAt);
            } catch (error) {
              cacheWarning = `${providerDefinition.label} のキャッシュ保存に失敗しました: ${toErrorMessage(
                error,
              )}`;
            }
          }

          const nextProviderState: ProviderStateRecord = {
            providerId: providerDefinition.provider.id,
            status: 'success',
            lastAttemptAt: now.toISOString(),
            lastSuccessAt: result.retrievedAt,
            lastError: null,
            nextPollAt: new Date(
              now.getTime() + providerDefinition.pollIntervalMs,
            ).toISOString(),
            etag: result.cache?.etag ?? null,
            lastModified: result.cache?.lastModified ?? null,
            lastFeedGeneratedAt: result.sourceUpdatedAt ?? null,
            lastEventCount: sortedEvents.length,
          };

          if (db !== null) {
            try {
              await setProviderState(db, nextProviderState);
            } catch (error) {
              cacheWarning = `プロバイダー状態を保存できません: ${toErrorMessage(
                error,
              )}`;
            }
          }

          update((previous) =>
            createSuccessState(
              previous,
              nextProviderState,
              sortedEvents,
              'network',
              result.retrievedAt,
              cacheWarning,
              result.warnings,
              false,
            ),
          );
        } catch (error) {
          if (cancelled || controller.signal.aborted) {
            return;
          }

          const message = toErrorMessage(error);
          const nextProviderState: ProviderStateRecord = {
            providerId: providerDefinition.provider.id,
            status: 'error',
            lastAttemptAt: now.toISOString(),
            lastSuccessAt: providerState?.lastSuccessAt ?? null,
            lastError: message,
            nextPollAt: new Date(
              now.getTime() + providerDefinition.pollIntervalMs,
            ).toISOString(),
            etag: providerState?.etag ?? null,
            lastModified: providerState?.lastModified ?? null,
            lastFeedGeneratedAt:
              providerState?.lastFeedGeneratedAt ?? null,
            lastEventCount: providerState?.lastEventCount ?? null,
          };

          if (db !== null) {
            try {
              await setProviderState(db, nextProviderState);
            } catch (cacheError) {
              cacheWarning = `プロバイダー状態を保存できません: ${toErrorMessage(
                cacheError,
              )}`;
            }
          }

          update((previous) => ({
            ...previous,
            status: 'error',
            events:
              cachedEvents.length > 0
                ? sortEarthquakesByTime(cachedEvents)
                : previous.events,
            source:
              cachedEvents.length > 0 ? 'cache' : previous.source,
            lastUpdated: cachedAt ?? previous.lastUpdated,
            error: message,
            cacheWarning,
            providerState: nextProviderState,
            warnings: [],
            notModified: false,
          }));
        }
      } catch (error) {
        if (!cancelled) {
          update((previous) => ({
            ...previous,
            status: 'error',
            error: toErrorMessage(error),
            cacheWarning,
            warnings: [],
            notModified: false,
          }));
        }
      } finally {
        if (!cancelled) {
          loadingRef.current = false;
        }
        if (db !== null) {
          db.close();
          db = null;
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      controller.abort();
      loadingRef.current = false;
      if (db !== null) {
        db.close();
        db = null;
      }
    };
  }, [reloadToken, providerId, providerDefinition]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    }, providerDefinition.pollIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [providerDefinition.pollIntervalMs, refresh]);

  return { ...state, refresh };
}
