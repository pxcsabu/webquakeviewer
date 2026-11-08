import type { Earthquake } from '../../../domain/earthquake/types';
import {
  isFiniteNumber,
  isIsoUtcTimestamp,
  isRecord,
  validateEarthquake,
} from '../../../domain/earthquake/validation';
import { ProviderError } from '../errors';

export interface UsgsParseOptions {
  retrievedAt: string;
  dataset: string;
}

export interface UsgsParseResult {
  events: Earthquake[];
  sourceUpdatedAt?: string;
  warnings: string[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function toUtcTimestamp(epochMilliseconds: number): string | null {
  if (!Number.isFinite(epochMilliseconds)) {
    return null;
  }
  const date = new Date(epochMilliseconds);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function parseFeature(
  feature: unknown,
  options: UsgsParseOptions,
  index: number,
): { event: Earthquake | null; warnings: string[] } {
  const warnings: string[] = [];
  const prefix = `features[${index}]`;

  if (!isRecord(feature)) {
    return {
      event: null,
      warnings: [`${prefix}: Feature オブジェクトではありません。`],
    };
  }

  const featureId = feature.id;
  if (!isNonEmptyString(featureId)) {
    return {
      event: null,
      warnings: [`${prefix}: feature.id がありません。`],
    };
  }

  const properties = feature.properties;
  if (!isRecord(properties)) {
    return {
      event: null,
      warnings: [`${prefix}: properties がありません。`],
    };
  }

  const originTime = properties.time;
  if (!isFiniteNumber(originTime)) {
    return {
      event: null,
      warnings: [`${prefix}: properties.time が数値ではありません。`],
    };
  }
  const originTimeIso = toUtcTimestamp(originTime);
  if (originTimeIso === null || !isIsoUtcTimestamp(originTimeIso)) {
    return {
      event: null,
      warnings: [`${prefix}: properties.time を UTC に変換できません。`],
    };
  }

  const geometry = feature.geometry;
  if (!isRecord(geometry)) {
    return {
      event: null,
      warnings: [`${prefix}: geometry がありません。`],
    };
  }

  const coordinates = geometry.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return {
      event: null,
      warnings: [`${prefix}: geometry.coordinates が不正です。`],
    };
  }

  const longitude = coordinates[0];
  const latitude = coordinates[1];
  const rawDepth = coordinates.length > 2 ? coordinates[2] : undefined;

  if (!isFiniteNumber(longitude) || !isFiniteNumber(latitude)) {
    return {
      event: null,
      warnings: [`${prefix}: 経度または緯度が数値ではありません。`],
    };
  }

  let depthKm: number | undefined;
  if (rawDepth !== undefined && rawDepth !== null) {
    if (!isFiniteNumber(rawDepth)) {
      return {
        event: null,
        warnings: [`${prefix}: 深さが数値ではありません。`],
      };
    }
    depthKm = rawDepth;
  }

  const updatedAt =
    isFiniteNumber(properties.updated) &&
    toUtcTimestamp(properties.updated) !== null
      ? toUtcTimestamp(properties.updated) ?? undefined
      : undefined;
  if (
    isFiniteNumber(properties.updated) &&
    toUtcTimestamp(properties.updated) === null
  ) {
    warnings.push(`${prefix}: properties.updated を UTC に変換できません。`);
  }

  const magnitudeValue = properties.mag;
  const magnitude =
    isFiniteNumber(magnitudeValue)
      ? {
          value: magnitudeValue,
          ...(isNonEmptyString(properties.magType)
            ? { type: properties.magType }
            : {}),
        }
      : undefined;

  const event: Earthquake = {
    id: `usgs:${featureId}`,
    source: {
      provider: 'USGS',
      dataset: options.dataset,
      originalId: featureId,
      retrievedAt: options.retrievedAt,
      ...(updatedAt !== undefined ? { updatedAt } : {}),
      ...(isNonEmptyString(properties.url)
        ? { sourceUrl: properties.url }
        : {}),
      attribution: 'USGS Earthquake Hazards Program',
    },
    time: {
      originTime: originTimeIso,
    },
    location: {
      latitude,
      longitude,
      ...(depthKm !== undefined ? { depthKm } : {}),
      crs: 'WGS84',
      original: {
        latitude,
        longitude,
        ...(depthKm !== undefined
          ? { depth: { value: depthKm, unit: 'km' } }
          : {}),
        crs: 'WGS84',
      },
    },
    ...(magnitude !== undefined ? { magnitude } : {}),
    ...(isNonEmptyString(properties.place)
      ? { place: properties.place }
      : {}),
    ...(isNonEmptyString(properties.type)
      ? { eventType: properties.type }
      : {}),
    classification: 'OBSERVED',
  };

  const validation = validateEarthquake(event);
  if (!validation.ok) {
    const details = validation.issues
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join('; ');
    return {
      event: null,
      warnings: [`${prefix} (${featureId}): ${details}`],
    };
  }

  warnings.push(
    ...validation.warnings.map(
      (issue) => `${prefix} (${featureId}): ${issue.message}`,
    ),
  );

  return { event: validation.value, warnings };
}

export function parseUsgsGeoJson(
  input: unknown,
  options: UsgsParseOptions,
): UsgsParseResult {
  if (!isRecord(input) || input.type !== 'FeatureCollection') {
    throw new ProviderError(
      'PARSE',
      'USGS レスポンスが GeoJSON FeatureCollection ではありません。',
    );
  }

  if (!Array.isArray(input.features)) {
    throw new ProviderError(
      'PARSE',
      'USGS レスポンスの features 配列がありません。',
    );
  }

  const warnings: string[] = [];
  let sourceUpdatedAt: string | undefined;

  if (isRecord(input.metadata)) {
    const generated = input.metadata.generated;
    if (isFiniteNumber(generated)) {
      const generatedIso = toUtcTimestamp(generated);
      if (generatedIso !== null) {
        sourceUpdatedAt = generatedIso;
      } else {
        warnings.push('metadata.generated を UTC に変換できません。');
      }
    }
  }

  const events: Earthquake[] = [];
  const seenIds = new Set<string>();

  input.features.forEach((feature, index) => {
    const parsed = parseFeature(feature, options, index);
    warnings.push(...parsed.warnings);
    if (parsed.event === null) {
      return;
    }
    if (seenIds.has(parsed.event.id)) {
      warnings.push(
        `features[${index}] (${parsed.event.source.originalId}): 重複したイベント ID をスキップしました。`,
      );
      return;
    }
    seenIds.add(parsed.event.id);
    events.push(parsed.event);
  });

  return { events, warnings, ...(sourceUpdatedAt ? { sourceUpdatedAt } : {}) };
}
