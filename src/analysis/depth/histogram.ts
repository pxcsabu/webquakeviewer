import type { Earthquake } from '../../domain/earthquake/types';

export interface DepthBin {
  minKm: number;
  maxKm: number | null;
  label: string;
  count: number;
}

export const DEFAULT_DEPTH_EDGES = [
  0, 30, 60, 100, 150, 300, 700,
] as const;

function binLabel(minKm: number, maxKm: number | null): string {
  return maxKm === null ? `${minKm} km 以上` : `${minKm}–${maxKm} km`;
}

export function buildDepthHistogram(
  events: readonly Earthquake[],
  edges: readonly number[] = DEFAULT_DEPTH_EDGES,
): DepthBin[] {
  if (edges.length < 2) {
    return [];
  }

  const bins: DepthBin[] = [];
  for (let index = 0; index < edges.length - 1; index += 1) {
    const minKm = edges[index];
    const maxKm = edges[index + 1];
    if (minKm === undefined || maxKm === undefined) {
      continue;
    }
    bins.push({
      minKm,
      maxKm,
      label: binLabel(minKm, maxKm),
      count: 0,
    });
  }

  const lastMin = edges[edges.length - 1];
  if (lastMin !== undefined) {
    bins.push({
      minKm: lastMin,
      maxKm: null,
      label: binLabel(lastMin, null),
      count: 0,
    });
  }

  for (const event of events) {
    const depthKm = event.location.depthKm;
    if (depthKm === undefined || !Number.isFinite(depthKm)) {
      continue;
    }
    const index = bins.findIndex(
      (bin) =>
        depthKm >= bin.minKm &&
        (bin.maxKm === null || depthKm < bin.maxKm),
    );
    const bin = bins[index];
    if (bin !== undefined) {
      bin.count += 1;
    }
  }

  return bins;
}
