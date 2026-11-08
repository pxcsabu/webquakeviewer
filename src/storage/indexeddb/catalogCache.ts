import type { Earthquake } from '../../domain/earthquake/types';
import {
  EVENTS_BY_PROVIDER_INDEX,
  EVENTS_STORE,
  META_STORE,
  PROVIDER_STATE_STORE,
  requestToPromise,
  transactionToPromise,
  type MetaRecord,
  type ProviderStateRecord,
} from './database';

export interface CachedEarthquake {
  event: Earthquake;
  cachedAt: string;
}

export const META_LAST_CATALOG_SYNC = 'lastCatalogSync';
export const META_LAST_OPENED_AT = 'lastOpenedAt';
export const META_SCHEMA_VERSION = 'schemaVersion';

export async function putEarthquakes(
  db: IDBDatabase,
  events: readonly Earthquake[],
  cachedAt: string = new Date().toISOString(),
): Promise<void> {
  if (events.length === 0) {
    return;
  }

  const transaction = db.transaction(EVENTS_STORE, 'readwrite');
  const store = transaction.objectStore(EVENTS_STORE);
  for (const event of events) {
    const record: CachedEarthquake = { event, cachedAt };
    store.put(record);
  }
  await transactionToPromise(transaction);
}

export async function getCachedEarthquakes(
  db: IDBDatabase,
): Promise<CachedEarthquake[]> {
  const transaction = db.transaction(EVENTS_STORE, 'readonly');
  const store = transaction.objectStore(EVENTS_STORE);
  const records = await requestToPromise(store.getAll() as IDBRequest<
    CachedEarthquake[]
  >);
  await transactionToPromise(transaction);

  return records.sort((left, right) => {
    const leftTime = Date.parse(left.event.time.originTime);
    const rightTime = Date.parse(right.event.time.originTime);
    if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) {
      return 0;
    }
    return rightTime - leftTime;
  });
}

export async function getCachedEarthquake(
  db: IDBDatabase,
  id: string,
): Promise<CachedEarthquake | undefined> {
  const transaction = db.transaction(EVENTS_STORE, 'readonly');
  const store = transaction.objectStore(EVENTS_STORE);
  const record = await requestToPromise(
    store.get(id) as IDBRequest<CachedEarthquake | undefined>,
  );
  await transactionToPromise(transaction);
  return record;
}

async function getProviderEventKeys(
  db: IDBDatabase,
  provider: string,
): Promise<IDBValidKey[]> {
  const transaction = db.transaction(EVENTS_STORE, 'readonly');
  const store = transaction.objectStore(EVENTS_STORE);
  const index = store.index(EVENTS_BY_PROVIDER_INDEX);
  const keys = await requestToPromise(
    index.getAllKeys(IDBKeyRange.only(provider)),
  );
  await transactionToPromise(transaction);
  return keys;
}

/**
 * Replaces the cached snapshot for one provider while preserving other
 * providers' records. Used for rolling-window feeds where events leave the
 * feed over time. Individual events are still keyed by their normalized id, so
 * a revised event with the same id is replaced by its latest version.
 */
export async function replaceEarthquakesForProvider(
  db: IDBDatabase,
  provider: string,
  events: readonly Earthquake[],
  cachedAt: string = new Date().toISOString(),
): Promise<void> {
  const existingKeys = await getProviderEventKeys(db, provider);
  const transaction = db.transaction(EVENTS_STORE, 'readwrite');
  const store = transaction.objectStore(EVENTS_STORE);

  for (const key of existingKeys) {
    store.delete(key);
  }
  for (const event of events) {
    const record: CachedEarthquake = { event, cachedAt };
    store.put(record);
  }

  await transactionToPromise(transaction);
}

export async function clearCachedEarthquakes(
  db: IDBDatabase,
): Promise<void> {
  const transaction = db.transaction(EVENTS_STORE, 'readwrite');
  transaction.objectStore(EVENTS_STORE).clear();
  await transactionToPromise(transaction);
}

export async function getMeta<T>(
  db: IDBDatabase,
  key: string,
): Promise<T | undefined> {
  const transaction = db.transaction(META_STORE, 'readonly');
  const store = transaction.objectStore(META_STORE);
  const record = await requestToPromise(
    store.get(key) as IDBRequest<MetaRecord | undefined>,
  );
  await transactionToPromise(transaction);
  return record?.value as T | undefined;
}

export async function setMeta(
  db: IDBDatabase,
  key: string,
  value: unknown,
): Promise<void> {
  const transaction = db.transaction(META_STORE, 'readwrite');
  const store = transaction.objectStore(META_STORE);
  const record: MetaRecord = {
    key,
    value,
    updatedAt: new Date().toISOString(),
  };
  store.put(record);
  await transactionToPromise(transaction);
}

export async function getProviderState(
  db: IDBDatabase,
  providerId: string,
): Promise<ProviderStateRecord | undefined> {
  const transaction = db.transaction(PROVIDER_STATE_STORE, 'readonly');
  const store = transaction.objectStore(PROVIDER_STATE_STORE);
  const record = await requestToPromise(
    store.get(providerId) as IDBRequest<ProviderStateRecord | undefined>,
  );
  await transactionToPromise(transaction);
  return record;
}

export async function setProviderState(
  db: IDBDatabase,
  state: ProviderStateRecord,
): Promise<void> {
  const transaction = db.transaction(PROVIDER_STATE_STORE, 'readwrite');
  transaction.objectStore(PROVIDER_STATE_STORE).put(state);
  await transactionToPromise(transaction);
}
