import {
  COORDINATE_REFERENCE_SYSTEMS,
  DATA_CLASSIFICATIONS,
  INTENSITY_RANK_BY_DISPLAY,
  type CoordinateReferenceSystem,
  type DataClassification,
  type Earthquake,
  type EarthquakeMagnitude,
  type EarthquakeSource,
  type EarthquakeTime,
  type IntensityDisplay,
  type OriginalDepth,
  type OriginalLocation,
  type SeismicIntensity,
} from './types';

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  path: string;
  message: string;
  severity: ValidationSeverity;
}

export type ValidationResult<T> =
  | { ok: true; value: T; warnings: ValidationIssue[] }
  | { ok: false; issues: ValidationIssue[]; warnings: ValidationIssue[] };

const ISO_UTC_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

const classificationSet = new Set<string>(DATA_CLASSIFICATIONS);
const crsSet = new Set<string>(COORDINATE_REFERENCE_SYSTEMS);
const intensityDisplays = Object.keys(
  INTENSITY_RANK_BY_DISPLAY,
) as IntensityDisplay[];

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isValidLatitude(value: unknown): value is number {
  return isFiniteNumber(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: unknown): value is number {
  return isFiniteNumber(value) && value >= -180 && value <= 180;
}

/**
 * Accepts only UTC ISO 8601 timestamps with a trailing Z.
 * The round-trip check rejects dates such as 2026-02-30.
 */
export function isIsoUtcTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_UTC_PATTERN.test(value)) {
    return false;
  }

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return false;
  }

  const normalizedInput = value.replace(/\.\d{1,3}Z$/, 'Z');
  const normalizedDate = date.toISOString().replace(/\.\d{3}Z$/, 'Z');
  return normalizedInput === normalizedDate;
}

export function isDataClassification(
  value: unknown,
): value is DataClassification {
  return typeof value === 'string' && classificationSet.has(value);
}

export function isCoordinateReferenceSystem(
  value: unknown,
): value is CoordinateReferenceSystem {
  return typeof value === 'string' && crsSet.has(value);
}

export function isIntensityDisplay(
  value: unknown,
): value is IntensityDisplay {
  return (
    typeof value === 'string' &&
    intensityDisplays.includes(value as IntensityDisplay)
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function readRequiredString(
  record: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationIssue[],
): string | undefined {
  const value = record[key];
  if (!isNonEmptyString(value)) {
    errors.push({
      path,
      message: '空でない文字列が必要です。',
      severity: 'error',
    });
    return undefined;
  }
  return value;
}

function readOptionalString(
  record: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationIssue[],
): string | undefined {
  const value = record[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!isNonEmptyString(value)) {
    errors.push({
      path,
      message: '空でない文字列が必要です。',
      severity: 'error',
    });
    return undefined;
  }
  return value;
}

function readOptionalUtcTimestamp(
  record: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationIssue[],
): string | undefined {
  const value = record[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!isIsoUtcTimestamp(value)) {
    errors.push({
      path,
      message: 'UTC の ISO 8601 タイムスタンプ（例: 2026-11-08T00:00:00Z）が必要です。',
      severity: 'error',
    });
    return undefined;
  }
  return value;
}

function parseSource(
  value: unknown,
  errors: ValidationIssue[],
): EarthquakeSource | undefined {
  if (!isRecord(value)) {
    errors.push({
      path: 'source',
      message: 'source オブジェクトが必要です。',
      severity: 'error',
    });
    return undefined;
  }

  const provider = readRequiredString(value, 'provider', 'source.provider', errors);
  const dataset = readRequiredString(value, 'dataset', 'source.dataset', errors);
  const originalId = readRequiredString(
    value,
    'originalId',
    'source.originalId',
    errors,
  );

  const retrievedAtRaw = value.retrievedAt;
  let retrievedAt: string | null | undefined;
  if (retrievedAtRaw === null) {
    retrievedAt = null;
  } else if (isIsoUtcTimestamp(retrievedAtRaw)) {
    retrievedAt = retrievedAtRaw;
  } else {
    errors.push({
      path: 'source.retrievedAt',
      message:
        '取得時刻は UTC の ISO 8601 形式、または ILLUSTRATIVE の場合のみ null が必要です。',
      severity: 'error',
    });
    retrievedAt = undefined;
  }

  const updatedAt = readOptionalUtcTimestamp(
    value,
    'updatedAt',
    'source.updatedAt',
    errors,
  );
  const sourceUrl = readOptionalString(
    value,
    'sourceUrl',
    'source.sourceUrl',
    errors,
  );
  const attribution = readOptionalString(
    value,
    'attribution',
    'source.attribution',
    errors,
  );
  const license = readOptionalString(value, 'license', 'source.license', errors);

  if (
    provider === undefined ||
    dataset === undefined ||
    originalId === undefined ||
    retrievedAt === undefined
  ) {
    return undefined;
  }

  const source: EarthquakeSource = {
    provider,
    dataset,
    originalId,
    retrievedAt,
  };
  if (updatedAt !== undefined) source.updatedAt = updatedAt;
  if (sourceUrl !== undefined) source.sourceUrl = sourceUrl;
  if (attribution !== undefined) source.attribution = attribution;
  if (license !== undefined) source.license = license;
  return source;
}

function parseTime(
  value: unknown,
  errors: ValidationIssue[],
): EarthquakeTime | undefined {
  if (!isRecord(value)) {
    errors.push({
      path: 'time',
      message: 'time オブジェクトが必要です。',
      severity: 'error',
    });
    return undefined;
  }

  const originTimeRaw = value.originTime;
  if (!isIsoUtcTimestamp(originTimeRaw)) {
    errors.push({
      path: 'time.originTime',
      message:
        '発生時刻は UTC の ISO 8601 タイムスタンプ（例: 2026-11-08T00:00:00Z）が必要です。',
      severity: 'error',
    });
    return undefined;
  }

  const originalTime = readOptionalString(
    value,
    'originalTime',
    'time.originalTime',
    errors,
  );
  const originalTimezone = readOptionalString(
    value,
    'originalTimezone',
    'time.originalTimezone',
    errors,
  );

  const time: EarthquakeTime = { originTime: originTimeRaw };
  if (originalTime !== undefined) time.originalTime = originalTime;
  if (originalTimezone !== undefined) time.originalTimezone = originalTimezone;
  return time;
}

function parseOriginalDepth(
  value: unknown,
  path: string,
  errors: ValidationIssue[],
): OriginalDepth | undefined {
  if (!isRecord(value)) {
    errors.push({
      path,
      message: '元の深さは value と unit を持つオブジェクトが必要です。',
      severity: 'error',
    });
    return undefined;
  }

  const depthValue = value.value;
  const unit = readRequiredString(value, 'unit', `${path}.unit`, errors);
  if (!isFiniteNumber(depthValue)) {
    errors.push({
      path: `${path}.value`,
      message: '有限の数値が必要です。',
      severity: 'error',
    });
    return undefined;
  }
  if (unit === undefined) {
    return undefined;
  }
  return { value: depthValue, unit };
}

function parseOriginalLocation(
  value: unknown,
  errors: ValidationIssue[],
): OriginalLocation | undefined {
  if (!isRecord(value)) {
    errors.push({
      path: 'location.original',
      message: 'original は座標オブジェクトが必要です。',
      severity: 'error',
    });
    return undefined;
  }

  const latitude = value.latitude;
  const longitude = value.longitude;
  const crs = value.crs;

  if (!isValidLatitude(latitude)) {
    errors.push({
      path: 'location.original.latitude',
      message: '緯度は -90 以上 90 以下の有限値が必要です。',
      severity: 'error',
    });
  }
  if (!isValidLongitude(longitude)) {
    errors.push({
      path: 'location.original.longitude',
      message: '経度は -180 以上 180 以下の有限値が必要です。',
      severity: 'error',
    });
  }
  if (!isCoordinateReferenceSystem(crs)) {
    errors.push({
      path: 'location.original.crs',
      message: '既知の CRS 識別子が必要です。',
      severity: 'error',
    });
  }

  const depth =
    value.depth === undefined || value.depth === null
      ? undefined
      : parseOriginalDepth(value.depth, 'location.original.depth', errors);

  if (
    !isValidLatitude(latitude) ||
    !isValidLongitude(longitude) ||
    !isCoordinateReferenceSystem(crs)
  ) {
    return undefined;
  }

  const original: OriginalLocation = { latitude, longitude, crs };
  if (depth !== undefined) original.depth = depth;
  return original;
}

function parseLocation(
  value: unknown,
  warnings: ValidationIssue[],
  errors: ValidationIssue[],
): Earthquake['location'] | undefined {
  if (!isRecord(value)) {
    errors.push({
      path: 'location',
      message: 'location オブジェクトが必要です。',
      severity: 'error',
    });
    return undefined;
  }

  const latitude = value.latitude;
  const longitude = value.longitude;
  const crs = value.crs;
  const depthKm = value.depthKm;

  if (!isValidLatitude(latitude)) {
    errors.push({
      path: 'location.latitude',
      message: '緯度は -90 以上 90 以下の有限値が必要です。',
      severity: 'error',
    });
  }
  if (!isValidLongitude(longitude)) {
    errors.push({
      path: 'location.longitude',
      message: '経度は -180 以上 180 以下の有限値が必要です。',
      severity: 'error',
    });
  }
  if (!isCoordinateReferenceSystem(crs)) {
    errors.push({
      path: 'location.crs',
      message: '既知の CRS 識別子が必要です。',
      severity: 'error',
    });
  }

  let normalizedDepthKm: number | undefined;
  if (depthKm !== undefined && depthKm !== null) {
    if (!isFiniteNumber(depthKm)) {
      errors.push({
        path: 'location.depthKm',
        message: '深さは有限の数値が必要です。',
        severity: 'error',
      });
    } else {
      normalizedDepthKm = depthKm;
      if (depthKm < 0) {
        warnings.push({
          path: 'location.depthKm',
          message: '深さが負の値です。正の下向き規約と出典を確認してください。',
          severity: 'warning',
        });
      }
    }
  }

  const original =
    value.original === undefined || value.original === null
      ? undefined
      : parseOriginalLocation(value.original, errors);

  if (
    !isValidLatitude(latitude) ||
    !isValidLongitude(longitude) ||
    !isCoordinateReferenceSystem(crs)
  ) {
    return undefined;
  }

  const location: Earthquake['location'] = { latitude, longitude, crs };
  if (normalizedDepthKm !== undefined) location.depthKm = normalizedDepthKm;
  if (original !== undefined) location.original = original;
  return location;
}

function parseMagnitude(
  value: unknown,
  errors: ValidationIssue[],
): EarthquakeMagnitude | undefined {
  if (!isRecord(value)) {
    errors.push({
      path: 'magnitude',
      message: 'magnitude はオブジェクトが必要です。',
      severity: 'error',
    });
    return undefined;
  }

  const magnitudeValue = value.value;
  const type = readOptionalString(value, 'type', 'magnitude.type', errors);
  const uncertainty = value.uncertainty;

  if (!isFiniteNumber(magnitudeValue)) {
    errors.push({
      path: 'magnitude.value',
      message: 'マグニチュードは有限の数値が必要です。',
      severity: 'error',
    });
    return undefined;
  }
  if (
    uncertainty !== undefined &&
    uncertainty !== null &&
    (!isFiniteNumber(uncertainty) || uncertainty < 0)
  ) {
    errors.push({
      path: 'magnitude.uncertainty',
      message: '不確かさは 0 以上の有限値が必要です。',
      severity: 'error',
    });
  }

  const magnitude: EarthquakeMagnitude = { value: magnitudeValue };
  if (type !== undefined) magnitude.type = type;
  if (isFiniteNumber(uncertainty)) magnitude.uncertainty = uncertainty;
  return magnitude;
}

function parseIntensity(
  value: unknown,
  errors: ValidationIssue[],
): SeismicIntensity | undefined {
  if (!isRecord(value)) {
    errors.push({
      path: 'intensity',
      message: 'intensity はオブジェクトが必要です。',
      severity: 'error',
    });
    return undefined;
  }

  const display = value.display;
  const rank = value.rank;

  if (!isIntensityDisplay(display)) {
    errors.push({
      path: 'intensity.display',
      message: '震度表示は 0, 1, 2, 3, 4, 5-, 5+, 6-, 6+, 7 のいずれかです。',
      severity: 'error',
    });
    return undefined;
  }
  if (typeof rank !== 'number' || !Number.isInteger(rank)) {
    errors.push({
      path: 'intensity.rank',
      message: '震度ランクは整数が必要です。',
      severity: 'error',
    });
    return undefined;
  }

  const expectedRank = INTENSITY_RANK_BY_DISPLAY[display];
  if (rank !== expectedRank) {
    errors.push({
      path: 'intensity.rank',
      message: `震度 ${display} のランクは ${expectedRank} である必要があります。`,
      severity: 'error',
    });
    return undefined;
  }

  return { display, rank };
}

export function validateEarthquake(
  input: unknown,
): ValidationResult<Earthquake> {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!isRecord(input)) {
    return {
      ok: false,
      issues: [
        {
          path: '$',
          message: '地震レコードはオブジェクトが必要です。',
          severity: 'error',
        },
      ],
      warnings: [],
    };
  }

  const id = readRequiredString(input, 'id', 'id', errors);
  const source = parseSource(input.source, errors);
  const time = parseTime(input.time, errors);
  const location = parseLocation(input.location, warnings, errors);
  const classification = input.classification;

  if (!isDataClassification(classification)) {
    errors.push({
      path: 'classification',
      message: '既知のデータ分類が必要です。',
      severity: 'error',
    });
  }

  const magnitude =
    input.magnitude === undefined || input.magnitude === null
      ? undefined
      : parseMagnitude(input.magnitude, errors);
  const intensity =
    input.intensity === undefined || input.intensity === null
      ? undefined
      : parseIntensity(input.intensity, errors);

  if (
    source !== undefined &&
    isDataClassification(classification) &&
    classification !== 'ILLUSTRATIVE' &&
    source.retrievedAt === null
  ) {
    errors.push({
      path: 'source.retrievedAt',
      message:
        '実データ（ILLUSTRATIVE 以外）には取得時刻が必要です。null は ILLUSTRATIVE のみ許可されます。',
      severity: 'error',
    });
  }

  if (
    errors.length > 0 ||
    id === undefined ||
    source === undefined ||
    time === undefined ||
    location === undefined ||
    !isDataClassification(classification)
  ) {
    return { ok: false, issues: errors, warnings };
  }

  const earthquake: Earthquake = {
    id,
    source,
    time,
    location,
    classification,
  };
  if (magnitude !== undefined) earthquake.magnitude = magnitude;
  if (intensity !== undefined) earthquake.intensity = intensity;

  return { ok: true, value: earthquake, warnings };
}
