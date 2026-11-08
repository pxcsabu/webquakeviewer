import type { Earthquake } from './types';

export function sortEarthquakesByTime(
  events: readonly Earthquake[],
): Earthquake[] {
  return [...events].sort((left, right) => {
    const leftTime = Date.parse(left.time.originTime);
    const rightTime = Date.parse(right.time.originTime);
    if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) {
      return 0;
    }
    return rightTime - leftTime;
  });
}
