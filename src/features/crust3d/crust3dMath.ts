import { Vector3 } from 'three';
import { depthToY, latToZ, lonToX } from './crust3dStyle';

/**
 * Convert a geographic location to the local block coordinate system.
 * X = east, Y = up (negative for depth), Z = south.
 */
export function lonLatToPosition(
  latitude: number,
  longitude: number,
  y = 0,
): Vector3 {
  return new Vector3(lonToX(longitude), y, latToZ(latitude));
}

export function lonLatDepthToPosition(
  latitude: number,
  longitude: number,
  depthKm: number | undefined,
): Vector3 {
  return lonLatToPosition(latitude, longitude, depthToY(depthKm));
}
