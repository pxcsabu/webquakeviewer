import { describe, expect, it } from 'vitest';
import {
  filterEventsInJapanRegion,
  isInJapanRegion,
  JAPAN_REGION_BOUNDS,
} from './japanRegion';

describe('Japan region filter', () => {
  it('includes representative locations in and around Japan', () => {
    expect(isInJapanRegion({ latitude: 35.6, longitude: 139.7 })).toBe(true);
    expect(isInJapanRegion({ latitude: 43.0, longitude: 141.3 })).toBe(true);
    expect(isInJapanRegion({ latitude: 26.2, longitude: 127.7 })).toBe(true);
    expect(isInJapanRegion({ latitude: 27.1, longitude: 142.2 })).toBe(true);
    expect(isInJapanRegion({ latitude: 36.2, longitude: 141.4 })).toBe(true);
  });

  it('excludes locations outside the documented rectangle', () => {
    expect(isInJapanRegion({ latitude: 37.8, longitude: -122.4 })).toBe(false);
    expect(isInJapanRegion({ latitude: -33.4, longitude: -70.6 })).toBe(false);
    expect(isInJapanRegion({ latitude: 19.9, longitude: 139.7 })).toBe(false);
    expect(isInJapanRegion({ latitude: 47.1, longitude: 139.7 })).toBe(false);
  });

  it('includes boundary values deliberately and rejects invalid numbers', () => {
    expect(
      isInJapanRegion({
        latitude: JAPAN_REGION_BOUNDS.minLatitude,
        longitude: JAPAN_REGION_BOUNDS.minLongitude,
      }),
    ).toBe(true);
    expect(
      isInJapanRegion({
        latitude: JAPAN_REGION_BOUNDS.maxLatitude,
        longitude: JAPAN_REGION_BOUNDS.maxLongitude,
      }),
    ).toBe(true);
    expect(isInJapanRegion({ latitude: Number.NaN, longitude: 139.7 })).toBe(
      false,
    );
  });

  it('filters a mixed event collection without changing event objects', () => {
    const events = [
      { id: 'japan', location: { latitude: 35.6, longitude: 139.7 } },
      { id: 'california', location: { latitude: 37.8, longitude: -122.4 } },
    ];
    const filtered = filterEventsInJapanRegion(events);
    expect(filtered.map((event) => event.id)).toEqual(['japan']);
    expect(filtered[0]).toBe(events[0]);
  });
});
