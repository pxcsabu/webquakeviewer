import { describe, expect, it } from 'vitest';
import { ProviderError } from '../errors';
import { usgsFixture } from './fixtures';
import { parseUsgsGeoJson } from './parseUsgsGeoJson';

const options = {
  retrievedAt: '2026-01-01T12:00:00Z',
  dataset: 'test-dataset',
};

describe('parseUsgsGeoJson', () => {
  it('maps [longitude, latitude, depth] without swapping axes', () => {
    const result = parseUsgsGeoJson(usgsFixture, options);
    expect(result.events).toHaveLength(2);

    const event = result.events[0];
    expect(event?.id).toBe('usgs:us-test-1');
    expect(event?.source.originalId).toBe('us-test-1');
    expect(event?.source.provider).toBe('USGS');
    expect(event?.source.retrievedAt).toBe(options.retrievedAt);
    expect(event?.source.updatedAt).toBe('2026-01-01T00:05:00.000Z');
    expect(event?.location.latitude).toBe(35.6);
    expect(event?.location.longitude).toBe(139.7);
    expect(event?.location.depthKm).toBe(42.5);
    expect(event?.location.crs).toBe('WGS84');
    expect(event?.location.original?.depth).toEqual({
      value: 42.5,
      unit: 'km',
    });
    expect(event?.magnitude).toEqual({ value: 4.8, type: 'mww' });
    expect(event?.place).toBe('Test region A');
    expect(event?.eventType).toBe('earthquake');
    expect(event?.classification).toBe('OBSERVED');
    expect(result.sourceUpdatedAt).toBe('2026-01-01T00:06:40.000Z');
  });

  it('preserves negative depth and reports a warning', () => {
    const result = parseUsgsGeoJson(usgsFixture, options);
    expect(result.events[1]?.location.depthKm).toBe(-1.2);
    expect(result.events[1]?.eventType).toBe('quarry blast');
    expect(
      result.warnings.some((warning) => warning.includes('深さが負')),
    ).toBe(true);
  });

  it('treats a null depth as unavailable rather than zero', () => {
    const fixture = {
      ...usgsFixture,
      features: [
        {
          ...usgsFixture.features[0],
          geometry: {
            type: 'Point',
            coordinates: [139.7, 35.6, null],
          },
        },
      ],
    };
    const result = parseUsgsGeoJson(fixture, options);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.location.depthKm).toBeUndefined();
  });

  it('skips malformed features without dropping valid ones', () => {
    const firstFeature = usgsFixture.features[0];
    if (firstFeature === undefined) {
      throw new Error('USGS テストフィクスチャが空です。');
    }

    const fixture = {
      ...usgsFixture,
      features: [
        {
          ...firstFeature,
          properties: {
            ...firstFeature.properties,
            time: 'not-a-time',
          },
        },
        usgsFixture.features[1],
      ],
    };
    const result = parseUsgsGeoJson(fixture, options);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.source.originalId).toBe('us-test-2');
    expect(result.warnings.some((warning) => warning.includes('time'))).toBe(
      true,
    );
  });

  it('rejects a non-GeoJSON root instead of silently returning empty data', () => {
    expect(() =>
      parseUsgsGeoJson({ type: 'Feature' }, options),
    ).toThrow(ProviderError);
  });
});
