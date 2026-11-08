import { describe, expect, it } from 'vitest';
import {
  CRUST3D_DEPTH,
  CRUST3D_HEIGHT,
  CRUST3D_MAX_DEPTH_KM,
  CRUST3D_WIDTH,
  depthColorHex,
  depthToY,
  isInCrust3DRegion,
  latToZ,
  lonToX,
} from './crust3dStyle';

describe('crust3dStyle', () => {
  it('maps the west and east bounds to the block width', () => {
    expect(lonToX(120)).toBeCloseTo(-CRUST3D_WIDTH / 2, 10);
    expect(lonToX(155)).toBeCloseTo(CRUST3D_WIDTH / 2, 10);
    expect(lonToX(137.5)).toBeCloseTo(0, 10);
  });

  it('maps north to negative Z and south to positive Z', () => {
    expect(latToZ(47)).toBeCloseTo(-CRUST3D_DEPTH / 2, 10);
    expect(latToZ(20)).toBeCloseTo(CRUST3D_DEPTH / 2, 10);
    expect(Math.abs(latToZ(33.5))).toBeLessThan(CRUST3D_DEPTH / 4);
  });

  it('maps depth to the bottom of the block', () => {
    expect(depthToY(0)).toBe(0);
    expect(depthToY(CRUST3D_MAX_DEPTH_KM)).toBeCloseTo(-CRUST3D_HEIGHT, 10);
    expect(depthToY(350)).toBeCloseTo(-CRUST3D_HEIGHT / 2, 10);
  });

  it('clamps invalid and excessive depths', () => {
    expect(depthToY(undefined)).toBe(0);
    expect(depthToY(-1)).toBe(0);
    expect(depthToY(Number.NaN)).toBe(0);
    expect(depthToY(2000)).toBeCloseTo(-CRUST3D_HEIGHT, 10);
  });

  it('uses the shared depth classes and a missing-depth colour', () => {
    expect(depthColorHex(10)).toBe('#c0392b');
    expect(depthColorHex(30)).toBe('#d68910');
    expect(depthColorHex(100)).toBe('#2e86c1');
    expect(depthColorHex(300)).toBe('#6c3483');
    expect(depthColorHex(undefined)).toBe('#7f8c8d');
  });

  it('checks the operational Japan region', () => {
    expect(isInCrust3DRegion({ latitude: 36, longitude: 138 })).toBe(true);
    expect(isInCrust3DRegion({ latitude: 20, longitude: 120 })).toBe(true);
    expect(isInCrust3DRegion({ latitude: 19.9, longitude: 138 })).toBe(false);
    expect(isInCrust3DRegion({ latitude: 36, longitude: 155.1 })).toBe(false);
    expect(isInCrust3DRegion({ latitude: Number.NaN, longitude: 138 })).toBe(
      false,
    );
  });
});
