const PALETTE: ReadonlyArray<readonly [number, number, number]> = [
  [33, 102, 172],
  [103, 169, 207],
  [209, 229, 240],
  [255, 255, 191],
  [253, 174, 97],
  [215, 48, 39],
];

export interface VelocityRange {
  min: number;
  max: number;
}

export function velocityRange(
  values: ArrayLike<number>,
  offset = 0,
  stride = 1,
  count?: number,
): VelocityRange {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  const end = count ?? Math.floor((values.length - offset) / stride);
  for (let index = 0; index < end; index += 1) {
    const value = values[offset + index * stride];
    if (value === undefined || !Number.isFinite(value)) {
      continue;
    }
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 1 };
  }
  if (min === max) {
    const padding = Math.abs(min) > 0 ? Math.abs(min) * 0.05 : 0.5;
    return { min: min - padding, max: max + padding };
  }
  return { min, max };
}

export function colorForVelocity(
  value: number,
  range: VelocityRange,
): [number, number, number, number] {
  if (!Number.isFinite(value)) {
    return [170, 170, 170, 180];
  }
  const span = range.max - range.min;
  const normalized =
    span === 0 ? 0.5 : Math.max(0, Math.min(1, (value - range.min) / span));
  const scaled = normalized * (PALETTE.length - 1);
  const lower = Math.floor(scaled);
  const upper = Math.min(PALETTE.length - 1, lower + 1);
  const fraction = scaled - lower;
  const first = PALETTE[lower] ?? PALETTE[0];
  const second = PALETTE[upper] ?? PALETTE[PALETTE.length - 1];
  if (first === undefined || second === undefined) {
    return [128, 128, 128, 255];
  }
  return [
    Math.round(first[0] + (second[0] - first[0]) * fraction),
    Math.round(first[1] + (second[1] - first[1]) * fraction),
    Math.round(first[2] + (second[2] - first[2]) * fraction),
    255,
  ];
}

export function formatVelocityValue(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  if (Math.abs(value) >= 10) {
    return value.toFixed(1);
  }
  return value.toFixed(2);
}
