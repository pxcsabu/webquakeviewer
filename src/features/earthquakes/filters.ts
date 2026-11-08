import type { Earthquake } from '../../domain/earthquake/types';

export type TimeRange = 'all' | '1h' | '24h' | '7d';

export interface EarthquakeFilterState {
  timeRange: TimeRange;
  minMagnitude: number | null;
  maxDepthKm: number | null;
}

export const DEFAULT_EARTHQUAKE_FILTERS: EarthquakeFilterState = {
  timeRange: 'all',
  minMagnitude: null,
  maxDepthKm: null,
};

export const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  all: '全期間',
  '1h': '1時間',
  '24h': '24時間',
  '7d': '7日',
};

export const TIME_RANGE_MS: Record<TimeRange, number | null> = {
  all: null,
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};

/**
 * Applies display filters only. It does not alter or normalize the underlying
 * records. Events with unknown magnitude/depth are excluded when the
 * corresponding filter is active, because their compliance cannot be proved.
 */
export function filterEarthquakes(
  events: readonly Earthquake[],
  filters: EarthquakeFilterState,
  now: Date = new Date(),
): Earthquake[] {
  const rangeMs = TIME_RANGE_MS[filters.timeRange];
  const cutoff = rangeMs === null ? null : now.getTime() - rangeMs;

  return events.filter((event) => {
    if (cutoff !== null) {
      const originTime = Date.parse(event.time.originTime);
      if (!Number.isFinite(originTime) || originTime < cutoff) {
        return false;
      }
    }

    if (filters.minMagnitude !== null) {
      if (
        event.magnitude === undefined ||
        event.magnitude.value < filters.minMagnitude
      ) {
        return false;
      }
    }

    if (filters.maxDepthKm !== null) {
      if (
        event.location.depthKm === undefined ||
        event.location.depthKm > filters.maxDepthKm
      ) {
        return false;
      }
    }

    return true;
  });
}

export { sortEarthquakesByTime } from '../../domain/earthquake/sort';
