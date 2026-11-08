import { describe, expect, it } from 'vitest';
import {
  DEPTH_DISPLAY_MAX_KM,
  depthColorHex,
  depthToRadius,
  GLOBE_RADIUS,
} from './globeStyle';
import { latLonToVector3 } from './globeMath';

describe('globe style', () => {
  it('maps depth to the display radius', () => {
    expect(depthToRadius(0)).toBe(GLOBE_RADIUS);
    expect(depthToRadius(DEPTH_DISPLAY_MAX_KM)).toBeCloseTo(0.85, 10);
    expect(depthToRadius(900)).toBeCloseTo(0.85, 10);
    expect(depthToRadius(undefined)).toBe(GLOBE_RADIUS);
  });

  it('maps depth classes to colors', () => {
    expect(depthColorHex(10)).toBe('#c0392b');
    expect(depthColorHex(50)).toBe('#d68910');
    expect(depthColorHex(200)).toBe('#2e86c1');
    expect(depthColorHex(500)).toBe('#6c3483');
    expect(depthColorHex(undefined)).toBe('#7f8c8d');
  });

  it('places the equator at y=0 and the north pole at y=R', () => {
    expect(latLonToVector3(0, 0).y).toBeCloseTo(0, 10);
    expect(latLonToVector3(90, 0).y).toBeCloseTo(GLOBE_RADIUS, 10);
    expect(latLonToVector3(0, 0).length()).toBeCloseTo(GLOBE_RADIUS, 10);
  });
});
