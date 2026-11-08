import { describe, expect, it } from 'vitest';
import { buildCumulativeMagnitudeFrequency } from './frequency';

describe('buildCumulativeMagnitudeFrequency', () => {
  it('builds cumulative counts at half-magnitude thresholds', () => {
    const points = buildCumulativeMagnitudeFrequency([2.1, 2.6, 3.1, 3.6], 0.5);
    expect(points.map((point) => [point.threshold, point.count])).toEqual([
      [2, 4],
      [2.5, 3],
      [3, 2],
      [3.5, 1],
      [4, 0],
    ]);
  });

  it('ignores unknown magnitudes and invalid bin widths', () => {
    expect(
      buildCumulativeMagnitudeFrequency([Number.NaN, 2, 3], 0.5).map(
        (point) => point.count,
      ),
    ).toEqual([2, 1, 1]);
    expect(buildCumulativeMagnitudeFrequency([2, 3], 0)).toEqual([]);
  });
});
