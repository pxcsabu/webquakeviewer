import { describe, expect, it } from 'vitest';
import { sampleEarthquakes } from '../../data/providers/sample/fixtures';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import {
  BASEMAP_OPTIONS,
  GSI_TILE_URLS,
  INTENSITY_COLOR_BY_DISPLAY,
  toEarthquakeFeatureCollection,
  toIntensityFeatureCollection,
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


describe('toIntensityFeatureCollection', () => {
  const prefectures: FeatureCollection<Polygon | MultiPolygon> = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { code: '13', name_ja: '東京都' },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [139, 35],
              [140, 35],
              [140, 36],
              [139, 36],
              [139, 35],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: { code: '14', name_ja: '神奈川県' },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [139, 35],
              [140, 35],
              [140, 35.5],
              [139, 35.5],
              [139, 35],
            ],
          ],
        },
      },
    ],
  };

  it('keeps only prefectures reported for the selected event', () => {
    const event = sampleEarthquakes[0];
    if (event === undefined) {
      throw new Error('サンプルフィクスチャが空です。');
    }
    const collection = toIntensityFeatureCollection(prefectures, {
      ...event,
      intensityAreas: [
        {
          prefectureCode: '13',
          maxIntensity: { display: '4', rank: 4 },
        },
      ],
    });
    expect(collection.features).toHaveLength(1);
    expect(collection.features[0]?.properties).toEqual({
      code: '13',
      nameJa: '東京都',
      intensityDisplay: '4',
      intensityRank: 4,
      intensityColor: INTENSITY_COLOR_BY_DISPLAY['4'],
    });
  });

  it('returns an empty collection without an event or intensity areas', () => {
    const event = sampleEarthquakes[0];
    if (event === undefined) {
      throw new Error('サンプルフィクスチャが空です。');
    }
    expect(toIntensityFeatureCollection(prefectures, null).features).toEqual(
      [],
    );
    expect(
      toIntensityFeatureCollection(prefectures, {
        ...event,
        intensityAreas: undefined,
      }).features,
    ).toEqual([]);
  });
});
