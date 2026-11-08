import { useCallback, useEffect, useRef, useState } from 'react';
import { sampleProvider } from '../../data/providers/sample/sampleProvider';
import type { Earthquake } from '../../domain/earthquake/types';
import {
  getCachedEarthquakes,
  getMeta,
  META_LAST_CATALOG_SYNC,
  META_LAST_OPENED_AT,
  META_SCHEMA_VERSION,
  setMeta,
} from '../../storage/indexeddb/catalogCache';
import {
  EARTHSCOPE_DATABASE_VERSION,
  openEarthScopeDatabase,
} from '../../storage/indexeddb/database';
import { appConfig } from '../env';
import type { AsyncStatus } from './asyncState';

export type CatalogSource = 'none' | 'cache' | 'sample';

export interface CatalogState {
  status: AsyncStatus;
  events: Earthquake[];
  source: CatalogSource;
  lastUpdated: string | null;
  error: string | null;
  cacheWarning: string | null;
}

const INITIAL_STATE: CatalogState = {
  status: 'loading',
  events: [],
  source: 'none',
  lastUpdated: null,
  error: null,
  cacheWarning: null,
};

function toErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : '不明なエラーが発生しました。';
}

export function useCatalog(): CatalogState & { refresh: () => void } {
  const [state, setState] = useState<CatalogState>(INITIAL_STATE);
  const [reloadToken, setReloadToken] = useState(0);
  const mountedRef = useRef(true);

  const refresh = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();
    let cancelled = false;
    let db: IDBDatabase | null = null;

    const updateState = (
      updater: (previous: CatalogState) => CatalogState,
    ): void => {
      if (!cancelled && mountedRef.current) {
        setState(updater);
      }
    };

    const load = async (): Promise<void> => {
      updateState((previous) => ({
        ...previous,
        status: 'loading',
        error: null,
      }));

      let cacheWarning: string | null = null;
      let cachedEvents: Earthquake[] = [];
      let cachedAt: string | null = null;

      try {
        db = await openEarthScopeDatabase();
        if (cancelled) {
          return;
        }

        try {
          await setMeta(db, META_LAST_OPENED_AT, new Date().toISOString());
          await setMeta(db, META_SCHEMA_VERSION, EARTHSCOPE_DATABASE_VERSION);
        } catch (error) {
          cacheWarning = `IndexedDB のメタ情報を保存できません: ${toErrorMessage(
            error,
          )}`;
        }

        const cached = await getCachedEarthquakes(db);
        if (cached.length > 0) {
          cachedEvents = cached.map((record) => record.event);
          cachedAt =
            cached[0]?.cachedAt ??
            cached[0]?.event.source.retrievedAt ??
            null;

          try {
            const lastSync = await getMeta<string>(db, META_LAST_CATALOG_SYNC);
            if (lastSync !== undefined) {
              cachedAt = lastSync;
            }
          } catch (error) {
            cacheWarning = `IndexedDB の同期時刻を読み取れません: ${toErrorMessage(
              error,
            )}`;
          }
        }
      } catch (error) {
        cacheWarning = `IndexedDB を利用できません: ${toErrorMessage(error)}`;
      } finally {
        if (db !== null) {
          db.close();
          db = null;
        }
      }

      if (cancelled) {
        return;
      }

      if (cachedEvents.length > 0) {
        updateState(() => ({
          status: 'success',
          events: cachedEvents,
          source: 'cache',
          lastUpdated: cachedAt,
          error: null,
          cacheWarning,
        }));
        return;
      }

      if (!appConfig.enableSampleData) {
        updateState(() => ({
          status: 'success',
          events: [],
          source: 'none',
          lastUpdated: null,
          error: null,
          cacheWarning,
        }));
        return;
      }

      try {
        const result = await sampleProvider.fetch(undefined, {
          signal: controller.signal,
          now: new Date(),
        });
        if (cancelled || controller.signal.aborted) {
          return;
        }
        updateState(() => ({
          status: 'success',
          events: result.records,
          source: 'sample',
          lastUpdated: result.retrievedAt,
          error: null,
          cacheWarning,
        }));
      } catch (error) {
        if (cancelled || controller.signal.aborted) {
          return;
        }
        updateState((previous) => ({
          ...previous,
          status: 'error',
          error: toErrorMessage(error),
          cacheWarning,
        }));
      }
    };

    void load();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      controller.abort();
      if (db !== null) {
        db.close();
        db = null;
      }
    };
  }, [reloadToken]);

  return { ...state, refresh };
}
