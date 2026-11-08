import { describe, expect, it } from 'vitest';
import { validateEarthquake } from './validation';

function makeValid(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'test-event-1',
    source: {
      provider: 'Test Provider',
      dataset: 'test-dataset',
      originalId: 'orig-1',
      retrievedAt: '2026-11-08T05:00:00Z',
    },
    time: {
      originTime: '2026-11-08T04:59:00Z',
    },
    location: {
      latitude: 35.6,
      longitude: 139.7,
      depthKm: 42.5,
      crs: 'WGS84',
    },
    magnitude: {
      value: 4.8,
      type: 'Mww',
    },
    classification: 'OBSERVED',
    ...overrides,
  };
}

describe('validateEarthquake', () => {
  it('accepts a valid observed earthquake', () => {
    const result = validateEarthquake(makeValid());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe('test-event-1');
      expect(result.value.source.retrievedAt).toBe('2026-11-08T05:00:00Z');
      expect(result.warnings).toEqual([]);
    }
  });

  it('allows a null retrieval time only for ILLUSTRATIVE data', () => {
    const illustrative = validateEarthquake(
      makeValid({
        source: {
          provider: 'Development fixture',
          dataset: 'sample',
          originalId: 'sample-1',
          retrievedAt: null,
        },
        classification: 'ILLUSTRATIVE',
      }),
    );
    expect(illustrative.ok).toBe(true);

    const observedWithoutRetrieval = validateEarthquake(
      makeValid({
        source: {
          provider: 'Test Provider',
          dataset: 'test-dataset',
          originalId: 'orig-1',
          retrievedAt: null,
        },
        classification: 'OBSERVED',
      }),
    );
    expect(observedWithoutRetrieval.ok).toBe(false);
    if (!observedWithoutRetrieval.ok) {
      expect(
        observedWithoutRetrieval.issues.some(
          (issue) => issue.path === 'source.retrievedAt',
        ),
      ).toBe(true);
    }
  });

  it('rejects invalid coordinates', () => {
    const result = validateEarthquake(
      makeValid({
        location: {
          latitude: 95,
          longitude: 181,
          crs: 'WGS84',
        },
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map((issue) => issue.path)).toEqual(
        expect.arrayContaining(['location.latitude', 'location.longitude']),
      );
    }
  });

  it('rejects a non-UTC or invalid timestamp', () => {
    const result = validateEarthquake(
      makeValid({
        time: { originTime: '2026-02-30T00:00:00Z' },
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.path === 'time.originTime')).toBe(
        true,
      );
    }
  });

  it('warns about a negative depth without silently dropping the value', () => {
    const result = validateEarthquake(
      makeValid({
        location: {
          latitude: 35.6,
          longitude: 139.7,
          depthKm: -1.2,
          crs: 'WGS84',
        },
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.location.depthKm).toBe(-1.2);
      expect(result.warnings.some((issue) => issue.path === 'location.depthKm')).toBe(
        true,
      );
    }
  });

  it('rejects an intensity rank that does not match its display value', () => {
    const result = validateEarthquake(
      makeValid({
        intensity: { display: '5-', rank: 6 },
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.path === 'intensity.rank')).toBe(
        true,
      );
    }
  });

  it('preserves place and event type text from the provider', () => {
    const result = validateEarthquake(
      makeValid({
        place: 'Test region',
        eventType: 'earthquake',
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.place).toBe('Test region');
      expect(result.value.eventType).toBe('earthquake');
    }
  });

  it('preserves original coordinates and depth metadata', () => {
    const result = validateEarthquake(
      makeValid({
        location: {
          latitude: 35.6,
          longitude: 139.7,
          depthKm: 42.5,
          crs: 'JGD2011',
          original: {
            latitude: 35.6,
            longitude: 139.7,
            depth: { value: 42500, unit: 'm' },
            crs: 'JGD2011',
          },
        },
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.location.original?.depth).toEqual({
        value: 42500,
        unit: 'm',
      });
      expect(result.value.location.crs).toBe('JGD2011');
    }
  });
});
