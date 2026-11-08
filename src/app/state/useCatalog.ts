import { useCallback, useEffect, useRef, useState } from 'react';
import { sampleProvider } from '../../data/providers/sample/sampleProvider';
import {
  USGS_POLL_INTERVAL_MS,
  USGS_SOURCE_PROVIDER,
  usgsProvider,
} from '../../data/providers/usgs/usgsProvider';
import type { ProviderCacheState } from '../../data/providers/types';
import { sortEarthquakesByTime } from '../../domain/earthquake/sort';
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

export function useCatalog(): CatalogState & { refresh: () => void } {
  const [state, setState] = useState<CatalogState>(INITIAL_STATE);
  const [reloadToken, setReloadToken] = useState(0);
  const loadingRef = useRef(false);

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
      update((previous) => ({
        ...previous,
        status: 'loading',
        error: null,
      }));

      let cacheWarning: string | null = null;
      let cachedEvents: Earthquake[] = [];
      let cachedAt: string | null = null;
      let providerState: ProviderStateRecord | null = null;

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
            if (cached.length > 0) {
              cachedEvents = cached.map((record) => record.event);
              cachedAt =
                cached[0]?.cachedAt ??
                cached[0]?.event.source.retrievedAt ??
                null;
            }

            providerState =
              (await getProviderState(db, usgsProvider.id)) ?? null;
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
            events: sortEarthquakesByTime(result.records),
            source: 'sample',
            lastUpdated: result.retrievedAt,
            error: null,
            cacheWarning,
            providerState: null,
            warnings: result.warnings,
            notModified: false,
          }));
          return;
        }

        const now = new Date();
        const cacheState: ProviderCacheState | null =
          cachedEvents.length > 0 && providerState
            ? {
                etag: providerState.etag,
                lastModified: providerState.lastModified,
              }
            : null;

        try {
          const result = await usgsProvider.fetch(undefined, {
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
              providerId: usgsProvider.id,
              status: 'success',
              lastAttemptAt: now.toISOString(),
              lastSuccessAt,
              lastError: null,
              nextPollAt: new Date(
                now.getTime() + USGS_POLL_INTERVAL_MS,
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

          const sortedEvents = sortEarthquakesByTime(result.records);

          if (db !== null) {
            try {
              await replaceEarthquakesForProvider(
                db,
                USGS_SOURCE_PROVIDER,
                sortedEvents,
                result.retrievedAt,
              );
              await setMeta(db, META_LAST_CATALOG_SYNC, result.retrievedAt);
            } catch (error) {
              cacheWarning = `USGS のキャッシュ保存に失敗しました: ${toErrorMessage(
                error,
              )}`;
            }
          }

          const nextProviderState: ProviderStateRecord = {
            providerId: usgsProvider.id,
            status: 'success',
            lastAttemptAt: now.toISOString(),
            lastSuccessAt: result.retrievedAt,
            lastError: null,
            nextPollAt: new Date(
              now.getTime() + USGS_POLL_INTERVAL_MS,
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
            providerId: usgsProvider.id,
            status: 'error',
            lastAttemptAt: now.toISOString(),
            lastSuccessAt: providerState?.lastSuccessAt ?? null,
            lastError: message,
            nextPollAt: new Date(
              now.getTime() + USGS_POLL_INTERVAL_MS,
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
  }, [reloadToken]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    }, USGS_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refresh]);

  return { ...state, refresh };
}
