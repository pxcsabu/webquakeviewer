import { describe, expect, it } from 'vitest';
import { lonLatDepthToPosition, lonLatToPosition } from './crust3dMath';
import { CRUST3D_DEPTH, CRUST3D_HEIGHT, CRUST3D_WIDTH } from './crust3dStyle';

describe('crust3dMath', () => {
  it('places the region centre at the origin', () => {
    const position = lonLatToPosition(33.5, 137.5);
    expect(position.x).toBeCloseTo(0, 10);
    expect(position.y).toBe(0);
    expect(position.z).toBeCloseTo(0, 10);
  });

  it('places north-west at negative Z and negative X', () => {
    const position = lonLatToPosition(47, 120);
    expect(position.x).toBeCloseTo(-CRUST3D_WIDTH / 2, 10);
    expect(position.z).toBeCloseTo(-CRUST3D_DEPTH / 2, 10);
  });

  it('places a deep hypocenter below the top surface', () => {
    const position = lonLatDepthToPosition(36, 138, 700);
    expect(position.y).toBeCloseTo(-CRUST3D_HEIGHT, 10);
  });
});
