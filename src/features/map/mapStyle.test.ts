import { describe, expect, it } from 'vitest';
import { sampleEarthquakes } from '../../data/providers/sample/fixtures';
import { toEarthquakeFeatureCollection } from './mapStyle';

describe('toEarthquakeFeatureCollection', () => {
  it('uses GeoJSON longitude, latitude order', () => {
    const event = sampleEarthquakes[0];
    if (event === undefined) {
      throw new Error('サンプルフィクスチャが空です。');
    }

    const collection = toEarthquakeFeatureCollection([event]);
    const feature = collection.features[0];
    expect(feature?.geometry.coordinates).toEqual([
      event.location.longitude,
      event.location.latitude,
    ]);
    expect(feature?.properties.id).toBe(event.id);
    expect(feature?.properties.magnitude).toBe(4.8);
    expect(feature?.properties.depthKm).toBe(42.5);
    expect(feature?.properties.classification).toBe('ILLUSTRATIVE');
  });

  it('represents unavailable magnitude and depth as null, not zero', () => {
    const event = sampleEarthquakes[0];
    if (event === undefined) {
      throw new Error('サンプルフィクスチャが空です。');
    }

    const collection = toEarthquakeFeatureCollection([
      {
        ...event,
        magnitude: undefined,
        location: {
          ...event.location,
          depthKm: undefined,
        },
      },
    ]);

    expect(collection.features[0]?.properties.magnitude).toBeNull();
    expect(collection.features[0]?.properties.depthKm).toBeNull();
  });

  it('does not mutate the source event collection', () => {
    const before = sampleEarthquakes.length;
    toEarthquakeFeatureCollection(sampleEarthquakes);
    expect(sampleEarthquakes.length).toBe(before);
  });
});
