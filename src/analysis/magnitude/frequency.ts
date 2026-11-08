export interface MagnitudeFrequencyPoint {
  threshold: number;
  count: number;
}

export function buildCumulativeMagnitudeFrequency(
  magnitudes: readonly number[],
  binWidth = 0.5,
): MagnitudeFrequencyPoint[] {
  if (!Number.isFinite(binWidth) || binWidth <= 0) {
    return [];
  }
  const finite = magnitudes.filter((value) => Number.isFinite(value));
  if (finite.length === 0) {
    return [];
  }

  const min = Math.floor(Math.min(...finite) / binWidth) * binWidth;
  const max = Math.ceil(Math.max(...finite) / binWidth) * binWidth;
  const points: MagnitudeFrequencyPoint[] = [];
  for (let threshold = min; threshold <= max + 1e-9; threshold += binWidth) {
    const rounded = Number(threshold.toFixed(6));
    points.push({
      threshold: rounded,
      count: finite.filter((value) => value >= rounded).length,
    });
  }
  return points;
}
