import type { Earthquake } from '../../domain/earthquake/types';
import type { GeographicBounds } from '../../domain/geography/japanRegion';
import {
  depthColorHex,
  depthToY,
  isInCrust3DRegion,
  latToZ,
  lonToX,
} from './crust3dStyle';

export interface LonLat {
  longitude: number;
  latitude: number;
}

export interface PlateLine {
  name: string;
  coordinates: LonLat[];
}

export interface SlabLine {
  depthKm: number;
  region: string;
  coordinates: LonLat[];
}

export interface EarthquakePointData {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  count: number;
}

export type Rgb = readonly [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized, 16);
  if (!Number.isFinite(value) || normalized.length !== 6) {
    return [0.5, 0.5, 0.5];
  }
  return [
    ((value >> 16) & 0xff) / 255,
    ((value >> 8) & 0xff) / 255,
    (value & 0xff) / 255,
  ];
}

export function magnitudeToPointSize(magnitude: number | undefined): number {
  const value = magnitude === undefined || !Number.isFinite(magnitude)
    ? 0
    : Math.max(0, magnitude);
  return Math.min(13, 4 + value * 1.35);
}

export function buildEarthquakePointData(
  events: readonly Earthquake[],
): EarthquakePointData {
  const inRegion = events.filter((event) =>
    isInCrust3DRegion(event.location),
  );
  const positions = new Float32Array(inRegion.length * 3);
  const colors = new Float32Array(inRegion.length * 3);
  const sizes = new Float32Array(inRegion.length);

  inRegion.forEach((event, index) => {
    const offset = index * 3;
    positions[offset] = lonToX(event.location.longitude);
    positions[offset + 1] = depthToY(event.location.depthKm);
    positions[offset + 2] = latToZ(event.location.latitude);

    const [red, green, blue] = hexToRgb(
      depthColorHex(event.location.depthKm),
    );
    colors[offset] = red;
    colors[offset + 1] = green;
    colors[offset + 2] = blue;
    sizes[index] = magnitudeToPointSize(event.magnitude?.value);
  });

  return { positions, colors, sizes, count: inRegion.length };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parsePosition(value: unknown): LonLat | null {
  if (!Array.isArray(value) || value.length < 2) {
    return null;
  }
  const longitude = value[0];
  const latitude = value[1];
  if (
    typeof longitude !== 'number' ||
    typeof latitude !== 'number' ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude)
  ) {
    return null;
  }
  return { longitude, latitude };
}

function forEachLineString(
  geometry: unknown,
  callback: (coordinates: unknown[]) => void,
): void {
  if (!isRecord(geometry)) {
    return;
  }
  const type = geometry.type;
  const coordinates = geometry.coordinates;
  if (type === 'LineString' && Array.isArray(coordinates)) {
    callback(coordinates);
    return;
  }
  if (type === 'MultiLineString' && Array.isArray(coordinates)) {
    coordinates.forEach((line) => {
      if (Array.isArray(line)) {
        callback(line);
      }
    });
  }
}

function isInsideBounds(point: LonLat, bounds: GeographicBounds): boolean {
  return (
    point.longitude >= bounds.minLongitude &&
    point.longitude <= bounds.maxLongitude &&
    point.latitude >= bounds.minLatitude &&
    point.latitude <= bounds.maxLatitude
  );
}

/**
 * Keep only the portions of a line inside the display bounds. Points outside
 * the block are dropped and the line is split when it re-enters. This is a
 * display clip, not a geographic intersection calculation.
 */
export function clipLineToBounds(
  coordinates: readonly unknown[],
  bounds: GeographicBounds,
): LonLat[][] {
  const segments: LonLat[][] = [];
  let current: LonLat[] = [];
  coordinates.forEach((coordinate) => {
    const point = parsePosition(coordinate);
    if (point === null || !isInsideBounds(point, bounds)) {
      if (current.length > 1) {
        segments.push(current);
      }
      current = [];
      return;
    }
    current.push(point);
  });
  if (current.length > 1) {
    segments.push(current);
  }
  return segments;
}

function featuresOf(data: unknown): unknown[] {
  if (!isRecord(data) || !Array.isArray(data.features)) {
    return [];
  }
  return data.features;
}

export function extractPlateLines(
  data: unknown,
  bounds: GeographicBounds,
): PlateLine[] {
  const lines: PlateLine[] = [];
  featuresOf(data).forEach((feature) => {
    if (!isRecord(feature)) {
      return;
    }
    const properties = isRecord(feature.properties)
      ? feature.properties
      : {};
    const name =
      typeof properties.Name === 'string'
        ? properties.Name
        : typeof properties.name === 'string'
          ? properties.name
          : 'plate boundary';
    forEachLineString(feature.geometry, (coordinates) => {
      clipLineToBounds(coordinates, bounds).forEach((segment) => {
        lines.push({ name, coordinates: segment });
      });
    });
  });
  return lines;
}

export function extractSlabLines(
  data: unknown,
  bounds: GeographicBounds,
): SlabLine[] {
  const lines: SlabLine[] = [];
  featuresOf(data).forEach((feature) => {
    if (!isRecord(feature)) {
      return;
    }
    const properties = isRecord(feature.properties)
      ? feature.properties
      : {};
    const depth = properties.depth;
    if (typeof depth !== 'number' || !Number.isFinite(depth)) {
      return;
    }
    const region =
      typeof properties.region === 'string'
        ? properties.region
        : 'Slab2';
    forEachLineString(feature.geometry, (coordinates) => {
      clipLineToBounds(coordinates, bounds).forEach((segment) => {
        lines.push({ depthKm: depth, region, coordinates: segment });
      });
    });
  });
  return lines;
}
