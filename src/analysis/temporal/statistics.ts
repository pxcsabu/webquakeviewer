import type { Earthquake } from '../../domain/earthquake/types';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export interface DailyEventBin {
  startUtc: string;
  endUtc: string;
  label: string;
  count: number;
}

export interface TemporalStatistics {
  count: number;
  firstTime: string | null;
  lastTime: string | null;
  spanHours: number;
  medianInterEventHours: number | null;
  meanInterEventHours: number | null;
  maxInterEventHours: number | null;
}

function parseTimes(events: readonly Earthquake[]): number[] {
  return events
    .map((event) => Date.parse(event.time.originTime))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);
}

function median(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const value = sorted[middle];
  if (value === undefined) {
    return 0;
  }
  if (sorted.length % 2 === 1) {
    return value;
  }
  const previous = sorted[middle - 1];
  return previous === undefined ? value : (previous + value) / 2;
}

/**
 * Daily UTC histogram. If the event span exceeds maxDays, the most recent
 * maxDays are retained.
 */
export function buildDailyEventHistogram(
  events: readonly Earthquake[],
  maxDays = 30,
): DailyEventBin[] {
  const times = parseTimes(events);
  if (times.length === 0 || maxDays < 1) {
    return [];
  }

  const first = times[0];
  const last = times[times.length - 1];
  if (first === undefined || last === undefined) {
    return [];
  }

  const endDay = Math.floor(last / DAY_MS) * DAY_MS;
  let startDay = Math.floor(first / DAY_MS) * DAY_MS;
  const totalDays = Math.round((endDay - startDay) / DAY_MS) + 1;
  if (totalDays > maxDays) {
    startDay = endDay - (maxDays - 1) * DAY_MS;
  }

  const bins: DailyEventBin[] = [];
  for (let start = startDay; start <= endDay; start += DAY_MS) {
    const date = new Date(start);
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    bins.push({
      startUtc: new Date(start).toISOString(),
      endUtc: new Date(start + DAY_MS).toISOString(),
      label: `${month}/${day}`,
      count: 0,
    });
  }

  for (const time of times) {
    const index = Math.floor((time - startDay) / DAY_MS);
    const bin = bins[index];
    if (bin !== undefined) {
      bin.count += 1;
    }
  }
  return bins;
}

export function computeTemporalStatistics(
  events: readonly Earthquake[],
): TemporalStatistics {
  const times = parseTimes(events);
  if (times.length === 0) {
    return {
      count: 0,
      firstTime: null,
      lastTime: null,
      spanHours: 0,
      medianInterEventHours: null,
      meanInterEventHours: null,
      maxInterEventHours: null,
    };
  }

  const first = times[0];
  const last = times[times.length - 1];
  if (first === undefined || last === undefined) {
    return {
      count: 0,
      firstTime: null,
      lastTime: null,
      spanHours: 0,
      medianInterEventHours: null,
      meanInterEventHours: null,
      maxInterEventHours: null,
    };
  }

  const gaps: number[] = [];
  for (let index = 1; index < times.length; index += 1) {
    const current = times[index];
    const previous = times[index - 1];
    if (current !== undefined && previous !== undefined) {
      gaps.push((current - previous) / HOUR_MS);
    }
  }

  return {
    count: times.length,
    firstTime: new Date(first).toISOString(),
    lastTime: new Date(last).toISOString(),
    spanHours: (last - first) / HOUR_MS,
    medianInterEventHours: gaps.length > 0 ? median(gaps) : null,
    meanInterEventHours:
      gaps.length > 0
        ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length
        : null,
    maxInterEventHours: gaps.length > 0 ? Math.max(...gaps) : null,
  };
}
