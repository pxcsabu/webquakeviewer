import { describe, expect, it } from 'vitest';
import {
  bearingDegrees,
  EARTH_RADIUS_KM,
  haversineDistanceKm,
  hypocentralDistanceKm,
  initialBearingRad,
  toProfileCoordinates,
} from './distance';

const tokyo = { latitude: 35.6812, longitude: 139.7671 };
const osaka = { latitude: 34.6937, longitude: 135.5023 };

describe('surface distance', () => {
  it('computes a known Tokyo–Osaka distance within a few km', () => {
    expect(haversineDistanceKm(tokyo, osaka)).toBeGreaterThan(390);
    expect(haversineDistanceKm(tokyo, osaka)).toBeLessThan(415);
  });

  it('returns zero for identical points', () => {
    expect(haversineDistanceKm(tokyo, tokyo)).toBe(0);
  });

  it('computes cardinal bearings', () => {
    expect(bearingDegrees({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 })).toBeCloseTo(0, 5);
    expect(bearingDegrees({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 })).toBeCloseTo(90, 5);
    expect(initialBearingRad({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 })).toBeCloseTo(
      Math.PI / 2,
      5,
    );
  });
});

describe('hypocentral distance', () => {
  it('uses depth as a 3D separation', () => {
    expect(
      hypocentralDistanceKm(
        { latitude: 35, longitude: 139, depthKm: 0 },
        { latitude: 35, longitude: 139, depthKm: 10 },
      ),
    ).toBeCloseTo(10, 5);
  });

  it('adds a vertical separation for different depths at the same location', () => {
    const distance = hypocentralDistanceKm(
      { ...tokyo, depthKm: 0 },
      { ...tokyo, depthKm: 30 },
    );
    expect(distance).toBeCloseTo(30, 5);
  });
});

describe('profile coordinates', () => {
  it('projects a point on an eastward profile', () => {
    const start = { latitude: 0, longitude: 0 };
    const end = { latitude: 0, longitude: 1 };
    const bearing = initialBearingRad(start, end);
    const point = toProfileCoordinates(
      { latitude: 0, longitude: 0.5 },
      start,
      bearing,
    );
    expect(point.alongKm).toBeCloseTo(
      haversineDistanceKm(start, { latitude: 0, longitude: 0.5 }),
      3,
    );
    expect(Math.abs(point.crossKm)).toBeLessThan(1e-6);
  });

  it('reports a signed cross-track offset', () => {
    const start = { latitude: 0, longitude: 0 };
    const end = { latitude: 0, longitude: 1 };
    const bearing = initialBearingRad(start, end);
    const north = toProfileCoordinates(
      { latitude: 0.5, longitude: 0.5 },
      start,
      bearing,
    );
    expect(north.crossKm).toBeLessThan(0);
    expect(Math.abs(north.crossKm)).toBeGreaterThan(50);
    expect(EARTH_RADIUS_KM).toBeGreaterThan(6000);
  });
});
