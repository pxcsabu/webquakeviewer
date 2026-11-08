import { describe, expect, it } from 'vitest';
import { createDemoWaveform } from './demoWaveform';

describe('createDemoWaveform', () => {
  it('creates a clearly simulated trace', () => {
    const trace = createDemoWaveform(0);
    expect(trace.classification).toBe('SIMULATED');
    expect(trace.samples).toHaveLength(1500);
    expect(trace.samplingRateHz).toBe(50);
    expect(trace.startTimeMs).toBe(0);
    expect(trace.units).toContain('合成');
    expect(trace.warnings[0]).toContain('観測データではなく');
    expect(trace.source.provider).toContain('デモ');
  });
});
