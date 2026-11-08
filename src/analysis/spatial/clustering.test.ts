import { describe, expect, it } from 'vitest';
import type { Earthquake } from '../../domain/earthquake/types';
import { clusterEvents } from './clustering';

function event(
  id: string,
  latitude: number,
  longitude: number,
  originTime = '2026-11-08T00:00:00Z',
): Earthquake {
  return {
    id,
    source: {
      provider: 'Test',
      dataset: 'test',
      originalId: id,
      retrievedAt: '2026-11-08T00:00:00Z',
    },
    time: { originTime },
    location: { latitude, longitude, crs: 'WGS84' },
    magnitude: { value: 3 },
    classification: 'OBSERVED',
  };
}

describe('clusterEvents (DBSCAN)', () => {
  it('finds a dense group and leaves an isolated point as noise', () => {
    const result = clusterEvents(
      [
        event('a', 35.0, 139.0),
        event('b', 35.01, 139.01),
        event('c', 35.02, 139.02),
        event('far', 40.0, 140.0),
      ],
      { epsKm: 10, minPts: 3 },
    );
    expect(result.clusters).toHaveLength(1);
    expect(result.clusters[0]?.events).toHaveLength(3);
    expect(result.noiseCount).toBe(1);
  });

  it('respects minPts and eps', () => {
    const points = [
      event('a', 35.0, 139.0),
      event('b', 35.0, 139.7),
    ];
    expect(
      clusterEvents(points, { epsKm: 50, minPts: 2 }).clusters,
    ).toHaveLength(0);
    expect(
      clusterEvents(points, { epsKm: 70, minPts: 2 }).clusters,
    ).toHaveLength(1);
  });

  it('returns no clusters for empty input', () => {
    const result = clusterEvents([], { epsKm: 50, minPts: 3 });
    expect(result.clusters).toEqual([]);
    expect(result.noiseCount).toBe(0);
  });

  it('is deterministic for the same catalog', () => {
    const events = [
      event('a', 35.0, 139.0, '2026-11-08T00:00:00Z'),
      event('b', 35.01, 139.01, '2026-11-08T01:00:00Z'),
      event('c', 35.02, 139.02, '2026-11-08T02:00:00Z'),
    ];
    const first = clusterEvents(events, { epsKm: 10, minPts: 3 });
    const second = clusterEvents(events, { epsKm: 10, minPts: 3 });
    expect(first.clusters[0]?.events.map((item) => item.id)).toEqual(
      second.clusters[0]?.events.map((item) => item.id),
    );
  });
});
