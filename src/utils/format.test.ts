import { describe, expect, it } from 'vitest';
import {
  formatCoordinates,
  formatCount,
  formatDepthKm,
  formatJstTimestamp,
  formatLatitude,
  formatLongitude,
  formatMagnitude,
  formatUtcTimestamp,
} from './format';

describe('format', () => {
  it('formats UTC and JST timestamps explicitly', () => {
    expect(formatUtcTimestamp('2026-11-08T05:00:00Z')).toBe(
      '2026-11-08 05:00:00 UTC',
    );
    expect(formatJstTimestamp('2026-11-08T05:00:00Z')).toBe(
      '2026-11-08 14:00:00 JST',
    );
  });

  it('returns a clear unknown value for invalid timestamps', () => {
    expect(formatUtcTimestamp('not-a-date')).toBe('不明');
    expect(formatJstTimestamp('not-a-date')).toBe('不明');
  });

  it('formats depth with one decimal place', () => {
    expect(formatDepthKm(42.5)).toBe('42.5 km');
    expect(formatDepthKm(-1.2)).toBe('-1.2 km');
    expect(formatDepthKm(undefined)).toBe('不明');
    expect(formatDepthKm(Number.NaN)).toBe('不明');
  });

  it('keeps the magnitude type visible', () => {
    expect(formatMagnitude({ value: 4.8, type: 'Mww' })).toBe('M4.8 (Mww)');
    expect(formatMagnitude({ value: 4.8 })).toBe('M4.8');
    expect(formatMagnitude(undefined)).toBe('不明');
  });

  it('formats coordinates with hemispheres', () => {
    expect(formatLatitude(35.6)).toBe('35.600°N');
    expect(formatLatitude(-35.6)).toBe('35.600°S');
    expect(formatLongitude(139.7)).toBe('139.700°E');
    expect(formatLongitude(-139.7)).toBe('139.700°W');
    expect(
      formatCoordinates({
        latitude: 35.6,
        longitude: 139.7,
        crs: 'WGS84',
      }),
    ).toBe('35.600°N, 139.700°E');
  });

  it('formats counts for display', () => {
    expect(formatCount(1234)).toBe('1,234');
  });
});
