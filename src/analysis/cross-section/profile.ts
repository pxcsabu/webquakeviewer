import type {
  FeatureCollection,
  LineString,
  MultiLineString,
} from 'geojson';
import type { Earthquake } from '../../domain/earthquake/types';
import {
  haversineDistanceKm,
  initialBearingRad,
  toProfileCoordinates,
  type GeoPoint,
} from '../geodesy/distance';

export interface SlabContourProperties {
  depth: number | string;
  region?: string;
}

export type SlabContourGeometry = LineString | MultiLineString;
export type SlabContourCollection = FeatureCollection<
  SlabContourGeometry,
  SlabContourProperties
>;

export interface CrossSectionEvent {
  event: Earthquake;
  alongKm: number;
  crossKm: number;
  depthKm: number;
}

export interface SlabIntersection {
  region: string;
  alongKm: number;
  depthKm: number;
}

export interface CrossSectionExclusions {
  missingDepth: number;
  outsideCorridor: number;
  invalidContours: number;
}

export interface CrossSectionResult {
  start: GeoPoint;
  end: GeoPoint;
  lengthKm: number;
  bearingRad: number;
  halfWidthKm: number;
  events: CrossSectionEvent[];
  slabIntersections: SlabIntersection[];
  exclusions: CrossSectionExclusions;
}

function isFinitePosition(position: number[] | undefined): position is [
  number,
  number,
] {
  return (
    position !== undefined &&
    position.length >= 2 &&
    Number.isFinite(position[0]) &&
    Number.isFinite(position[1])
  );
}

function collectIntersections(
  coordinates: number[][],
  start: GeoPoint,
  bearingRad: number,
  lengthKm: number,
  depthKm: number,
  region: string,
  output: SlabIntersection[],
): void {
  const local = coordinates
    .filter(isFinitePosition)
    .map(([longitude, latitude]) =>
      toProfileCoordinates({ latitude, longitude }, start, bearingRad),
    );

  for (let index = 0; index < local.length - 1; index += 1) {
    const left = local[index];
    const right = local[index + 1];
    if (left === undefined || right === undefined) {
      continue;
    }

    if (Math.abs(left.crossKm) < 1e-9 && Math.abs(right.crossKm) < 1e-9) {
      continue;
    }

    const crosses =
      left.crossKm === 0 ||
      right.crossKm === 0 ||
      left.crossKm * right.crossKm < 0;
    if (!crosses) {
      continue;
    }

    const denominator = left.crossKm - right.crossKm;
    if (Math.abs(denominator) < 1e-12) {
      continue;
    }
    const fraction = left.crossKm / denominator;
    const alongKm =
      left.alongKm + fraction * (right.alongKm - left.alongKm);
    if (alongKm < 0 || alongKm > lengthKm) {
      continue;
    }

    output.push({ region, alongKm, depthKm });
  }
}

export function buildCrossSection(
  events: readonly Earthquake[],
  contours: SlabContourCollection | null,
  start: GeoPoint,
  end: GeoPoint,
  halfWidthKm = 100,
): CrossSectionResult {
  const lengthKm = haversineDistanceKm(start, end);
  const bearingRad = initialBearingRad(start, end);
  const exclusions: CrossSectionExclusions = {
    missingDepth: 0,
    outsideCorridor: 0,
    invalidContours: 0,
  };

  const projectedEvents: CrossSectionEvent[] = [];
  for (const event of events) {
    const depthKm = event.location.depthKm;
    if (depthKm === undefined || !Number.isFinite(depthKm)) {
      exclusions.missingDepth += 1;
      continue;
    }

    const profile = toProfileCoordinates(
      event.location,
      start,
      bearingRad,
    );
    if (
      Math.abs(profile.crossKm) > halfWidthKm ||
      profile.alongKm < 0 ||
      profile.alongKm > lengthKm
    ) {
      exclusions.outsideCorridor += 1;
      continue;
    }

    projectedEvents.push({
      event,
      alongKm: profile.alongKm,
      crossKm: profile.crossKm,
      depthKm,
    });
  }

  const slabIntersections: SlabIntersection[] = [];
  if (contours !== null) {
    for (const feature of contours.features) {
      const depthKm = Number(feature.properties.depth);
      if (!Number.isFinite(depthKm)) {
        exclusions.invalidContours += 1;
        continue;
      }
      const region = feature.properties.region ?? 'Unknown';
      const geometry = feature.geometry;
      if (geometry.type === 'LineString') {
        collectIntersections(
          geometry.coordinates,
          start,
          bearingRad,
          lengthKm,
          depthKm,
          region,
          slabIntersections,
        );
      } else if (geometry.type === 'MultiLineString') {
        for (const line of geometry.coordinates) {
          collectIntersections(
            line,
            start,
            bearingRad,
            lengthKm,
            depthKm,
            region,
            slabIntersections,
          );
        }
      } else {
        exclusions.invalidContours += 1;
      }
    }
  }

  const deduped = new Map<string, SlabIntersection>();
  for (const intersection of slabIntersections) {
    const key = `${intersection.region}|${intersection.depthKm}|${Math.round(
      intersection.alongKm,
    )}`;
    if (!deduped.has(key)) {
      deduped.set(key, intersection);
    }
  }

  return {
    start,
    end,
    lengthKm,
    bearingRad,
    halfWidthKm,
    events: projectedEvents,
    slabIntersections: [...deduped.values()],
    exclusions,
  };
}

export function groupSlabIntersectionsByRegion(
  intersections: readonly SlabIntersection[],
): Map<string, SlabIntersection[]> {
  const grouped = new Map<string, SlabIntersection[]>();
  for (const intersection of intersections) {
    const group = grouped.get(intersection.region);
    if (group === undefined) {
      grouped.set(intersection.region, [intersection]);
    } else {
      group.push(intersection);
    }
  }
  for (const group of grouped.values()) {
    group.sort((left, right) => left.alongKm - right.alongKm);
  }
  return grouped;
}
