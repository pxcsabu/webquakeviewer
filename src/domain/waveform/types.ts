import type { DataClassification } from '../earthquake/types';

/**
 * A single waveform sample. Time is stored as Unix epoch milliseconds in UTC.
 * Amplitude remains in the units supplied by the file or the user.
 */
export interface WaveformSample {
  timeMs: number;
  amplitude: number;
  /** Timestamp text exactly as supplied by the input file, when available. */
  originalTime?: string;
}

export interface WaveformStation {
  network?: string;
  station?: string;
  channel?: string;
  location?: string;
}

export interface WaveformSource {
  provider: string;
  dataset: string;
  originalId: string;
  retrievedAt: string;
  sourceUrl?: string;
  license?: string;
  note?: string;
}

export interface WaveformTrace {
  id: string;
  station: WaveformStation;
  units: string;
  samplingRateHz: number;
  startTimeMs: number;
  endTimeMs: number;
  samples: readonly WaveformSample[];
  source: WaveformSource;
  classification: DataClassification;
  warnings: readonly string[];
}

export type WaveformFilterKind = 'none' | 'lowpass' | 'highpass';

export interface WaveformFilter {
  kind: WaveformFilterKind;
  windowSeconds: number;
}

export interface WaveformMeasurements {
  sampleCount: number;
  durationSeconds: number;
  samplingRateHz: number;
  mean: number;
  peakAmplitude: number;
  peakToPeak: number;
  rms: number;
  startTimeMs: number;
  endTimeMs: number;
}
