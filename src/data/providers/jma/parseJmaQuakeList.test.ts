import { describe, expect, it } from 'vitest';
import { ProviderError } from '../errors';
import { jmaFixture } from './fixtures';
import {
  parseJmaCoordinate,
  parseJmaQuakeList,
} from './parseJmaQuakeList';

const options = {
  retrievedAt: '2026-11-08T03:00:00Z',
  dataset: 'test-jma-dataset',
};

describe('parseJmaCoordinate', () => {
  it('parses decimal-degree coordinates and metre depths', () => {
    expect(parseJmaCoordinate('+32.6+130.6-10000/')).toEqual({
      latitude: 32.6,
      longitude: 130.6,
      depthMeters: 10000,
    });
  });

  it('parses degree-minute coordinates', () => {
    const coordinate = parseJmaCoordinate('+3456.1+13739.5-41000/');
    expect(coordinate?.latitude).toBeCloseTo(34.935, 5);
    expect(coordinate?.longitude).toBeCloseTo(137.658333, 5);
    expect(coordinate?.depthMeters).toBe(41000);
  });

  it('handles zero depth and omitted depth', () => {
    expect(parseJmaCoordinate('+41.9+140.7+0/')?.depthMeters).toBe(0);
    expect(parseJmaCoordinate('-13.8+165.7/')).toEqual({
      latitude: -13.8,
      longitude: 165.7,
    });
    expect(parseJmaCoordinate('+07.5-080.8/')).toEqual({
      latitude: 7.5,
      longitude: -80.8,
    });
  });

  it('rejects malformed coordinate strings', () => {
    expect(parseJmaCoordinate('')).toBeNull();
    expect(parseJmaCoordinate('not-a-coordinate')).toBeNull();
  });
});

describe('parseJmaQuakeList', () => {
  it('deduplicates reports by eid and keeps the latest complete record', () => {
    const result = parseJmaQuakeList(jmaFixture, options);
    expect(result.events).toHaveLength(4);
    expect(result.events.map((event) => event.source.originalId)).toEqual(
      expect.arrayContaining([
        '20261108112111',
        '20261108010441',
        '20261108023143',
        '20261024113820',
      ]),
    );
    expect(
      result.events.some((event) => event.source.originalId === '20261108105319'),
    ).toBe(false);
  });

  it('normalizes time, depth, intensity, and provenance', () => {
    const result = parseJmaQuakeList(jmaFixture, options);
    const event = result.events.find(
      (candidate) => candidate.source.originalId === '20261108112111',
    );
    expect(event).toBeDefined();
    expect(event?.id).toBe('jma:20261108112111');
    expect(event?.source.provider).toBe('JMA');
    expect(event?.source.attribution).toBe('気象庁');
    expect(event?.source.retrievedAt).toBe(options.retrievedAt);
    expect(event?.source.updatedAt).toBe('2026-11-08T02:24:00.000Z');
    expect(event?.time.originTime).toBe('2026-11-08T02:21:00.000Z');
    expect(event?.time.originalTime).toBe('2026-11-08T11:21:00+09:00');
    expect(event?.time.originalTimezone).toBe('+09:00');
    expect(event?.location.latitude).toBe(32.6);
    expect(event?.location.longitude).toBe(130.6);
    expect(event?.location.depthKm).toBe(10);
    expect(event?.location.original?.depth).toEqual({
      value: 10000,
      unit: 'm',
    });
    expect(event?.location.crs).toBe('UNKNOWN');
    expect(event?.magnitude).toEqual({ value: 2.8 });
    expect(event?.intensity).toEqual({ display: '1', rank: 1 });
    expect(event?.place).toBe('熊本県天草・芦北地方');
    expect(event?.eventType).toBe('earthquake');
    expect(event?.classification).toBe('OBSERVED');
  });

  it('keeps DMS coordinates and zero depth distinct', () => {
    const result = parseJmaQuakeList(jmaFixture, options);
    const dms = result.events.find(
      (candidate) => candidate.source.originalId === '20261108010441',
    );
    expect(dms?.location.latitude).toBeCloseTo(34.935, 5);
    expect(dms?.location.longitude).toBeCloseTo(137.658333, 5);
    expect(dms?.location.depthKm).toBe(41);
    expect(dms?.intensity).toBeUndefined();

    const zeroDepth = result.events.find(
      (candidate) => candidate.source.originalId === '20261108023143',
    );
    expect(zeroDepth?.location.depthKm).toBe(0);
    expect(zeroDepth?.intensity).toEqual({ display: '2', rank: 2 });
  });

  it('retains a distant event for the application region filter', () => {
    const result = parseJmaQuakeList(jmaFixture, options);
    const distant = result.events.find(
      (candidate) => candidate.source.originalId === '20261024113820',
    );
    expect(distant?.location.latitude).toBe(-13.8);
    expect(distant?.location.longitude).toBe(165.7);
    expect(distant?.location.depthKm).toBeUndefined();
  });

  it('reports the latest report timestamp', () => {
    const result = parseJmaQuakeList(jmaFixture, options);
    expect(result.latestReportAt).toBe('2026-11-08T02:24:00.000Z');
  });

  it('rejects a non-array payload', () => {
    expect(() => parseJmaQuakeList({}, options)).toThrow(ProviderError);
  });
});
