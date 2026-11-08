import { describe, expect, it } from 'vitest';
import type { Earthquake } from '../../domain/earthquake/types';
import type { SlabContourCollection } from './profile';
import {
  buildCrossSection,
  groupSlabIntersectionsByRegion,
} from './profile';

function makeEvent(
  id: string,
  latitude: number,
  longitude: number,
  depthKm: number | undefined,
): Earthquake {
  return {
    id,
    source: {
      provider: 'Test Provider',
      dataset: 'test-dataset',
      originalId: id,
      retrievedAt: '2026-11-08T00:00:00Z',
    },
    time: { originTime: '2026-11-08T00:00:00Z' },
    location: {
      latitude,
      longitude,
      ...(depthKm !== undefined ? { depthKm } : {}),
      crs: 'WGS84',
    },
    classification: 'OBSERVED',
  };
}

const contours: SlabContourCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { depth: 50, region: 'Test Slab' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [0.4, -1],
          [0.4, 1],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { depth: 70, region: 'Test Slab' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [0.6, -1],
          [0.6, 1],
        ],
      },
    },
  ],
};

describe('buildCrossSection', () => {
  const start = { latitude: 0, longitude: 0 };
  const end = { latitude: 0, longitude: 1 };

  it('projects events into the profile corridor and excludes edge cases', () => {
    const events = [
      makeEvent('inside', 0, 0.5, 20),
      makeEvent('edge', 0.5, 0.5, 30),
      makeEvent('outside', 1, 0.5, 40),
      makeEvent('missing-depth', 0, 0.5, undefined),
    ];
    const result = buildCrossSection(events, contours, start, end, 100);

    expect(result.events.map((item) => item.event.id)).toEqual([
      'inside',
      'edge',
    ]);
    expect(result.events[0]?.alongKm).toBeCloseTo(55.6, 0);
    expect(result.exclusions.missingDepth).toBe(1);
    expect(result.exclusions.outsideCorridor).toBe(1);
  });

  it('intersects Slab2 contours with the profile', () => {
    const result = buildCrossSection([], contours, start, end, 100);
    expect(result.slabIntersections).toHaveLength(2);
    expect(result.slabIntersections[0]?.region).toBe('Test Slab');
    expect(result.slabIntersections[0]?.depthKm).toBe(50);
    expect(result.slabIntersections[0]?.alongKm).toBeCloseTo(44.5, 0);
    expect(result.slabIntersections[1]?.depthKm).toBe(70);
  });

  it('groups slab intersections by region in along-profile order', () => {
    const result = buildCrossSection([], contours, start, end, 100);
    const grouped = groupSlabIntersectionsByRegion(
      result.slabIntersections,
    );
    const slab = grouped.get('Test Slab');
    expect(slab?.map((intersection) => intersection.depthKm)).toEqual([
      50, 70,
    ]);
  });

  it('does not create intersections for contours parallel to the profile', () => {
    const parallel: SlabContourCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { depth: 10, region: 'Parallel' },
          geometry: {
            type: 'LineString',
            coordinates: [
              [0, 0],
              [1, 0],
            ],
          },
        },
      ],
    };
    const result = buildCrossSection([], parallel, start, end, 100);
    expect(result.slabIntersections).toEqual([]);
  });
});
