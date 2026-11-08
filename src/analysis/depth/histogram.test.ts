import { describe, expect, it } from 'vitest';
import type { Earthquake } from '../../domain/earthquake/types';
import { buildDepthHistogram } from './histogram';

function event(id: string, depthKm: number | undefined): Earthquake {
  return {
    id,
    source: {
      provider: 'Test',
      dataset: 'test',
      originalId: id,
      retrievedAt: '2026-11-08T00:00:00Z',
    },
    time: { originTime: '2026-11-08T00:00:00Z' },
    location: {
      latitude: 35,
      longitude: 139,
      ...(depthKm !== undefined ? { depthKm } : {}),
      crs: 'WGS84',
    },
    classification: 'OBSERVED',
  };
}

describe('buildDepthHistogram', () => {
  it('counts depth bins and excludes unknown depths', () => {
    const bins = buildDepthHistogram([
      event('a', 0),
      event('b', 10),
      event('c', 30),
      event('d', 120),
      event('e', 650),
      event('f', 900),
      event('g', undefined),
    ]);
    expect(bins.map((bin) => [bin.label, bin.count])).toEqual([
      ['0–30 km', 2],
      ['30–60 km', 1],
      ['60–100 km', 0],
      ['100–150 km', 1],
      ['150–300 km', 0],
      ['300–700 km', 1],
      ['700 km 以上', 1],
    ]);
  });
});
