import type { StyleSpecification } from 'maplibre-gl';
import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { Feature, FeatureCollection, Point, Polygon } from 'geojson';
import type { Earthquake } from '../../domain/earthquake/types';
import { JAPAN_REGION_BOUNDS } from '../../domain/geography/japanRegion';

export const MAP_BACKGROUND_COLOR = '#eef2f5';
export const MAP_LAND_COLOR = '#e4e9ed';
export const MAP_BOUNDARY_COLOR = '#aeb9c3';
export const MAP_REGION_COLOR = '#165a8a';
export const MAP_MISSING_DEPTH_COLOR = '#7f8c8d';

export const DEPTH_CLASSES = [
  { label: '0–30 km', color: '#c0392b' },
  { label: '30–100 km', color: '#d68910' },
  { label: '100–300 km', color: '#2e86c1' },
  { label: '300 km 以上', color: '#6c3483' },
  { label: '深さ不明', color: MAP_MISSING_DEPTH_COLOR },
] as const;

export const BASE_MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': MAP_BACKGROUND_COLOR,
      },
    },
  ],
};

const bounds = JAPAN_REGION_BOUNDS;

export const JAPAN_REGION_POLYGON: Feature<Polygon> = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [bounds.minLongitude, bounds.minLatitude],
        [bounds.maxLongitude, bounds.minLatitude],
        [bounds.maxLongitude, bounds.maxLatitude],
        [bounds.minLongitude, bounds.maxLatitude],
        [bounds.minLongitude, bounds.minLatitude],
      ],
    ],
  },
};

export const EARTHQUAKE_POINT_COLOR: ExpressionSpecification = [
  'case',
  ['==', ['get', 'depthKm'], null],
  MAP_MISSING_DEPTH_COLOR,
  [
    'step',
    ['get', 'depthKm'],
    '#c0392b',
    30,
    '#d68910',
    100,
    '#2e86c1',
    300,
    '#6c3483',
  ],
];

export const EARTHQUAKE_POINT_RADIUS: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['coalesce', ['get', 'magnitude'], 0],
  0,
  2.5,
  2,
  4,
  4,
  7,
  6,
  11,
  8,
  15,
];

export const SELECTED_POINT_RADIUS: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['coalesce', ['get', 'magnitude'], 0],
  0,
  6,
  2,
  8,
  4,
  11,
  6,
  15,
  8,
  19,
];

export interface EarthquakeFeatureProperties {
  id: string;
  magnitude: number | null;
  depthKm: number | null;
  place: string | null;
  time: string;
  eventType: string | null;
  classification: string;
}

export type EarthquakeFeatureCollection = FeatureCollection<
  Point,
  EarthquakeFeatureProperties
>;

export function toEarthquakeFeatureCollection(
  events: readonly Earthquake[],
): EarthquakeFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: events
      .filter(
        (event) =>
          Number.isFinite(event.location.latitude) &&
          Number.isFinite(event.location.longitude),
      )
      .map((event) => ({
        type: 'Feature',
        id: event.id,
        geometry: {
          type: 'Point',
          coordinates: [event.location.longitude, event.location.latitude],
        },
        properties: {
          id: event.id,
          magnitude: event.magnitude?.value ?? null,
          depthKm: event.location.depthKm ?? null,
          place: event.place ?? null,
          time: event.time.originTime,
          eventType: event.eventType ?? null,
          classification: event.classification,
        },
      })),
  };
}
