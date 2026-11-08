import type { Earthquake } from '../../domain/earthquake/types';
import { haversineDistanceKm } from '../geodesy/distance';

export interface ClusteringOptions {
  /** Maximum surface distance between points in a cluster, in km. */
  epsKm: number;
  /** Minimum number of points for a core point. */
  minPts: number;
}

export interface SpatialCluster {
  id: number;
  events: Earthquake[];
  centroid: { latitude: number; longitude: number };
  maxMagnitude: number | null;
  startTime: string;
  endTime: string;
}

export interface ClusteringResult {
  clusters: SpatialCluster[];
  noiseCount: number;
  parameters: ClusteringOptions;
}

const UNVISITED = -1;
const NOISE = -2;

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Deterministic DBSCAN over haversine surface distance.
 *
 * The input is sorted by origin time before scanning so cluster IDs are stable
 * for the same catalog. Centroid is an arithmetic mean of latitude/longitude
 * for small regional clusters; it is not a geodetic centroid.
 */
export function clusterEvents(
  events: readonly Earthquake[],
  options: ClusteringOptions = { epsKm: 50, minPts: 3 },
): ClusteringResult {
  const { epsKm, minPts } = options;
  if (
    !Number.isFinite(epsKm) ||
    epsKm <= 0 ||
    !Number.isInteger(minPts) ||
    minPts < 2
  ) {
    return {
      clusters: [],
      noiseCount: events.length,
      parameters: options,
    };
  }

  const sorted = [...events].sort((left, right) => {
    const leftTime = Date.parse(left.time.originTime);
    const rightTime = Date.parse(right.time.originTime);
    if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) {
      return left.id.localeCompare(right.id);
    }
    return leftTime - rightTime;
  });

  const neighbors: number[][] = sorted.map((event, index) => {
    const result: number[] = [];
    for (let otherIndex = 0; otherIndex < sorted.length; otherIndex += 1) {
      const other = sorted[otherIndex];
      if (other === undefined) {
        continue;
      }
      if (index === otherIndex) {
        result.push(otherIndex);
        continue;
      }
      if (haversineDistanceKm(event.location, other.location) <= epsKm) {
        result.push(otherIndex);
      }
    }
    return result;
  });

  const labels = new Array<number>(sorted.length).fill(UNVISITED);
  let nextClusterId = 0;

  for (let index = 0; index < sorted.length; index += 1) {
    if (labels[index] !== UNVISITED) {
      continue;
    }

    const pointNeighbors = neighbors[index] ?? [];
    if (pointNeighbors.length < minPts) {
      labels[index] = NOISE;
      continue;
    }

    labels[index] = nextClusterId;
    const seed = [...pointNeighbors];
    const queued = new Set(seed);

    for (let seedIndex = 0; seedIndex < seed.length; seedIndex += 1) {
      const candidateIndex = seed[seedIndex];
      if (candidateIndex === undefined) {
        continue;
      }

      if (labels[candidateIndex] === NOISE) {
        labels[candidateIndex] = nextClusterId;
      }
      if (labels[candidateIndex] !== UNVISITED) {
        continue;
      }

      labels[candidateIndex] = nextClusterId;
      const candidateNeighbors = neighbors[candidateIndex] ?? [];
      if (candidateNeighbors.length >= minPts) {
        for (const neighborIndex of candidateNeighbors) {
          if (!queued.has(neighborIndex)) {
            queued.add(neighborIndex);
            seed.push(neighborIndex);
          }
        }
      }
    }

    nextClusterId += 1;
  }

  const groups = new Map<number, Earthquake[]>();
  for (let index = 0; index < sorted.length; index += 1) {
    const label = labels[index];
    const event = sorted[index];
    if (label === undefined || event === undefined || label < 0) {
      continue;
    }
    const group = groups.get(label);
    if (group === undefined) {
      groups.set(label, [event]);
    } else {
      group.push(event);
    }
  }

  const clusters: SpatialCluster[] = [];
  for (const [id, clusterEvents] of groups) {
    const times = clusterEvents
      .map((event) => Date.parse(event.time.originTime))
      .filter((value) => Number.isFinite(value));
    const magnitudes = clusterEvents
      .map((event) => event.magnitude?.value)
      .filter((value): value is number => value !== undefined);
    clusters.push({
      id,
      events: clusterEvents,
      centroid: {
        latitude: mean(
          clusterEvents.map((event) => event.location.latitude),
        ),
        longitude: mean(
          clusterEvents.map((event) => event.location.longitude),
        ),
      },
      maxMagnitude:
        magnitudes.length > 0 ? Math.max(...magnitudes) : null,
      startTime: new Date(
        times.length > 0 ? Math.min(...times) : 0,
      ).toISOString(),
      endTime: new Date(
        times.length > 0 ? Math.max(...times) : 0,
      ).toISOString(),
    });
  }

  clusters.sort(
    (left, right) =>
      right.events.length - left.events.length ||
      left.startTime.localeCompare(right.startTime),
  );

  return {
    clusters,
    noiseCount: labels.filter((label) => label < 0).length,
    parameters: options,
  };
}
