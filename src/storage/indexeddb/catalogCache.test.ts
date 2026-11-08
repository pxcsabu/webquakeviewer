import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Earthquake } from '../../domain/earthquake/types';
import {
  clearCachedEarthquakes,
  getCachedEarthquake,
  getCachedEarthquakes,
  getMeta,
  getProviderState,
  META_LAST_CATALOG_SYNC,
  putEarthquakes,
  setMeta,
  setProviderState,
} from './catalogCache';
import {
  deleteEarthScopeDatabase,
  EARTHSCOPE_DATABASE_VERSION,
  EVENTS_STORE,
  openEarthScopeDatabase,
} from './database';

function makeEvent(id: string, originTime: string): Earthquake {
  return {
    id,
    source: {
      provider: 'Test Provider',
      dataset: 'test-dataset',
      originalId: id,
      retrievedAt: '2026-11-08T05:00:00Z',
    },
    time: { originTime },
    location: {
      latitude: 35.6,
      longitude: 139.7,
      depthKm: 10,
      crs: 'WGS84',
    },
    magnitude: { value: 4.2, type: 'Mww' },
    classification: 'OBSERVED',
  };
}

let db: IDBDatabase;
let dbName: string;

beforeEach(async () => {
  dbName = `earthscope-test-${crypto.randomUUID()}`;
  db = await openEarthScopeDatabase(dbName);
});

afterEach(async () => {
  db.close();
  await deleteEarthScopeDatabase(dbName);
});

describe('IndexedDB catalog cache', () => {
  it('creates the versioned stores', () => {
    expect(db.version).toBe(EARTHSCOPE_DATABASE_VERSION);
    expect(db.objectStoreNames.contains(EVENTS_STORE)).toBe(true);
  });

  it('stores and retrieves events in descending origin-time order', async () => {
    await putEarthquakes(db, [
      makeEvent('older', '2026-11-08T01:00:00Z'),
      makeEvent('newer', '2026-11-08T03:00:00Z'),
    ]);

    const records = await getCachedEarthquakes(db);
    expect(records.map((record) => record.event.id)).toEqual(['newer', 'older']);
    expect(records[0]?.cachedAt).toBeDefined();
  });

  it('upserts an event with the same id', async () => {
    await putEarthquakes(db, [makeEvent('event-1', '2026-11-08T01:00:00Z')]);
    await putEarthquakes(db, [
      {
        ...makeEvent('event-1', '2026-11-08T01:00:00Z'),
        magnitude: { value: 5.5, type: 'Mww' },
      },
    ]);

    const records = await getCachedEarthquakes(db);
    expect(records).toHaveLength(1);
    expect(records[0]?.event.magnitude?.value).toBe(5.5);
  });

  it('gets one event and clears the store', async () => {
    await putEarthquakes(db, [makeEvent('event-1', '2026-11-08T01:00:00Z')]);
    const record = await getCachedEarthquake(db, 'event-1');
    expect(record?.event.id).toBe('event-1');

    await clearCachedEarthquakes(db);
    expect(await getCachedEarthquakes(db)).toEqual([]);
  });

  it('stores and reads metadata', async () => {
    await setMeta(db, META_LAST_CATALOG_SYNC, '2026-11-08T05:00:00Z');
    expect(await getMeta<string>(db, META_LAST_CATALOG_SYNC)).toBe(
      '2026-11-08T05:00:00Z',
    );
    expect(await getMeta<string>(db, 'missing')).toBeUndefined();
  });

  it('stores provider state', async () => {
    await setProviderState(db, {
      providerId: 'usgs-earthquake-feed',
      status: 'success',
      lastAttemptAt: '2026-11-08T05:00:00Z',
      lastSuccessAt: '2026-11-08T05:00:00Z',
      lastError: null,
      nextPollAt: null,
    });

    const state = await getProviderState(db, 'usgs-earthquake-feed');
    expect(state?.status).toBe('success');
    expect(state?.lastSuccessAt).toBe('2026-11-08T05:00:00Z');
  });
});
