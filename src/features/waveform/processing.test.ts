import { describe, expect, it } from 'vitest';
import type { WaveformSample } from '../../domain/waveform/types';
import {
  applyWaveformFilter,
  downsampleForDisplay,
  measureWaveform,
} from './processing';

function samples(values: readonly number[], stepMs = 1000): WaveformSample[] {
  return values.map((amplitude, index) => ({
    timeMs: index * stepMs,
    amplitude,
  }));
}

describe('measureWaveform', () => {
  it('computes amplitude measurements and duration', () => {
    const result = measureWaveform(samples([1, -1, 3]), 1);
    expect(result.sampleCount).toBe(3);
    expect(result.durationSeconds).toBe(2);
    expect(result.mean).toBeCloseTo(1, 10);
    expect(result.peakAmplitude).toBe(3);
    expect(result.peakToPeak).toBe(4);
    expect(result.rms).toBeCloseTo(Math.sqrt(11 / 3), 10);
  });

  it('handles an empty trace', () => {
    const result = measureWaveform([], 0);
    expect(result.sampleCount).toBe(0);
    expect(result.peakAmplitude).toBe(0);
    expect(result.rms).toBe(0);
  });
});

describe('applyWaveformFilter', () => {
  it('returns a copy for no filter', () => {
    const input = samples([1, 2, 3]);
    const result = applyWaveformFilter(input, 'none', 1, 1);
    expect(result.samples).toEqual(input);
    expect(result.samples).not.toBe(input);
    expect(result.warnings).toEqual([]);
  });

  it('preserves the original timestamp text through a filter', () => {
    const input = [
      { timeMs: 0, amplitude: 1, originalTime: '2026-01-01T00:00:00Z' },
      { timeMs: 1000, amplitude: 2, originalTime: '2026-01-01T00:00:01Z' },
    ];
    const result = applyWaveformFilter(input, 'lowpass', 1, 1);
    expect(result.samples[0]?.originalTime).toBe('2026-01-01T00:00:00Z');
  });

  it('leaves a constant trace unchanged with a lowpass', () => {
    const result = applyWaveformFilter(samples([2, 2, 2, 2, 2]), 'lowpass', 2, 1);
    expect(result.samples.map((sample) => sample.amplitude)).toEqual([
      2, 2, 2, 2, 2,
    ]);
  });

  it('removes a constant trace with a highpass', () => {
    const result = applyWaveformFilter(samples([2, 2, 2, 2, 2]), 'highpass', 2, 1);
    result.samples.forEach((sample) => {
      expect(sample.amplitude).toBeCloseTo(0, 10);
    });
  });

  it('adjusts an even window and warns', () => {
    const result = applyWaveformFilter(samples([1, 2, 3, 4]), 'lowpass', 2, 1);
    expect(result.warnings.some((warning) => warning.includes('奇数'))).toBe(
      true,
    );
  });

  it('does not filter without a sampling rate', () => {
    const input = samples([1, 2, 3]);
    const result = applyWaveformFilter(input, 'lowpass', 1, 0);
    expect(result.samples).toEqual(input);
    expect(result.warnings).toHaveLength(1);
  });

  it('rejects invalid windows', () => {
    const input = samples([1, 2, 3]);
    const result = applyWaveformFilter(input, 'lowpass', 0, 1);
    expect(result.samples).toEqual(input);
    expect(result.warnings[0]).toContain('0 秒');
  });
});

describe('downsampleForDisplay', () => {
  it('keeps all samples when below the limit', () => {
    const buckets = downsampleForDisplay(samples([1, 2, 3]), 10);
    expect(buckets).toHaveLength(3);
    expect(buckets[0]).toEqual({ timeMs: 0, min: 1, max: 1 });
  });

  it('preserves extremes and respects the limit', () => {
    const input = samples(Array.from({ length: 100 }, (_value, index) => index));
    input[40] = { timeMs: 40_000, amplitude: -50 };
    const buckets = downsampleForDisplay(input, 12);
    expect(buckets.length).toBeLessThanOrEqual(12);
    expect(Math.min(...buckets.map((bucket) => bucket.min))).toBe(-50);
    expect(Math.max(...buckets.map((bucket) => bucket.max))).toBe(99);
  });
});
