import { Vector3 } from 'three';
import { GLOBE_RADIUS } from './globeStyle';

export function latLonToVector3(
  latitude: number,
  longitude: number,
  radius = GLOBE_RADIUS,
): Vector3 {
  const phi = ((90 - latitude) * Math.PI) / 180;
  const theta = ((longitude + 180) * Math.PI) / 180;
  return new Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

