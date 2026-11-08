import { JAPAN_REGION_BOUNDS } from '../../domain/geography/japanRegion';

/**
 * Display geometry for the Japan-limited 3D crust block.
 *
 * The block is deliberately not a globe and is not a physical voxel model.
 * Longitudes and latitudes are mapped with an equirectangular projection over
 * the operational Japan region. The horizontal aspect ratio is chosen so that
 * one degree of longitude is scaled by cos(mid-latitude), preserving the local
 * aspect near central Japan.
 *
 * Depth is shown with a near-physical vertical scale: 700 km corresponds to
 * CRUST3D_HEIGHT while the horizontal width represents roughly 3,200 km.
 * The vertical scale is a display scale, not a geodetic or geological model.
 */
export const CRUST3D_WIDTH = 4;
export const CRUST3D_MAX_DEPTH_KM = 700;
export const CRUST3D_HEIGHT = 0.9;

const MID_LATITUDE_RAD =
  ((JAPAN_REGION_BOUNDS.minLatitude + JAPAN_REGION_BOUNDS.maxLatitude) / 2) *
  (Math.PI / 180);
const LONGITUDE_SPAN =
  JAPAN_REGION_BOUNDS.maxLongitude - JAPAN_REGION_BOUNDS.minLongitude;
const LATITUDE_SPAN =
  JAPAN_REGION_BOUNDS.maxLatitude - JAPAN_REGION_BOUNDS.minLatitude;

export const CRUST3D_DEPTH =
  (CRUST3D_WIDTH * LATITUDE_SPAN) /
  (LONGITUDE_SPAN * Math.cos(MID_LATITUDE_RAD));

export const CRUST3D_TOP_Y = 0;
export const CRUST3D_BOTTOM_Y = -CRUST3D_HEIGHT;

export const CRUST3D_DEPTH_CLASSES = [
  { label: '0–30 km', color: '#c0392b' },
  { label: '30–100 km', color: '#d68910' },
  { label: '100–300 km', color: '#2e86c1' },
  { label: '300 km 以上', color: '#6c3483' },
  { label: '深さ不明', color: '#7f8c8d' },
] as const;

export const CRUST3D_MISSING_DEPTH_COLOR = '#7f8c8d';

export function isInCrust3DRegion(location: {
  latitude: number;
  longitude: number;
}): boolean {
  return (
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude) &&
    location.latitude >= JAPAN_REGION_BOUNDS.minLatitude &&
    location.latitude <= JAPAN_REGION_BOUNDS.maxLatitude &&
    location.longitude >= JAPAN_REGION_BOUNDS.minLongitude &&
    location.longitude <= JAPAN_REGION_BOUNDS.maxLongitude
  );
}

/** Longitude to local X. West is negative, east is positive. */
export function lonToX(longitude: number): number {
  const ratio =
    (longitude - JAPAN_REGION_BOUNDS.minLongitude) / LONGITUDE_SPAN;
  return (ratio - 0.5) * CRUST3D_WIDTH;
}

/**
 * Latitude to local Z. North is negative Z and south is positive Z, matching
 * the natural view direction for a map on the horizontal plane.
 */
export function latToZ(latitude: number): number {
  const ratio =
    (JAPAN_REGION_BOUNDS.maxLatitude - latitude) / LATITUDE_SPAN;
  return (ratio - 0.5) * CRUST3D_DEPTH;
}

/**
 * Depth in kilometres to display Y. 0 km is the top surface, 700 km is the
 * bottom of the block. Missing or invalid depths are placed at the surface so
 * they remain visible, but they are drawn with the missing-depth colour.
 */
export function depthToY(depthKm: number | undefined): number {
  if (
    depthKm === undefined ||
    !Number.isFinite(depthKm) ||
    depthKm < 0
  ) {
    return CRUST3D_TOP_Y;
  }
  const clamped = Math.min(depthKm, CRUST3D_MAX_DEPTH_KM);
  return CRUST3D_TOP_Y - (clamped / CRUST3D_MAX_DEPTH_KM) * CRUST3D_HEIGHT;
}

export function depthColorHex(depthKm: number | undefined): string {
  if (depthKm === undefined || !Number.isFinite(depthKm) || depthKm < 0) {
    return CRUST3D_MISSING_DEPTH_COLOR;
  }
  if (depthKm < 30) {
    return '#c0392b';
  }
  if (depthKm < 100) {
    return '#d68910';
  }
  if (depthKm < 300) {
    return '#2e86c1';
  }
  return '#6c3483';
}
