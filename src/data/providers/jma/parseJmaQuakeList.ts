import {
  INTENSITY_RANK_BY_DISPLAY,
  type Earthquake,
  type IntensityArea,
} from '../../../domain/earthquake/types';
import {
  isIntensityDisplay,
  isRecord,
  validateEarthquake,
} from '../../../domain/earthquake/validation';
import { ProviderError } from '../errors';

export interface JmaParseOptions {
  retrievedAt: string;
  dataset: string;
}

export interface JmaParseResult {
  events: Earthquake[];
  warnings: string[];
  latestReportAt?: string;
}

interface JmaIntensityCity {
  code: string;
  maxi: string;
}

interface JmaIntensityArea {
  prefectureCode: string;
  maxi: string;
  cities: JmaIntensityCity[];
}

interface JmaRecord {
  eid: string;
  at: string;
  rdt?: string;
  ttl?: string;
  anm?: string;
  cod: string;
  mag: string;
  maxi?: string;
  json?: string;
  intensityAreas: JmaIntensityArea[];
}

export interface JmaCoordinate {
  latitude: number;
  longitude: number;
  depthMeters?: number;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseJmaDegrees(
  value: string,
  kind: 'latitude' | 'longitude',
): number {
  const numeric = Number(value);
  const integerPart = value.split('.')[0] ?? '';
  const decimalMaxDigits = kind === 'latitude' ? 2 : 3;

  if (integerPart.length <= decimalMaxDigits) {
    return numeric;
  }

  const degrees = Math.trunc(numeric / 100);
  const minutes = numeric - degrees * 100;
  if (minutes < 0 || minutes >= 60) {
    return Number.NaN;
  }
  return degrees + minutes / 60;
}

/**
 * Parses the JMA `cod` format:
 *   +lat+lon-depth/
 * Latitude/longitude may be decimal degrees or DDMM.M / DDDMM.M.
 * Depth is in metres and may be omitted for distant events.
 */
export function parseJmaCoordinate(cod: string): JmaCoordinate | null {
  const match = cod.match(
    /^([+-])(\d+(?:\.\d+)?)([+-])(\d+(?:\.\d+)?)(?:([+-])(\d+))?\/$/,
  );
  if (match === null) {
    return null;
  }

  const latitude = parseJmaDegrees(match[2] ?? '', 'latitude');
  const longitude = parseJmaDegrees(match[4] ?? '', 'longitude');
  const depthMeters =
    match[6] === undefined ? undefined : Math.abs(Number(match[6]));

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180 ||
    (depthMeters !== undefined && !Number.isFinite(depthMeters))
  ) {
    return null;
  }

  const signedLatitude = match[1] === '-' ? -latitude : latitude;
  const signedLongitude = match[3] === '-' ? -longitude : longitude;

  return {
    latitude: signedLatitude,
    longitude: signedLongitude,
    ...(depthMeters !== undefined ? { depthMeters } : {}),
  };
}

function parseIntensityCity(value: unknown): JmaIntensityCity | null {
  if (!isRecord(value)) {
    return null;
  }
  if (
    !isNonEmptyString(value.code) ||
    !isNonEmptyString(value.maxi) ||
    !isIntensityDisplay(value.maxi)
  ) {
    return null;
  }
  return { code: value.code, maxi: value.maxi };
}

function parseIntensityAreas(value: unknown): JmaIntensityArea[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const areas: JmaIntensityArea[] = [];
  value.forEach((rawArea) => {
    if (!isRecord(rawArea)) {
      return;
    }
    const code = rawArea.code;
    const maxi = rawArea.maxi;
    if (
      typeof code !== 'string' ||
      !/^\d{2}$/.test(code) ||
      !isNonEmptyString(maxi) ||
      !isIntensityDisplay(maxi)
    ) {
      return;
    }
    const cities = Array.isArray(rawArea.city)
      ? rawArea.city
          .map(parseIntensityCity)
          .filter((city): city is JmaIntensityCity => city !== null)
      : [];
    areas.push({ prefectureCode: code, maxi, cities });
  });
  return areas;
}

function parseRecord(record: unknown): JmaRecord | null {
  if (!isRecord(record)) {
    return null;
  }
  if (
    !isNonEmptyString(record.eid) ||
    !isNonEmptyString(record.at) ||
    !isNonEmptyString(record.cod) ||
    !isNonEmptyString(record.mag)
  ) {
    return null;
  }

  return {
    eid: record.eid,
    at: record.at,
    cod: record.cod,
    mag: record.mag,
    ...(isNonEmptyString(record.rdt) ? { rdt: record.rdt } : {}),
    ...(isNonEmptyString(record.ttl) ? { ttl: record.ttl } : {}),
    ...(isNonEmptyString(record.anm) ? { anm: record.anm } : {}),
    ...(isNonEmptyString(record.maxi) ? { maxi: record.maxi } : {}),
    ...(isNonEmptyString(record.json) ? { json: record.json } : {}),
    intensityAreas: parseIntensityAreas(record.int),
  };
}

function reportTime(record: JmaRecord): number {
  const value = Date.parse(record.rdt ?? record.at);
  return Number.isFinite(value) ? value : 0;
}

function latestByReportTime(records: readonly JmaRecord[]): JmaRecord {
  return records.reduce((latest, record) =>
    reportTime(record) > reportTime(latest) ? record : latest,
  );
}

function toIntensity(value: string | undefined) {
  if (value === undefined || !isIntensityDisplay(value)) {
    return undefined;
  }
  return { display: value, rank: INTENSITY_RANK_BY_DISPLAY[value] };
}

export function parseJmaQuakeList(
  input: unknown,
  options: JmaParseOptions,
): JmaParseResult {
  if (!Array.isArray(input)) {
    throw new ProviderError(
      'PARSE',
      'JMA 地震情報一覧が配列ではありません。',
    );
  }

  const recordsByEid = new Map<string, JmaRecord[]>();
  for (const raw of input) {
    const record = parseRecord(raw);
    if (record === null) {
      continue;
    }
    const records = recordsByEid.get(record.eid);
    if (records === undefined) {
      recordsByEid.set(record.eid, [record]);
    } else {
      records.push(record);
    }
  }

  const events: Earthquake[] = [];
  const warnings: string[] = [];
  let latestReportAt: string | undefined;

  for (const [eid, records] of recordsByEid) {
    const completeRecords = records.filter(
      (record) => Number.isFinite(Number(record.mag)) && record.cod.length > 0,
    );
    if (completeRecords.length === 0) {
      continue;
    }

    const base = latestByReportTime(completeRecords);
    const coordinate = parseJmaCoordinate(base.cod);
    if (coordinate === null) {
      warnings.push(`JMA ${eid}: 座標形式を解析できませんでした（${base.cod}）。`);
      continue;
    }

    const originDate = new Date(base.at);
    if (!Number.isFinite(originDate.getTime())) {
      warnings.push(`JMA ${eid}: 発生時刻を解析できませんでした（${base.at}）。`);
      continue;
    }

    const magnitudeValue = Number(base.mag);
    if (!Number.isFinite(magnitudeValue)) {
      warnings.push(`JMA ${eid}: マグニチュードを解析できませんでした。`);
      continue;
    }

    const latestRecord = latestByReportTime(records);
    const latestWithIntensity = records
      .filter((record) => record.maxi !== undefined)
      .sort((left, right) => reportTime(right) - reportTime(left))[0];
    const intensity = toIntensity(latestWithIntensity?.maxi);
    const latestWithIntensityAreas = records
      .filter((record) => record.intensityAreas.length > 0)
      .sort((left, right) => reportTime(right) - reportTime(left))[0];
    const intensityAreas: IntensityArea[] = [];
    (latestWithIntensityAreas?.intensityAreas ?? []).forEach((area) => {
      const areaIntensity = toIntensity(area.maxi);
      if (areaIntensity === undefined) {
        return;
      }
      const cities = area.cities
        .map((city) => {
          const cityIntensity = toIntensity(city.maxi);
          return cityIntensity === undefined
            ? null
            : { code: city.code, maxIntensity: cityIntensity };
        })
        .filter((city): city is NonNullable<typeof city> => city !== null);
      intensityAreas.push({
        prefectureCode: area.prefectureCode,
        maxIntensity: areaIntensity,
        ...(cities.length > 0 ? { cities } : {}),
      });
    });

    const updatedAtDate = latestRecord.rdt
      ? new Date(latestRecord.rdt)
      : null;
    const updatedAt =
      updatedAtDate !== null && Number.isFinite(updatedAtDate.getTime())
        ? updatedAtDate.toISOString()
        : undefined;

    if (updatedAt !== undefined) {
      if (
        latestReportAt === undefined ||
        Date.parse(updatedAt) > Date.parse(latestReportAt)
      ) {
        latestReportAt = updatedAt;
      }
    }

    const depthKm =
      coordinate.depthMeters === undefined
        ? undefined
        : coordinate.depthMeters / 1000;

    const detailJson = base.json ?? latestRecord.json;
    const sourceUrl = detailJson
      ? `https://www.jma.go.jp/bosai/quake/data/${detailJson}`
      : 'https://www.jma.go.jp/bosai/quake/';

    const event: Earthquake = {
      id: `jma:${eid}`,
      source: {
        provider: 'JMA',
        dataset: options.dataset,
        originalId: eid,
        retrievedAt: options.retrievedAt,
        ...(updatedAt !== undefined ? { updatedAt } : {}),
        sourceUrl,
        attribution: '気象庁',
      },
      time: {
        originTime: originDate.toISOString(),
        originalTime: base.at,
        originalTimezone: '+09:00',
      },
      location: {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        ...(depthKm !== undefined ? { depthKm } : {}),
        crs: 'UNKNOWN',
        original: {
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
          ...(coordinate.depthMeters !== undefined
            ? { depth: { value: coordinate.depthMeters, unit: 'm' } }
            : {}),
          crs: 'UNKNOWN',
        },
      },
      ...(base.anm !== undefined ? { place: base.anm } : {}),
      eventType: 'earthquake',
      magnitude: { value: magnitudeValue },
      ...(intensity !== undefined ? { intensity } : {}),
      ...(intensityAreas.length > 0 ? { intensityAreas } : {}),
      classification: 'OBSERVED',
    };

    const validation = validateEarthquake(event);
    if (!validation.ok) {
      const details = validation.issues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join('; ');
      warnings.push(`JMA ${eid}: ${details}`);
      continue;
    }
    warnings.push(
      ...validation.warnings.map(
        (issue) => `JMA ${eid}: ${issue.message}`,
      ),
    );
    events.push(validation.value);
  }

  return {
    events,
    warnings,
    ...(latestReportAt !== undefined ? { latestReportAt } : {}),
  };
}
