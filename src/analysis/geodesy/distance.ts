/**
 * Geodetic distance helpers.
 *
 * Surface distance uses the haversine formula on a sphere with the IUGG mean
 * Earth radius. Hypocentral distance uses WGS84 ECEF coordinates with depth
 * positive downwards. Coordinates are Float64.
 */
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface Hypocenter extends GeoPoint {
  depthKm?: number;
}

export interface ProfileCoordinates {
  /** Distance from the profile start along the great-circle bearing, in km. */
  alongKm: number;
  /** Signed offset perpendicular to the profile, in km. */
  crossKm: number;
}

export const EARTH_RADIUS_KM = 6371.0088;

const WGS84_A_M = 6378137;
const WGS84_F = 1 / 298.257223563;
const WGS84_E2 = WGS84_F * (2 - WGS84_F);

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

function assertFinitePoint(point: GeoPoint): void {
  if (
    !Number.isFinite(point.latitude) ||
    !Number.isFinite(point.longitude) ||
    point.latitude < -90 ||
    point.latitude > 90 ||
    point.longitude < -180 ||
    point.longitude > 180
  ) {
    throw new Error('緯度経度が範囲外または非有限値です。');
  }
}

export function haversineDistanceKm(a: GeoPoint, b: GeoPoint): number {
  assertFinitePoint(a);
  assertFinitePoint(b);

  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const dLat = lat2 - lat1;
  const dLon = toRadians(b.longitude - a.longitude);

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = Math.min(
    1,
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon,
  );

  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function initialBearingRad(a: GeoPoint, b: GeoPoint): number {
  assertFinitePoint(a);
  assertFinitePoint(b);

  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return Math.atan2(y, x);
}

/**
 * Projects a point into a local profile coordinate system.
 *
 * The local tangent-plane approximation is appropriate for regional profiles
 * (hundreds to a few thousand km). It is not a global map projection.
 */
export function toProfileCoordinates(
  point: GeoPoint,
  start: GeoPoint,
  bearingRad: number,
): ProfileCoordinates {
  assertFinitePoint(point);
  assertFinitePoint(start);

  const lat0 = toRadians(start.latitude);
  const eastKm =
    EARTH_RADIUS_KM *
    toRadians(point.longitude - start.longitude) *
    Math.cos(lat0);
  const northKm =
    EARTH_RADIUS_KM * toRadians(point.latitude - start.latitude);

  const sinBearing = Math.sin(bearingRad);
  const cosBearing = Math.cos(bearingRad);

  return {
    alongKm: eastKm * sinBearing + northKm * cosBearing,
    crossKm: eastKm * cosBearing - northKm * sinBearing,
  };
}

export function ecefFromGeodetic(
  point: Hypocenter,
): { x: number; y: number; z: number } {
  assertFinitePoint(point);
  if (point.depthKm !== undefined && !Number.isFinite(point.depthKm)) {
    throw new Error('深さが非有限値です。');
  }

  const lat = toRadians(point.latitude);
  const lon = toRadians(point.longitude);
  const heightM = -(point.depthKm ?? 0) * 1000;
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const n = WGS84_A_M / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);

  return {
    x: (n + heightM) * cosLat * Math.cos(lon),
    y: (n + heightM) * cosLat * Math.sin(lon),
    z: (n * (1 - WGS84_E2) + heightM) * sinLat,
  };
}

export function hypocentralDistanceKm(
  a: Hypocenter,
  b: Hypocenter,
): number {
  const pa = ecefFromGeodetic(a);
  const pb = ecefFromGeodetic(b);
  const dx = pa.x - pb.x;
  const dy = pa.y - pb.y;
  const dz = pa.z - pb.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) / 1000;
}

export function bearingDegrees(a: GeoPoint, b: GeoPoint): number {
  return (toDegrees(initialBearingRad(a, b)) + 360) % 360;
}
