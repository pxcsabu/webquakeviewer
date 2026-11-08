import { describe, expect, it } from 'vitest';
import type { Earthquake } from '../../domain/earthquake/types';
import {
  buildDailyEventHistogram,
  computeTemporalStatistics,
} from './statistics';

function event(id: string, originTime: string): Earthquake {
  return {
    id,
    source: {
      provider: 'Test',
      dataset: 'test',
      originalId: id,
      retrievedAt: '2026-11-08T00:00:00Z',
    },
    time: { originTime },
    location: { latitude: 35, longitude: 139, crs: 'WGS84' },
    classification: 'OBSERVED',
  };
}

describe('temporal statistics', () => {
  const events = [
    event('a', '2026-11-07T00:00:00Z'),
    event('b', '2026-11-07T06:00:00Z'),
    event('c', '2026-11-08T06:00:00Z'),
  ];

  it('computes inter-event gaps and span', () => {
    const stats = computeTemporalStatistics(events);
    expect(stats.count).toBe(3);
    expect(stats.spanHours).toBe(30);
    expect(stats.medianInterEventHours).toBe(15);
    expect(stats.meanInterEventHours).toBe(15);
    expect(stats.maxInterEventHours).toBe(24);
  });

  it('builds daily UTC bins', () => {
    expect(buildDailyEventHistogram(events)).toEqual([
      {
        startUtc: '2026-11-07T00:00:00.000Z',
        endUtc: '2026-11-08T00:00:00.000Z',
        label: '11/07',
        count: 2,
      },
      {
        startUtc: '2026-11-08T00:00:00.000Z',
        endUtc: '2026-11-09T00:00:00.000Z',
        label: '11/08',
        count: 1,
      },
    ]);
  });

  it('handles empty and invalid samples', () => {
    expect(computeTemporalStatistics([]).count).toBe(0);
    expect(buildDailyEventHistogram([])).toEqual([]);
    expect(
      computeTemporalStatistics([event('bad', 'not-a-time')]).count,
    ).toBe(0);
  });
});
