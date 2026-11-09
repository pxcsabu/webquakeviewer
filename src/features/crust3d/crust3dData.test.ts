import { describe, expect, it } from 'vitest';
import type { Earthquake } from '../../domain/earthquake/types';
import {
  buildEarthquakePointData,
  clipLineToBounds,
  extractPlateLines,
  extractSlabLines,
  hexToRgb,
  magnitudeToPointSize,
} from './crust3dData';
import { JAPAN_REGION_BOUNDS } from '../../domain/geography/japanRegion';
import {
  depthColorHex,
  depthToY,
  latToZ,
  lonToX,
} from './crust3dStyle';

function makeEvent(
  id: string,
  latitude: number,
  longitude: number,
  depthKm?: number,
  magnitude?: number,
): Earthquake {
  return {
    id,
    source: {
      provider: 'test',
      dataset: 'test',
      originalId: id,
      retrievedAt: '2026-01-01T00:00:00.000Z',
    },
    time: { originTime: '2026-01-01T00:00:00.000Z' },
    location: { latitude, longitude, depthKm, crs: 'UNKNOWN' },
    magnitude:
      magnitude === undefined ? undefined : { value: magnitude, type: 'M' },
    classification: 'OBSERVED',
  };
}

describe('crust3dData', () => {
  it('converts hex colours to normalised RGB', () => {
    expect(hexToRgb('#ff8000')).toEqual([1, 128 / 255, 0]);
    expect(hexToRgb('not-a-colour')).toEqual([0.5, 0.5, 0.5]);
  });

  it('scales point size by magnitude without unbounded growth', () => {
    expect(magnitudeToPointSize(undefined)).toBe(4);
    expect(magnitudeToPointSize(0)).toBe(4);
    expect(magnitudeToPointSize(5)).toBeCloseTo(10.75, 10);
    expect(magnitudeToPointSize(20)).toBe(13);
  });

  it('clips line strings to the display bounds and splits re-entry', () => {
    const segments = clipLineToBounds(
      [
        [110, 30],
        [125, 30],
        [130, 35],
        [160, 35],
        [140, 40],
        [145, 41],
      ],
      JAPAN_REGION_BOUNDS,
    );
    expect(segments).toHaveLength(2);
    expect(segments[0]).toEqual([
      { longitude: 125, latitude: 30 },
      { longitude: 130, latitude: 35 },
    ]);
    expect(segments[1]).toEqual([
      { longitude: 140, latitude: 40 },
      { longitude: 145, latitude: 41 },
    ]);
  });

  it('extracts PB2002 line strings and preserves names', () => {
    const data = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { Name: 'PA-PH' },
          geometry: {
            type: 'MultiLineString',
            coordinates: [
              [
                [130, 30],
                [140, 35],
              ],
              [
                [0, 0],
                [1, 1],
              ],
            ],
          },
        },
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'Point', coordinates: [138, 36] },
        },
      ],
    };
    const lines = extractPlateLines(data, JAPAN_REGION_BOUNDS);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.name).toBe('PA-PH');
    expect(lines[0]?.coordinates).toHaveLength(2);
  });

  it('extracts Slab2 lines with numeric depths only', () => {
    const data = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { depth: 100, region: 'Philippine' },
          geometry: {
            type: 'LineString',
            coordinates: [
              [130, 30],
              [140, 35],
            ],
          },
        },
        {
          type: 'Feature',
          properties: { depth: 'unknown' },
          geometry: {
            type: 'LineString',
            coordinates: [
              [130, 30],
              [140, 35],
            ],
          },
        },
      ],
    };
    const lines = extractSlabLines(data, JAPAN_REGION_BOUNDS);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.depthKm).toBe(100);
    expect(lines[0]?.region).toBe('Philippine');
  });

  it('builds positions and colours for in-region events', () => {
    const events = [
      makeEvent('a', 36, 138, 10, 3),
      makeEvent('b', 35, 139, 400, 5),
      makeEvent('c', 34, 137, undefined, 2),
      makeEvent('outside', 10, 100, 10, 4),
    ];
    const data = buildEarthquakePointData(events);
    expect(data.count).toBe(3);
    expect(data.eventIds).toEqual(['a', 'b', 'c']);

    expect(data.positions[0]).toBeCloseTo(lonToX(138), 6);
    expect(data.positions[1]).toBeCloseTo(depthToY(10), 6);
    expect(data.positions[2]).toBeCloseTo(latToZ(36), 6);

    expect(data.colors[0]).toBeCloseTo(hexToRgb(depthColorHex(10))[0], 6);
    expect(data.colors[3]).toBeCloseTo(hexToRgb(depthColorHex(400))[0], 6);
    expect(data.colors[6]).toBeCloseTo(
      hexToRgb(depthColorHex(undefined))[0],
      6,
    );
    expect(data.sizes[0]).toBeCloseTo(magnitudeToPointSize(3), 6);
    expect(data.sizes[1]).toBeCloseTo(magnitudeToPointSize(5), 6);
  });

  it('returns an empty point set when no events are in the region', () => {
    const data = buildEarthquakePointData([makeEvent('x', 0, 0, 10)]);
    expect(data.count).toBe(0);
    expect(data.positions).toHaveLength(0);
    expect(data.eventIds).toHaveLength(0);
  });
});
