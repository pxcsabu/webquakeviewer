import { describe, expect, it } from 'vitest';
import type { Earthquake } from '../../domain/earthquake/types';
import {
  DEFAULT_EARTHQUAKE_FILTERS,
  filterEarthquakes,
  sortEarthquakesByTime,
} from './filters';

function makeEvent(
  id: string,
  originTime: string,
  magnitude: number | undefined,
  depthKm: number | undefined,
): Earthquake {
  return {
    id,
    source: {
      provider: 'Test Provider',
      dataset: 'test-dataset',
      originalId: id,
      retrievedAt: '2026-01-01T12:00:00Z',
    },
    time: { originTime },
    location: {
      latitude: 35,
      longitude: 139,
      ...(depthKm !== undefined ? { depthKm } : {}),
      crs: 'WGS84',
    },
    ...(magnitude !== undefined ? { magnitude: { value: magnitude } } : {}),
    classification: 'OBSERVED',
  };
}

const now = new Date('2026-01-01T12:00:00Z');
const events = [
  makeEvent('recent-shallow', '2026-01-01T11:30:00Z', 4.8, 20),
  makeEvent('older-deep', '2026-01-01T10:00:00Z', 3.2, 120),
  makeEvent('old-missing', '2025-12-31T11:00:00Z', undefined, undefined),
];

describe('filterEarthquakes', () => {
  it('keeps all events by default', () => {
    expect(
      filterEarthquakes(events, DEFAULT_EARTHQUAKE_FILTERS, now).map(
        (event) => event.id,
      ),
    ).toEqual(['recent-shallow', 'older-deep', 'old-missing']);
  });

  it('filters by time range relative to the supplied clock', () => {
    expect(
      filterEarthquakes(
        events,
        { ...DEFAULT_EARTHQUAKE_FILTERS, timeRange: '1h' },
        now,
      ).map((event) => event.id),
    ).toEqual(['recent-shallow']);

    expect(
      filterEarthquakes(
        events,
        { ...DEFAULT_EARTHQUAKE_FILTERS, timeRange: '24h' },
        now,
      ).map((event) => event.id),
    ).toEqual(['recent-shallow', 'older-deep']);
  });

  it('filters by minimum magnitude and excludes unknown magnitudes', () => {
    expect(
      filterEarthquakes(
        events,
        { ...DEFAULT_EARTHQUAKE_FILTERS, minMagnitude: 4 },
        now,
      ).map((event) => event.id),
    ).toEqual(['recent-shallow']);
  });

  it('filters by maximum depth and excludes unknown depths', () => {
    expect(
      filterEarthquakes(
        events,
        { ...DEFAULT_EARTHQUAKE_FILTERS, maxDepthKm: 30 },
        now,
      ).map((event) => event.id),
    ).toEqual(['recent-shallow']);
  });

  it('combines filters', () => {
    expect(
      filterEarthquakes(
        events,
        { timeRange: '24h', minMagnitude: 4, maxDepthKm: 30 },
        now,
      ).map((event) => event.id),
    ).toEqual(['recent-shallow']);
  });
});

describe('sortEarthquakesByTime', () => {
  it('sorts newest first without mutating the input', () => {
    const input = [events[1]!, events[0]!, events[2]!];
    const sorted = sortEarthquakesByTime(input);
    expect(sorted.map((event) => event.id)).toEqual([
      'recent-shallow',
      'older-deep',
      'old-missing',
    ]);
    expect(input[0]?.id).toBe('older-deep');
  });
});
