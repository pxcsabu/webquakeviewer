import type {
  WaveformFilterKind,
  WaveformMeasurements,
  WaveformSample,
} from '../../domain/waveform/types';

export interface FilterResult {
  samples: WaveformSample[];
  warnings: string[];
}

export interface DisplayBucket {
  timeMs: number;
  min: number;
  max: number;
}

function movingAverageCentered(
  samples: readonly WaveformSample[],
  windowSamples: number,
): number[] {
  const halfWindow = Math.floor(windowSamples / 2);
  return samples.map((_sample, index) => {
    const start = Math.max(0, index - halfWindow);
    const end = Math.min(samples.length - 1, index + halfWindow);
    let sum = 0;
    let count = 0;
    for (let cursor = start; cursor <= end; cursor += 1) {
      const value = samples[cursor]?.amplitude;
      if (value !== undefined && Number.isFinite(value)) {
        sum += value;
        count += 1;
      }
    }
    return count === 0 ? 0 : sum / count;
  });
}

/**
 * Apply a simple display/analysis filter.
 *
 * - lowpass: centred moving average
 * - highpass: original minus centred moving average
 *
 * This is not an instrument-response correction. Edges use a truncated
 * window, so the first and last half-window are affected.
 */
export function applyWaveformFilter(
  samples: readonly WaveformSample[],
  kind: WaveformFilterKind,
  windowSeconds: number,
  samplingRateHz: number,
): FilterResult {
  if (kind === 'none' || samples.length === 0) {
    return { samples: [...samples], warnings: [] };
  }
  const warnings: string[] = [];
  if (!Number.isFinite(samplingRateHz) || samplingRateHz <= 0) {
    return {
      samples: [...samples],
      warnings: ['サンプリング周波数が不明なため、フィルタを適用しませんでした。'],
    };
  }
  if (!Number.isFinite(windowSeconds) || windowSeconds <= 0) {
    return {
      samples: [...samples],
      warnings: ['フィルタ幅は 0 秒より大きくしてください。'],
    };
  }
  let windowSamples = Math.round(windowSeconds * samplingRateHz);
  if (windowSamples < 1) {
    windowSamples = 1;
  }
  if (windowSamples % 2 === 0) {
    windowSamples += 1;
    warnings.push('移動平均の窓を奇数サンプルに調整しました。');
  }
  if (windowSamples > samples.length) {
    windowSamples = samples.length % 2 === 0 ? samples.length - 1 : samples.length;
  }
  if (windowSamples < 1) {
    return { samples: [...samples], warnings };
  }
  const average = movingAverageCentered(samples, windowSamples);
  const filtered = samples.map((sample, index) => {
    const mean = average[index] ?? 0;
    return {
      timeMs: sample.timeMs,
      amplitude:
        kind === 'lowpass'
          ? mean
          : sample.amplitude - mean,
      originalTime: sample.originalTime,
    };
  });
  warnings.push(
    '端部は移動平均の窓が短くなるため、フィルタ結果が不安定になる場合があります。',
  );
  return { samples: filtered, warnings };
}

export function measureWaveform(
  samples: readonly WaveformSample[],
  samplingRateHz: number,
): WaveformMeasurements {
  if (samples.length === 0) {
    return {
      sampleCount: 0,
      durationSeconds: 0,
      samplingRateHz: 0,
      mean: 0,
      peakAmplitude: 0,
      peakToPeak: 0,
      rms: 0,
      startTimeMs: 0,
      endTimeMs: 0,
    };
  }
  let sum = 0;
  let sumSquares = 0;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let peak = 0;
  samples.forEach((sample) => {
    if (!Number.isFinite(sample.amplitude)) {
      return;
    }
    sum += sample.amplitude;
    sumSquares += sample.amplitude * sample.amplitude;
    min = Math.min(min, sample.amplitude);
    max = Math.max(max, sample.amplitude);
    peak = Math.max(peak, Math.abs(sample.amplitude));
  });
  const first = samples[0];
  const last = samples[samples.length - 1];
  const startTimeMs = first?.timeMs ?? 0;
  const endTimeMs = last?.timeMs ?? 0;
  return {
    sampleCount: samples.length,
    durationSeconds: Math.max(0, (endTimeMs - startTimeMs) / 1000),
    samplingRateHz:
      Number.isFinite(samplingRateHz) && samplingRateHz > 0
        ? samplingRateHz
        : 0,
    mean: sum / samples.length,
    peakAmplitude: peak,
    peakToPeak: Number.isFinite(min) && Number.isFinite(max) ? max - min : 0,
    rms: Math.sqrt(sumSquares / samples.length),
    startTimeMs,
    endTimeMs,
  };
}

/**
 * Reduce a trace for drawing while preserving the minimum and maximum in each
 * bucket. The original samples remain the source for measurements.
 */
export function downsampleForDisplay(
  samples: readonly WaveformSample[],
  maxPoints: number,
): DisplayBucket[] {
  if (samples.length === 0) {
    return [];
  }
  const limit = Math.max(2, Math.floor(maxPoints));
  if (samples.length <= limit) {
    return samples.map((sample) => ({
      timeMs: sample.timeMs,
      min: sample.amplitude,
      max: sample.amplitude,
    }));
  }
  const bucketSize = Math.ceil(samples.length / limit);
  const buckets: DisplayBucket[] = [];
  for (let start = 0; start < samples.length; start += bucketSize) {
    const end = Math.min(samples.length, start + bucketSize);
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    let timeMs = samples[start]?.timeMs ?? 0;
    for (let index = start; index < end; index += 1) {
      const sample = samples[index];
      if (sample === undefined) {
        continue;
      }
      min = Math.min(min, sample.amplitude);
      max = Math.max(max, sample.amplitude);
      timeMs = sample.timeMs;
    }
    if (Number.isFinite(min) && Number.isFinite(max)) {
      buckets.push({ timeMs, min, max });
    }
  }
  return buckets;
}
