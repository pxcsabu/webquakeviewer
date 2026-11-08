import type { StyleSpecification } from 'maplibre-gl';
import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec';
import type {
  Feature,
  FeatureCollection,
  Point,
  Polygon,
} from 'geojson';
import type { GeoPoint } from '../../analysis/geodesy/distance';
import type { Earthquake } from '../../domain/earthquake/types';
import { JAPAN_REGION_BOUNDS } from '../../domain/geography/japanRegion';


export const JSHIS_HAZARD_TILE_URL =
  'https://www.j-shis.bosai.go.jp/map/wms/pshm/Y2020?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX={bbox-epsg-3857}&CRS=EPSG:3857&WIDTH=256&HEIGHT=256&LAYERS=P-Y2020-MAP-AVR-TTL_MTTL-T30_I55_PS&FORMAT=image/png&TRANSPARENT=TRUE';

export const JSHIS_ATTRIBUTION =
  'J-SHIS 地震ハザードステーション（防災科研）';

export const JSHIS_URL = 'https://www.j-shis.bosai.go.jp/map/';

export const SLAB2_ATTRIBUTION =
  'USGS Slab2 depth contours (Hayes et al., 2018)';

export const PB2002_ATTRIBUTION =
  'PB2002 plate boundaries (Bird 2003; Nordpil, ODC-By 1.0)';

export const PLATE_BOUNDARY_COLOR = '#7d3c98';

export const MAP_BACKGROUND_COLOR = '#eef2f5';
export const MAP_LAND_COLOR = '#e4e9ed';
export const MAP_BOUNDARY_COLOR = '#aeb9c3';
export const MAP_REGION_COLOR = '#165a8a';
export const MAP_MISSING_DEPTH_COLOR = '#7f8c8d';

export type BasemapId = 'gsi-pale' | 'gsi-std' | 'natural-earth';

export interface BasemapOption {
  id: BasemapId;
  label: string;
  attribution: string;
}

export const GSI_TILE_LIST_URL =
  'https://maps.gsi.go.jp/development/ichiran.html';

export const GSI_ATTRIBUTION = '国土地理院 (地理院タイル)';

export const GSI_TILE_URLS: Record<'gsi-pale' | 'gsi-std', string> = {
  'gsi-pale': 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png',
  'gsi-std': 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png',
};

export const BASEMAP_OPTIONS: readonly BasemapOption[] = [
  {
    id: 'gsi-pale',
    label: '地理院 淡色',
    attribution: GSI_ATTRIBUTION,
  },
  {
    id: 'gsi-std',
    label: '地理院 標準',
    attribution: GSI_ATTRIBUTION,
  },
  {
    id: 'natural-earth',
    label: 'Natural Earth',
    attribution: 'Natural Earth (public domain)',
  },
];

export const DEFAULT_BASEMAP: BasemapId = 'gsi-pale';

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


export function toProfileFeatureCollection(
  start: GeoPoint | null,
  end: GeoPoint | null,
): FeatureCollection {
  const features: Feature[] = [];
  if (start !== null && end !== null) {
    features.push({
      type: 'Feature',
      properties: { role: 'profile-line' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [start.longitude, start.latitude],
          [end.longitude, end.latitude],
        ],
      },
    });
  }
  if (start !== null) {
    features.push({
      type: 'Feature',
      properties: { role: 'start' },
      geometry: {
        type: 'Point',
        coordinates: [start.longitude, start.latitude],
      },
    });
  }
  if (end !== null) {
    features.push({
      type: 'Feature',
      properties: { role: 'end' },
      geometry: {
        type: 'Point',
        coordinates: [end.longitude, end.latitude],
      },
    });
  }
  return { type: 'FeatureCollection', features };
}
