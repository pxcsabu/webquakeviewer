export const EARTHSCOPE_DATABASE_NAME = 'earthscope';
export const EARTHSCOPE_DATABASE_VERSION = 2;

export const EVENTS_STORE = 'events';
export const META_STORE = 'meta';
export const PROVIDER_STATE_STORE = 'providerState';

export const EVENTS_BY_ORIGIN_TIME_INDEX = 'by-origin-time';
export const EVENTS_BY_PROVIDER_INDEX = 'by-provider';
export const EVENTS_BY_MAGNITUDE_INDEX = 'by-magnitude';

export interface MetaRecord {
  key: string;
  value: unknown;
  updatedAt: string;
}

export type ProviderStateStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ProviderStateRecord {
  providerId: string;
  status: ProviderStateStatus;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  nextPollAt: string | null;
  etag: string | null;
  lastModified: string | null;
  lastFeedGeneratedAt: string | null;
  lastEventCount: number | null;
}

function assertIndexedDbAvailable(): void {
  if (typeof indexedDB === 'undefined') {
    throw new Error('この環境では IndexedDB を利用できません。');
  }
}

export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB リクエストに失敗しました。'));
    };
  });
}

export function transactionToPromise(
  transaction: IDBTransaction,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      reject(
        transaction.error ?? new Error('IndexedDB トランザクションに失敗しました。'),
      );
    };
    transaction.onabort = () => {
      reject(
        transaction.error ?? new Error('IndexedDB トランザクションが中断されました。'),
      );
    };
  });
}

export function openEarthScopeDatabase(
  name: string = EARTHSCOPE_DATABASE_NAME,
): Promise<IDBDatabase> {
  assertIndexedDbAvailable();

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, EARTHSCOPE_DATABASE_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (
        event.oldVersion > 0 &&
        event.oldVersion < 2 &&
        request.transaction !== null
      ) {
        // Version 2 adds optional JMA intensity-area fields to cached events.
        // Drop the old snapshot and conditional-request state so the next
        // load fetches a fresh, complete catalog instead of reusing a 304.
        if (db.objectStoreNames.contains(EVENTS_STORE)) {
          request.transaction.objectStore(EVENTS_STORE).clear();
        }
        if (db.objectStoreNames.contains(PROVIDER_STATE_STORE)) {
          request.transaction.objectStore(PROVIDER_STATE_STORE).clear();
        }
      }

      if (!db.objectStoreNames.contains(EVENTS_STORE)) {
        const events = db.createObjectStore(EVENTS_STORE, {
          keyPath: 'event.id',
        });
        events.createIndex(EVENTS_BY_ORIGIN_TIME_INDEX, 'event.time.originTime', {
          unique: false,
        });
        events.createIndex(EVENTS_BY_PROVIDER_INDEX, 'event.source.provider', {
          unique: false,
        });
        events.createIndex(EVENTS_BY_MAGNITUDE_INDEX, 'event.magnitude.value', {
          unique: false,
        });
      }

      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains(PROVIDER_STATE_STORE)) {
        db.createObjectStore(PROVIDER_STATE_STORE, { keyPath: 'providerId' });
      }
    };

    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB を開けませんでした。'));
    };

    request.onblocked = () => {
      reject(
        new Error(
          'IndexedDB のバージョン変更が他のタブにブロックされています。他タブを閉じて再試行してください。',
        ),
      );
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
      };
      resolve(db);
    };
  });
}

export function deleteEarthScopeDatabase(
  name: string = EARTHSCOPE_DATABASE_NAME,
): Promise<void> {
  assertIndexedDbAvailable();

  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB を削除できませんでした。'));
    };
    request.onblocked = () => {
      reject(
        new Error(
          'IndexedDB の削除が他の接続にブロックされています。',
        ),
      );
    };
  });
}
