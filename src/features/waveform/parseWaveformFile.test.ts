import { describe, expect, it } from 'vitest';
import {
  parseWaveformCsv,
  parseWaveformJson,
  WaveformParseError,
} from './parseWaveformFile';

const HEADER = 'time,amplitude,station,channel,units,samplingRateHz\n';
const ROWS = [
  '2026-01-01T00:00:00Z,1.0,AAA,BHZ,counts,1',
  '2026-01-01T00:00:01Z,2.0,AAA,BHZ,counts,1',
  '2026-01-01T00:00:02Z,-1.0,AAA,BHZ,counts,1',
].join('\n');

describe('parseWaveformCsv', () => {
  it('parses a simple single-trace CSV', () => {
    const trace = parseWaveformCsv(HEADER + ROWS, {
      fileName: 'test.csv',
      loadedAt: '2026-01-01T00:00:00Z',
    });
    expect(trace.samples).toHaveLength(3);
    expect(trace.units).toBe('counts');
    expect(trace.station.station).toBe('AAA');
    expect(trace.station.channel).toBe('BHZ');
    expect(trace.samplingRateHz).toBe(1);
    expect(trace.startTimeMs).toBe(Date.parse('2026-01-01T00:00:00Z'));
    expect(trace.endTimeMs).toBe(Date.parse('2026-01-01T00:00:02Z'));
    expect(trace.samples[0]?.originalTime).toBe('2026-01-01T00:00:00Z');
    expect(trace.classification).toBe('OBSERVED');
    expect(trace.source.provider).toBe('ユーザー提供ファイル');
    expect(trace.warnings).toEqual([]);
  });

  it('handles BOM, comments, and quoted fields', () => {
    const text =
      '\ufeff# comment\ntime,amplitude,station\n' +
      '"2026-01-01T00:00:00Z",1.5,"A,A"\n' +
      '2026-01-01T00:00:01Z,2.5,"A,A"\n';
    const trace = parseWaveformCsv(text, { fileName: 'bom.csv' });
    expect(trace.samples).toHaveLength(2);
    expect(trace.station.station).toBe('A,A');
    expect(trace.units).toBe('未指定');
    expect(trace.warnings.some((warning) => warning.includes('単位'))).toBe(
      true,
    );
  });

  it('accepts Unix seconds and milliseconds', () => {
    const text =
      'time,amplitude\n' +
      '1767225600,1\n' +
      '1767225601,2\n';
    const trace = parseWaveformCsv(text, { fileName: 'epoch.csv' });
    expect(trace.samples[0]?.timeMs).toBe(1767225600000);
    expect(trace.samplingRateHz).toBe(1);
  });

  it('sorts rows and warns about duplicates', () => {
    const text =
      'time,amplitude\n' +
      '2026-01-01T00:00:02Z,3\n' +
      '2026-01-01T00:00:00Z,1\n' +
      '2026-01-01T00:00:00Z,9\n';
    const trace = parseWaveformCsv(text, { fileName: 'order.csv' });
    expect(trace.samples.map((sample) => sample.amplitude)).toEqual([1, 3]);
    expect(trace.warnings.some((warning) => warning.includes('昇順'))).toBe(
      true,
    );
    expect(trace.warnings.some((warning) => warning.includes('同時刻'))).toBe(
      true,
    );
  });

  it('skips invalid rows and reports their count', () => {
    const text =
      'time,amplitude\n' +
      '2026-01-01T00:00:00Z,1\n' +
      'not-a-time,2\n' +
      '2026-01-01T00:00:02Z,not-a-number\n' +
      '2026-01-01T00:00:03Z,4\n';
    const trace = parseWaveformCsv(text, { fileName: 'invalid.csv' });
    expect(trace.samples).toHaveLength(2);
    expect(trace.warnings.some((warning) => warning.includes('2 行'))).toBe(
      true,
    );
  });

  it('warns when timezone is omitted', () => {
    const text =
      'time,amplitude\n' +
      '2026-01-01T00:00:00,1\n' +
      '2026-01-01T00:00:01,2\n';
    const trace = parseWaveformCsv(text, { fileName: 'local.csv' });
    expect(
      trace.warnings.some((warning) => warning.includes('タイムゾーン')),
    ).toBe(true);
  });

  it('warns about irregular sampling and keeps the median rate', () => {
    const text =
      'time,amplitude\n' +
      '2026-01-01T00:00:00Z,1\n' +
      '2026-01-01T00:00:01Z,2\n' +
      '2026-01-01T00:00:03Z,3\n';
    const trace = parseWaveformCsv(text, { fileName: 'irregular.csv' });
    expect(trace.samplingRateHz).toBeCloseTo(2 / 3, 10);
    expect(
      trace.warnings.some((warning) => warning.includes('一定ではありません')),
    ).toBe(true);
  });

  it('rejects files without required columns', () => {
    expect(() =>
      parseWaveformCsv('time,foo\n2026-01-01T00:00:00Z,1\n'),
    ).toThrow(WaveformParseError);
    expect(() =>
      parseWaveformCsv('foo,bar\n1,2\n', { fileName: 'bad.csv' }),
    ).toThrow('time と amplitude');
  });
});

describe('parseWaveformJson', () => {
  it('parses metadata and samples from an object', () => {
    const text = JSON.stringify({
      station: { network: 'XX', station: 'ABC', channel: 'HHZ' },
      units: 'm/s',
      samplingRateHz: 2,
      samples: [
        { time: '2026-01-01T00:00:00Z', amplitude: 1 },
        { time: '2026-01-01T00:00:00.5Z', amplitude: 2 },
      ],
    });
    const trace = parseWaveformJson(text, { fileName: 'test.json' });
    expect(trace.station.station).toBe('ABC');
    expect(trace.units).toBe('m/s');
    expect(trace.samplingRateHz).toBe(2);
    expect(trace.samples).toHaveLength(2);
  });

  it('accepts a top-level sample array with default units', () => {
    const text = JSON.stringify([
      { time: '2026-01-01T00:00:00Z', amplitude: 1 },
      { time: '2026-01-01T00:00:01Z', amplitude: 2 },
    ]);
    const trace = parseWaveformJson(text, { fileName: 'array.json' });
    expect(trace.samples).toHaveLength(2);
    expect(trace.units).toBe('未指定');
  });

  it('rejects malformed JSON', () => {
    expect(() => parseWaveformJson('{', { fileName: 'bad.json' })).toThrow(
      'JSON',
    );
  });
});
