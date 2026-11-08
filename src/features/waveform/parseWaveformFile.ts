import type {
  WaveformSample,
  WaveformStation,
  WaveformTrace,
} from '../../domain/waveform/types';

const PROVIDER = 'ユーザー提供ファイル';
const UNSPECIFIED_UNITS = '未指定';

export class WaveformParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WaveformParseError';
  }
}

export interface WaveformFileOptions {
  fileName?: string;
  loadedAt?: string;
  units?: string;
  station?: Partial<WaveformStation>;
}

interface RawMetadata {
  station: Partial<WaveformStation>;
  units?: string;
  samplingRateHz?: number;
}

interface FinalizeOptions {
  fileName: string;
  loadedAt: string;
  classification: WaveformTrace['classification'];
  metadata: RawMetadata;
  warnings: string[];
  sourceNote?: string;
  provider?: string;
  unitsFallback?: string;
  stationFallback?: Partial<WaveformStation>;
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === undefined) {
      continue;
    }
    if (inQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += character;
      }
      continue;
    }
    if (character === '"') {
      inQuotes = true;
      continue;
    }
    if (character === ',') {
      row.push(field);
      field = '';
      continue;
    }
    if (character === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }
    if (character !== '\r') {
      field += character;
    }
  }
  row.push(field);
  rows.push(row);
  return rows;
}

function normalizeHeader(value: string): string {
  return value
    .replace(/^\ufeff/, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

function findColumn(headers: readonly string[], names: readonly string[]): number {
  const normalized = headers.map(normalizeHeader);
  for (const name of names) {
    const index = normalized.indexOf(normalizeHeader(name));
    if (index !== -1) {
      return index;
    }
  }
  return -1;
}

function parseSampleTime(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const numeric = Number(trimmed);
    if (!Number.isFinite(numeric)) {
      return null;
    }
    if (numeric >= 1e12) {
      return numeric;
    }
    if (numeric >= 1e9) {
      return numeric * 1000;
    }
    return null;
  }
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasExplicitTimezone(value: string): boolean {
  return /(?:z|[+-]\d{2}:?\d{2})$/i.test(value.trim());
}

function parseAmplitude(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseStationFromHeader(
  headers: readonly string[],
  values: readonly string[],
): Partial<WaveformStation> {
  const station: Partial<WaveformStation> = {};
  const fields: Array<[keyof WaveformStation, readonly string[]]> = [
    ['network', ['network', 'net']],
    ['station', ['station', 'sta']],
    ['channel', ['channel', 'cha']],
    ['location', ['location', 'loc']],
  ];
  fields.forEach(([key, names]) => {
    const index = findColumn(headers, names);
    if (index === -1) {
      return;
    }
    const value = values[index]?.trim();
    if (value !== undefined && value.length > 0) {
      station[key] = value;
    }
  });
  return station;
}

function mergeStation(
  fallback: Partial<WaveformStation> | undefined,
  metadata: Partial<WaveformStation>,
  headerStation: Partial<WaveformStation>,
): WaveformStation {
  const station: WaveformStation = {};
  const keys: Array<keyof WaveformStation> = [
    'network',
    'station',
    'channel',
    'location',
  ];
  keys.forEach((key) => {
    const value =
      headerStation[key] ?? metadata[key] ?? fallback?.[key];
    if (value !== undefined && value.trim().length > 0) {
      station[key] = value;
    }
  });
  return station;
}

function median(values: readonly number[]): number {
  if (values.length === 0) {
    return Number.NaN;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle] ?? Number.NaN;
  }
  const before = sorted[middle - 1];
  const after = sorted[middle];
  if (before === undefined || after === undefined) {
    return Number.NaN;
  }
  return (before + after) / 2;
}

function prepareSamples(
  samples: readonly WaveformSample[],
  warnings: string[],
): WaveformSample[] {
  const sorted = [...samples].sort((left, right) => left.timeMs - right.timeMs);
  if (sorted.some((sample, index) => sample !== samples[index])) {
    warnings.push('時刻が昇順ではなかったため、昇順に並べ替えました。');
  }
  const unique: WaveformSample[] = [];
  sorted.forEach((sample) => {
    const previous = unique[unique.length - 1];
    if (previous !== undefined && previous.timeMs === sample.timeMs) {
      warnings.push(
        `同時刻のサンプルを検出しました。最初の値を保持しました（${new Date(sample.timeMs).toISOString()}）。`,
      );
      return;
    }
    unique.push(sample);
  });
  return unique;
}

function computeSamplingRate(samples: readonly WaveformSample[]): {
  hz: number;
  irregular: boolean;
} {
  if (samples.length < 2) {
    return { hz: 0, irregular: false };
  }
  const deltas: number[] = [];
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    if (previous === undefined || current === undefined) {
      continue;
    }
    const delta = current.timeMs - previous.timeMs;
    if (delta > 0) {
      deltas.push(delta);
    }
  }
  if (deltas.length === 0) {
    return { hz: 0, irregular: false };
  }
  const medianDelta = median(deltas);
  const hz = Number.isFinite(medianDelta) && medianDelta > 0
    ? 1000 / medianDelta
    : 0;
  const irregular = deltas.some(
    (delta) => Math.abs(delta - medianDelta) > Math.max(1, medianDelta * 0.1),
  );
  return { hz, irregular };
}

function finalizeTrace(
  samples: readonly WaveformSample[],
  options: FinalizeOptions,
): WaveformTrace {
  if (samples.length === 0) {
    throw new WaveformParseError('有効なサンプルがありません。');
  }
  const warnings = [...options.warnings];
  const prepared = prepareSamples(samples, warnings);
  const first = prepared[0];
  const last = prepared[prepared.length - 1];
  if (first === undefined || last === undefined) {
    throw new WaveformParseError('有効なサンプルがありません。');
  }

  const computed = computeSamplingRate(prepared);
  if (computed.irregular) {
    warnings.push(
      'サンプル間隔が一定ではありません。サンプリング周波数は中央値から算出しました。',
    );
  }
  const declaredRate = options.metadata.samplingRateHz;
  const samplingRateHz =
    declaredRate !== undefined &&
    Number.isFinite(declaredRate) &&
    declaredRate > 0
      ? declaredRate
      : computed.hz;
  if (computed.hz > 0 && declaredRate !== undefined && declaredRate > 0) {
    const ratio = samplingRateHz / computed.hz;
    if (Math.abs(ratio - 1) > 0.05) {
      warnings.push(
        'ヘッダのサンプリング周波数とサンプル間隔が一致しません。ヘッダ値を優先しました。',
      );
    }
  }
  if (samplingRateHz === 0) {
    warnings.push('サンプリング周波数を算出できませんでした。');
  }

  const units =
    options.metadata.units?.trim() ||
    options.unitsFallback?.trim() ||
    UNSPECIFIED_UNITS;
  if (units === UNSPECIFIED_UNITS) {
    warnings.push(
      '振幅の単位が指定されていません。単位なしの値として表示します。',
    );
  }

  const station = mergeStation(
    options.stationFallback,
    options.metadata.station,
    {},
  );
  const startTimeMs = first.timeMs;
  const endTimeMs = last.timeMs;
  const fileName = options.fileName;
  const id = `${options.provider ?? PROVIDER}-${fileName}-${startTimeMs}`;

  return {
    id,
    station,
    units,
    samplingRateHz,
    startTimeMs,
    endTimeMs,
    samples: prepared,
    source: {
      provider: options.provider ?? PROVIDER,
      dataset: fileName,
      originalId: fileName,
      retrievedAt: options.loadedAt,
      note: options.sourceNote,
    },
    classification: options.classification,
    warnings,
  };
}

/**
 * Parse a user-provided CSV waveform.
 *
 * Required columns: time (ISO 8601 with timezone, Unix seconds, or Unix
 * milliseconds), amplitude. Optional columns: station, network, channel,
 * location, units, samplingRateHz. Comments beginning with # are ignored.
 *
 * No unit conversion is applied. The parsed amplitude stays in the supplied
 * units.
 */
export function parseWaveformCsv(
  text: string,
  options: WaveformFileOptions = {},
): WaveformTrace {
  const rows = parseCsvRows(text.replace(/^﻿/, '')).filter((row) => {
    const first = row[0]?.trim() ?? '';
    return first.length > 0 && !first.startsWith('#');
  });
  if (rows.length < 2) {
    throw new WaveformParseError(
      'CSV にヘッダとデータ行が必要です。',
    );
  }
  const headerRow = rows[0];
  const headers = headerRow?.map((value) => value.trim()) ?? [];
  const timeIndex = findColumn(headers, ['time', 'timestamp', 'datetime']);
  const amplitudeIndex = findColumn(headers, [
    'amplitude',
    'value',
    'counts',
    'velocity',
    'acceleration',
  ]);
  if (timeIndex === -1 || amplitudeIndex === -1) {
    throw new WaveformParseError(
      'CSV には time と amplitude の列が必要です。',
    );
  }

  const stationFromHeader = parseStationFromHeader(
    headers,
    rows[1] ?? [],
  );
  const unitsIndex = findColumn(headers, ['units', 'unit']);
  const rateIndex = findColumn(headers, [
    'samplingRateHz',
    'sampling_rate_hz',
    'samplingratehz',
    'sampling_rate',
  ]);
  const units =
    unitsIndex === -1 ? undefined : rows[1]?.[unitsIndex]?.trim() || undefined;
  const rateText =
    rateIndex === -1 ? undefined : rows[1]?.[rateIndex]?.trim();
  const rate = rateText === undefined ? undefined : Number(rateText);
  const samplingRateHz =
    rate !== undefined && Number.isFinite(rate) && rate > 0 ? rate : undefined;

  const samples: WaveformSample[] = [];
  const warnings: string[] = [];
  let invalidRows = 0;
  let timezoneWarnings = 0;

  rows.slice(1).forEach((row) => {
    const timeText = row[timeIndex]?.trim() ?? '';
    const amplitudeText = row[amplitudeIndex]?.trim() ?? '';
    const timeMs = parseSampleTime(timeText);
    const amplitude = parseAmplitude(amplitudeText);
    if (timeMs === null || amplitude === null) {
      invalidRows += 1;
      return;
    }
    if (
      !/^-?\d+(\.\d+)?$/.test(timeText) &&
      !hasExplicitTimezone(timeText)
    ) {
      timezoneWarnings += 1;
    }
    samples.push({ timeMs, amplitude, originalTime: timeText });
  });

  if (invalidRows > 0) {
    warnings.push(`${invalidRows} 行の時刻または振幅が不正なため除外しました。`);
  }
  if (timezoneWarnings > 0) {
    warnings.push(
      `${timezoneWarnings} 件の時刻にタイムゾーン指定がありません。ブラウザのローカル時刻として解釈しました。`,
    );
  }

  return finalizeTrace(samples, {
    fileName: options.fileName ?? 'waveform.csv',
    loadedAt: options.loadedAt ?? new Date().toISOString(),
    classification: 'OBSERVED',
    metadata: {
      station: stationFromHeader,
      units,
      samplingRateHz,
    },
    warnings,
    sourceNote:
      'ユーザー提供ファイル。出典・観測点・単位は EarthScope が検証していません。',
    unitsFallback: options.units,
    stationFallback: options.station,
  });
}

interface JsonSample {
  time?: unknown;
  amplitude?: unknown;
  value?: unknown;
}

/**
 * Parse a user-provided JSON waveform. Accepts either a top-level sample array
 * or an object with `samples`, `units`, `samplingRateHz`, and `station`.
 */
export function parseWaveformJson(
  text: string,
  options: WaveformFileOptions = {},
): WaveformTrace {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new WaveformParseError('JSON を解析できませんでした。');
  }
  const record =
    typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  const rawSamples = Array.isArray(parsed)
    ? parsed
    : record !== null && Array.isArray(record.samples)
      ? record.samples
      : null;
  if (rawSamples === null) {
    throw new WaveformParseError('JSON に samples 配列が必要です。');
  }

  const warnings: string[] = [];
  const samples: WaveformSample[] = [];
  rawSamples.forEach((rawSample) => {
    if (typeof rawSample !== 'object' || rawSample === null) {
      warnings.push('オブジェクトではないサンプルを除外しました。');
      return;
    }
    const sample = rawSample as JsonSample;
    const timeValue = sample.time;
    const amplitudeValue = sample.amplitude ?? sample.value;
    const timeMs =
      typeof timeValue === 'string'
        ? parseSampleTime(timeValue)
        : typeof timeValue === 'number' && Number.isFinite(timeValue)
          ? timeValue >= 1e12
            ? timeValue
            : timeValue >= 1e9
              ? timeValue * 1000
              : null
          : null;
    const amplitude =
      typeof amplitudeValue === 'number' && Number.isFinite(amplitudeValue)
        ? amplitudeValue
        : typeof amplitudeValue === 'string'
          ? parseAmplitude(amplitudeValue)
          : null;
    if (timeMs === null || amplitude === null) {
      warnings.push('時刻または振幅が不正なサンプルを除外しました。');
      return;
    }
    samples.push({
      timeMs,
      amplitude,
      originalTime:
        typeof timeValue === 'string'
          ? timeValue
          : typeof timeValue === 'number'
            ? String(timeValue)
            : undefined,
    });
  });

  const stationRecord =
    record !== null &&
    typeof record.station === 'object' &&
    record.station !== null &&
    !Array.isArray(record.station)
      ? (record.station as Record<string, unknown>)
      : null;
  const station: Partial<WaveformStation> = {};
  if (stationRecord !== null) {
    (['network', 'station', 'channel', 'location'] as const).forEach((key) => {
      const value = stationRecord[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        station[key] = value.trim();
      }
    });
  } else if (record !== null && typeof record.station === 'string') {
    station.station = record.station;
  }
  if (record !== null) {
    (['network', 'channel', 'location'] as const).forEach((key) => {
      const value = record[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        station[key] = value.trim();
      }
    });
  }
  const units =
    record !== null && typeof record.units === 'string'
      ? record.units.trim()
      : undefined;
  const rateValue = record !== null ? record.samplingRateHz : undefined;
  const samplingRateHz =
    typeof rateValue === 'number' && Number.isFinite(rateValue) && rateValue > 0
      ? rateValue
      : undefined;

  return finalizeTrace(samples, {
    fileName: options.fileName ?? 'waveform.json',
    loadedAt: options.loadedAt ?? new Date().toISOString(),
    classification: 'OBSERVED',
    metadata: { station, units, samplingRateHz },
    warnings,
    sourceNote:
      'ユーザー提供ファイル。出典・観測点・単位は EarthScope が検証していません。',
    unitsFallback: options.units,
    stationFallback: options.station,
  });
}
