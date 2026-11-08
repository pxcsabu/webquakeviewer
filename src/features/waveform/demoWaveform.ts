import type { WaveformTrace } from '../../domain/waveform/types';

/**
 * Synthetic demonstration waveform. This is explicitly SIMULATED and must not
 * be presented as an observation.
 */
export function createDemoWaveform(startTimeMs = Date.now()): WaveformTrace {
  const samplingRateHz = 50;
  const durationSeconds = 30;
  const sampleCount = samplingRateHz * durationSeconds;
  const samples = Array.from({ length: sampleCount }, (_value, index) => {
    const timeSeconds = index / samplingRateHz;
    const body =
      Math.sin(2 * Math.PI * 0.8 * timeSeconds) * 0.35 +
      Math.sin(2 * Math.PI * 1.7 * timeSeconds) * 0.18 +
      Math.sin(2 * Math.PI * 3.2 * timeSeconds) * 0.08;
    const pulse = 2.8 * Math.exp(-timeSeconds / 1.4) *
      Math.sin(2 * Math.PI * 5.5 * timeSeconds);
    const noise = Math.sin(2 * Math.PI * 17.3 * timeSeconds) * 0.015;
    return {
      timeMs: startTimeMs + Math.round(timeSeconds * 1000),
      amplitude: body + pulse + noise,
    };
  });

  return {
    id: `demo-${startTimeMs}`,
    station: {
      network: 'DEMO',
      station: 'SYNTH',
      channel: 'BHZ',
    },
    units: 'counts（合成）',
    samplingRateHz,
    startTimeMs,
    endTimeMs: samples[samples.length - 1]?.timeMs ?? startTimeMs,
    samples,
    source: {
      provider: 'EarthScope デモ',
      dataset: '合成波形（デモ）',
      originalId: `demo-${startTimeMs}`,
      retrievedAt: new Date().toISOString(),
      note: '観測データではありません。表示確認用の合成波形です。',
    },
    classification: 'SIMULATED',
    warnings: ['この波形は観測データではなく、表示確認用の合成データです。'],
  };
}
