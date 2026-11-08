/**
 * Data classification required by DESIGN.md and docs/SCIENCE.md.
 *
 * A value must never be presented as OBSERVED unless it comes directly from a
 * source that publishes it as an observation.
 */
export type DataClassification =
  | 'OBSERVED'
  | 'CALCULATED'
  | 'ESTIMATED'
  | 'SIMULATED'
  | 'MODEL'
  | 'ILLUSTRATIVE'
  | 'UNAVAILABLE';

/**
 * Supported coordinate reference system identifiers.
 *
 * Unknown coordinate systems must remain UNKNOWN. Do not label them WGS84
 * without documented evidence.
 */
export type CoordinateReferenceSystem =
  | 'WGS84'
  | 'JGD2000'
  | 'JGD2011'
  | 'TOKYO_DATUM'
  | 'UNKNOWN';

/**
 * Original depth value with its source unit preserved.
 */
export interface OriginalDepth {
  value: number;
  unit: string;
}

/**
 * Original coordinates and depth exactly as supplied by the provider.
 */
export interface OriginalLocation {
  latitude: number;
  longitude: number;
  depth?: OriginalDepth;
  crs: CoordinateReferenceSystem;
}

/**
 * Normalized location.
 *
 * depthKm is positive downwards. The original depth, including its unit and
 * CRS, is preserved in `original` when a provider supplies it.
 */
export interface EarthquakeLocation {
  latitude: number;
  longitude: number;
  depthKm?: number;
  crs: CoordinateReferenceSystem;
  original?: OriginalLocation;
}

/**
 * Source provenance. A real observation must have a retrieval timestamp.
 * Null is permitted only for explicitly labeled ILLUSTRATIVE fixtures.
 */
export interface EarthquakeSource {
  provider: string;
  dataset: string;
  originalId: string;
  retrievedAt: string | null;
  updatedAt?: string;
  sourceUrl?: string;
  attribution?: string;
  license?: string;
}

export interface EarthquakeTime {
  /** Origin time normalized to UTC ISO 8601. */
  originTime: string;
  /** Timestamp exactly as supplied by the provider, when available. */
  originalTime?: string;
  /** Timezone description supplied by the provider, when available. */
  originalTimezone?: string;
}

export interface EarthquakeMagnitude {
  value: number;
  /** Original magnitude scale/type, for example Mww, mb, or ML. */
  type?: string;
  uncertainty?: number;
}

/**
 * Japanese seismic intensity is an ordinal category, not a linear measurement.
 * The display value and the sorting rank are stored separately.
 */
export interface SeismicIntensity {
  display: IntensityDisplay;
  rank: number;
}

export interface Earthquake {
  id: string;
  source: EarthquakeSource;
  time: EarthquakeTime;
  location: EarthquakeLocation;
  magnitude?: EarthquakeMagnitude;
  intensity?: SeismicIntensity;
  classification: DataClassification;
}

export const INTENSITY_RANK_BY_DISPLAY = {
  '0': 0,
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5-': 5,
  '5+': 6,
  '6-': 7,
  '6+': 8,
  '7': 9,
} as const;

export type IntensityDisplay = keyof typeof INTENSITY_RANK_BY_DISPLAY;

export const DATA_CLASSIFICATIONS: readonly DataClassification[] = [
  'OBSERVED',
  'CALCULATED',
  'ESTIMATED',
  'SIMULATED',
  'MODEL',
  'ILLUSTRATIVE',
  'UNAVAILABLE',
];

export const COORDINATE_REFERENCE_SYSTEMS: readonly CoordinateReferenceSystem[] =
  ['WGS84', 'JGD2000', 'JGD2011', 'TOKYO_DATUM', 'UNKNOWN'];

export function rankForIntensityDisplay(
  display: IntensityDisplay,
): number {
  return INTENSITY_RANK_BY_DISPLAY[display];
}
