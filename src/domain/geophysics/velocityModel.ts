import type { GeoPoint } from '../../analysis/geodesy/distance';
import { haversineDistanceKm } from '../../analysis/geodesy/distance';

export type VelocityProperty = 'vp' | 'vs' | 'vpvs' | 'relp' | 'rels';

export interface VelocityAxes {
  lons: Float32Array;
  lats: Float32Array;
  depths: Float32Array;
  lonCount: number;
  latCount: number;
  depthCount: number;
}

export interface VelocitySource {
  provider: string;
  dataset: string;
  fileName: string;
  loadedAt: string;
  citation: string;
  doi: string;
  usageNote: string;
  crs: 'UNKNOWN';
}

export interface VelocityModel {
  axes: VelocityAxes;
  vp: Float32Array;
  vs: Float32Array;
  relP: Float32Array;
  relS: Float32Array;
  source: VelocitySource;
  classification: 'MODEL';
}

export interface VelocityProfile {
  distancesKm: Float32Array;
  values: Float32Array;
  sampleCount: number;
  depthCount: number;
  min: number;
  max: number;
}

/**
 * Parse a one-value-per-line axis file from the ALJ package. Values are sorted
 * ascending and deduplicated so the worker can validate the grid axes.
 */
export function parseAxisList(text: string): Float32Array {
  const values = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => Number(line))
    .filter((value) => Number.isFinite(value));
  values.sort((left, right) => left - right);
  const unique: number[] = [];
  values.forEach((value) => {
    const previous = unique[unique.length - 1];
    if (previous === undefined || Math.abs(previous - value) > 1e-9) {
      unique.push(value);
    }
  });
  return Float32Array.from(unique);
}

export function velocityValueAt(
  model: VelocityModel,
  property: VelocityProperty,
  index: number,
): number {
  if (property === 'vp') {
    return model.vp[index] ?? Number.NaN;
  }
  if (property === 'vs') {
    return model.vs[index] ?? Number.NaN;
  }
  if (property === 'relp') {
    return model.relP[index] ?? Number.NaN;
  }
  if (property === 'rels') {
    return model.relS[index] ?? Number.NaN;
  }
  const vp = model.vp[index];
  const vs = model.vs[index];
  if (vp === undefined || vs === undefined || vs === 0) {
    return Number.NaN;
  }
  return vp / vs;
}

export function propertyUnit(property: VelocityProperty): string {
  if (property === 'vp' || property === 'vs') {
    return 'km/s';
  }
  if (property === 'vpvs') {
    return 'Vp/Vs';
  }
  return '信頼度';
}

export function propertyLabel(property: VelocityProperty): string {
  if (property === 'vp') return 'P波速度';
  if (property === 'vs') return 'S波速度';
  if (property === 'vpvs') return 'Vp/Vs';
  if (property === 'relp') return 'P波信頼度';
  return 'S波信頼度';
}

function nearestIndex(axis: Float32Array, value: number): number {
  if (axis.length === 0) {
    return 0;
  }
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < axis.length; index += 1) {
    const candidate = axis[index];
    if (candidate === undefined) {
      continue;
    }
    const distance = Math.abs(candidate - value);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  }
  return best;
}

/**
 * Sample the model along a straight geographic profile using nearest grid
 * cells. This is a display sampler, not a spline or a new velocity inversion.
 */
export function sampleVelocityProfile(
  model: VelocityModel,
  start: GeoPoint,
  end: GeoPoint,
  property: VelocityProperty,
  sampleCount = 160,
): VelocityProfile {
  const count = Math.max(2, Math.floor(sampleCount));
  const { axes } = model;
  const values = new Float32Array(count * axes.depthCount);
  const distances = new Float32Array(count);
  let distance = 0;
  let previous = start;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (let sampleIndex = 0; sampleIndex < count; sampleIndex += 1) {
    const ratio = sampleIndex / (count - 1);
    const point: GeoPoint = {
      latitude: start.latitude + (end.latitude - start.latitude) * ratio,
      longitude: start.longitude + (end.longitude - start.longitude) * ratio,
    };
    if (sampleIndex > 0) {
      distance += haversineDistanceKm(previous, point);
    }
    distances[sampleIndex] = distance;
    previous = point;
    const lonIndex = nearestIndex(axes.lons, point.longitude);
    const latIndex = nearestIndex(axes.lats, point.latitude);
    for (let depthIndex = 0; depthIndex < axes.depthCount; depthIndex += 1) {
      const gridIndex =
        (depthIndex * axes.latCount + latIndex) * axes.lonCount + lonIndex;
      const value = velocityValueAt(model, property, gridIndex);
      const outputIndex = depthIndex * count + sampleIndex;
      values[outputIndex] = Number.isFinite(value) ? value : Number.NaN;
      if (Number.isFinite(value)) {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    }
  }

  return {
    distancesKm: distances,
    values,
    sampleCount: count,
    depthCount: axes.depthCount,
    min: Number.isFinite(min) ? min : 0,
    max: Number.isFinite(max) ? max : 1,
  };
}
