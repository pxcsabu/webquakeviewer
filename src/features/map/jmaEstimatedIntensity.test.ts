import { describe, expect, it } from 'vitest';
import type { Earthquake } from '../../domain/earthquake/types';
import {
  estimatedMeshBounds,
  estimatedMeshUrl,
  findJmaEstimatedEntry,
  parseJmaEstimatedList,
} from './jmaEstimatedIntensity';

const list = [
  {
    url: '202611080104_443',
    mesh_num: ['5137', '5138', 'bad'],
    datum: 2,
    bounds: [
      [34.6, 136.57],
      [35.9, 138.24],
    ],
    hypo: {
      at: '2026-11-08T01:04:00',
      lat: 34.93,
      lon: 137.66,
      dep: 40,
      mag: 5.7,
      epi: '静岡県西部',
      maxi: 5.0,
    },
  },
];

function jmaEvent(id: string): Earthquake {
  return {
    id: `jma:${id}`,
    source: {
      provider: 'JMA',
      dataset: 'test',
      originalId: id,
      retrievedAt: '2026-11-09T00:00:00Z',
    },
    time: { originTime: '2026-11-07T16:04:00Z' },
    location: { latitude: 34.935, longitude: 137.658, depthKm: 41, crs: 'UNKNOWN' },
    classification: 'OBSERVED',
  };
}

describe('JMA estimated intensity metadata', () => {
  it('parses usable entries and drops malformed mesh IDs', () => {
    const entries = parseJmaEstimatedList(list);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.meshNum).toEqual(['5137', '5138']);
    expect(entries[0]?.datum).toBe(2);
  });

  it('matches by the JMA event-ID minute prefix', () => {
    const entries = parseJmaEstimatedList(list);
    expect(findJmaEstimatedEntry(jmaEvent('20261108010441'), entries)?.url).toBe(
      '202611080104_443',
    );
    expect(findJmaEstimatedEntry(jmaEvent('20261108010541'), entries)).toBeNull();
    expect(
      findJmaEstimatedEntry(
        {
          ...jmaEvent('20261108010441'),
          source: {
            ...jmaEvent('20261108010441').source,
            provider: 'USGS',
          },
        },
        entries,
      ),
    ).toBeNull();
  });

  it('decodes a 250m mesh tile and returns MapLibre image coordinates', () => {
    expect(estimatedMeshBounds('5137', 2)).toEqual([
      [137, 34 + 40 / 60],
      [138, 34 + 40 / 60],
      [138, 34],
      [137, 34],
    ]);
    expect(estimatedMeshBounds('bad')).toBeNull();
    const transformed = estimatedMeshBounds('5137');
    expect(transformed).not.toBeNull();
    expect(transformed?.[0]?.[0]).toBeCloseTo(136.9971, 3);
  });

  it('builds the official JMA tile URL', () => {
    const entry = parseJmaEstimatedList(list)[0];
    if (entry === undefined) {
      throw new Error('entry missing');
    }
    expect(estimatedMeshUrl(entry, '5137')).toBe(
      'https://www.jma.go.jp/bosai/estimated_intensity_map/data/202611080104_443/5137.png',
    );
  });
});
