import { describe, expect, it } from 'vitest';
import {
  estimateBValue,
  MIN_B_VALUE_SAMPLE_COUNT,
} from './bValue';

describe('estimateBValue', () => {
  it('computes the Aki–Utsu b-value for a complete sample', () => {
    const magnitudes = Array.from(
      { length: 10 },
      (_, index) => 2.0 + index * 0.1,
    );
    const result = estimateBValue(magnitudes, { mc: 2.0, binWidth: 0.1 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sampleCount).toBe(10);
      expect(result.meanMagnitude).toBeCloseTo(2.45, 10);
      expect(result.bValue).toBeCloseTo(Math.log10(Math.E) / 0.5, 10);
      expect(result.aValue).toBeGreaterThan(0);
    }
  });

  it('rejects insufficient samples', () => {
    const result = estimateBValue([2, 2.1, 2.2], {
      mc: 2,
      binWidth: 0.1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.sampleCount).toBe(3);
      expect(result.error).toContain(String(MIN_B_VALUE_SAMPLE_COUNT));
    }
  });

  it('rejects invalid bin widths and non-finite Mc', () => {
    expect(
      estimateBValue([2, 2, 2, 2, 2, 2, 2, 2, 2, 2], {
        mc: 2,
        binWidth: 0,
      }).ok,
    ).toBe(false);
    expect(
      estimateBValue([2, 2, 2, 2, 2, 2, 2, 2, 2, 2], {
        mc: Number.NaN,
        binWidth: 0.1,
      }).ok,
    ).toBe(false);
  });
});
