import { describe, expect, it } from 'vitest';
import {
  parseAxisList,
  sampleVelocityProfile,
  velocityValueAt,
  type VelocityModel,
} from './velocityModel';

function makeModel(): VelocityModel {
  const lons = Float32Array.from([0, 1]);
  const lats = Float32Array.from([0, 1]);
  const depths = Float32Array.from([0, 10]);
  const vp = new Float32Array(8);
  const vs = new Float32Array(8);
  for (let depth = 0; depth < 2; depth += 1) {
    for (let lat = 0; lat < 2; lat += 1) {
      for (let lon = 0; lon < 2; lon += 1) {
        const index = (depth * 2 + lat) * 2 + lon;
        vp[index] = 4 + depth + lon * 0.5 + lat * 0.25;
        vs[index] = 2 + depth * 0.5 + lon * 0.2 + lat * 0.1;
      }
    }
  }
  return {
    axes: {
      lons,
      lats,
      depths,
      lonCount: 2,
      latCount: 2,
      depthCount: 2,
    },
    vp,
    vs,
    relP: Float32Array.from([1, 1, 1, 1, 1, 1, 1, 1]),
    relS: Float32Array.from([2, 2, 2, 2, 2, 2, 2, 2]),
    source: {
      provider: 'test',
      dataset: 'test',
      fileName: 'test.zip',
      loadedAt: '2026-01-01T00:00:00.000Z',
      citation: 'test',
      doi: 'https://example.test',
      usageNote: 'test',
      crs: 'UNKNOWN',
    },
    classification: 'MODEL',
  };
}

describe('velocity model', () => {
  it('parses, sorts, and deduplicates axis files', () => {
    expect(Array.from(parseAxisList('2\n1\n3\n2\n'))).toEqual([1, 2, 3]);
    const parsed = Array.from(parseAxisList('0.1\n0.1000000001\n0.2\n'));
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toBeCloseTo(0.1, 6);
    expect(parsed[1]).toBeCloseTo(0.2, 6);
  });

  it('reads velocity properties and Vp/Vs', () => {
    const model = makeModel();
    expect(velocityValueAt(model, 'vp', 0)).toBe(4);
    expect(velocityValueAt(model, 'vs', 0)).toBe(2);
    expect(velocityValueAt(model, 'vpvs', 0)).toBe(2);
    expect(velocityValueAt(model, 'relp', 0)).toBe(1);
  });

  it('samples a profile with nearest grid cells', () => {
    const model = makeModel();
    const profile = sampleVelocityProfile(
      model,
      { latitude: 0, longitude: 0 },
      { latitude: 1, longitude: 1 },
      'vp',
      3,
    );
    expect(profile.sampleCount).toBe(3);
    expect(profile.depthCount).toBe(2);
    expect(profile.values[0]).toBe(4);
    expect(profile.values[2]).toBe(4.75);
    expect(profile.distancesKm[0]).toBe(0);
    expect(profile.distancesKm[2]).toBeGreaterThan(0);
    expect(profile.min).toBe(4);
    expect(profile.max).toBeCloseTo(5.75, 6);
  });

  it('returns a finite fallback range for an empty axis', () => {
    const model = makeModel();
    const profile = sampleVelocityProfile(
      { ...model, axes: { ...model.axes, depthCount: 1 } },
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 1 },
      'vp',
      2,
    );
    expect(Number.isFinite(profile.min)).toBe(true);
    expect(Number.isFinite(profile.max)).toBe(true);
  });
});
