import { describe, expect, it } from 'vitest';
import { sampleEarthquakes } from '../../data/providers/sample/fixtures';
import {
  BASEMAP_OPTIONS,
  GSI_TILE_URLS,
  toEarthquakeFeatureCollection,
} from './mapStyle';

describe('basemap options', () => {
  it('provides GSI pale, GSI standard, and Natural Earth options', () => {
    expect(BASEMAP_OPTIONS.map((option) => option.id)).toEqual([
      'gsi-pale',
      'gsi-std',
      'natural-earth',
    ]);
    expect(GSI_TILE_URLS['gsi-pale']).toContain(
      'cyberjapandata.gsi.go.jp/xyz/pale',
    );
    expect(GSI_TILE_URLS['gsi-std']).toContain(
      'cyberjapandata.gsi.go.jp/xyz/std',
    );
  });
});

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
