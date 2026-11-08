export interface BValueOptions {
  /** Lower boundary of the first complete magnitude bin. */
  mc: number;
  /** Magnitude bin width used by the source catalog. */
  binWidth: number;
}

export interface BValueSuccess {
  ok: true;
  bValue: number;
  aValue: number;
  sampleCount: number;
  meanMagnitude: number;
  mc: number;
  binWidth: number;
}

export interface BValueFailure {
  ok: false;
  error: string;
  sampleCount: number;
}

export type BValueResult = BValueSuccess | BValueFailure;

export const MIN_B_VALUE_SAMPLE_COUNT = 10;

/**
 * Aki–Utsu maximum-likelihood b-value.
 *
 * b = log10(e) / (mean(M) - (Mc - ΔM/2))
 *
 * Magnitudes must be at or above Mc. The sample is assumed complete at Mc and
 * the bin boundary convention is used. The b-value is not a physical linear
 * quantity and must not be presented without Mc, bin width, and sample count.
 */
export function estimateBValue(
  magnitudes: readonly number[],
  options: BValueOptions,
): BValueResult {
  const { mc, binWidth } = options;
  if (!Number.isFinite(mc)) {
    return { ok: false, error: 'Mc が有限値ではありません。', sampleCount: 0 };
  }
  if (!Number.isFinite(binWidth) || binWidth <= 0) {
    return {
      ok: false,
      error: 'マグニチュードビン幅は 0 より大きい有限値が必要です。',
      sampleCount: 0,
    };
  }

  const selected = magnitudes.filter(
    (magnitude) => Number.isFinite(magnitude) && magnitude >= mc,
  );
  if (selected.length < MIN_B_VALUE_SAMPLE_COUNT) {
    return {
      ok: false,
      error: `b値には最低 ${MIN_B_VALUE_SAMPLE_COUNT} 件の完全なサンプルが必要です。`,
      sampleCount: selected.length,
    };
  }

  const meanMagnitude =
    selected.reduce((sum, magnitude) => sum + magnitude, 0) /
    selected.length;
  const denominator = meanMagnitude - (mc - binWidth / 2);
  if (!Number.isFinite(denominator) || denominator <= 0) {
    return {
      ok: false,
      error: 'b値の分母が 0 以下です。Mc とサンプルを確認してください。',
      sampleCount: selected.length,
    };
  }

  const bValue = Math.log10(Math.E) / denominator;
  const aValue = Math.log10(selected.length) + bValue * mc;

  return {
    ok: true,
    bValue,
    aValue,
    sampleCount: selected.length,
    meanMagnitude,
    mc,
    binWidth,
  };
}
