import type { Earthquake } from '../../domain/earthquake/types';

export const JMA_ESTIMATED_LIST_URL =
  'https://www.jma.go.jp/bosai/estimated_intensity_map/data/list.json';
export const JMA_ESTIMATED_BASE_URL =
  'https://www.jma.go.jp/bosai/estimated_intensity_map/data';
export const JMA_ESTIMATED_ATTRIBUTION =
  '気象庁 推計震度分布図（250mメッシュ）';

export interface JmaEstimatedHypo {
  at: string;
  lat: number;
  lon: number;
  dep: number;
  mag: number;
  epi: string;
  maxi: number;
}

export interface JmaEstimatedEntry {
  url: string;
  meshNum: string[];
  datum?: number;
  hypo: JmaEstimatedHypo;
  bounds?: [[number, number], [number, number]];
}

export type ImageCoordinates = [
  [number, number],
  [number, number],
  [number, number],
  [number, number],
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Parse the JMA estimated-intensity list. Only entries with usable mesh IDs
 * and hypocenter metadata are retained. The raw list is public JMA data and
 * is not bundled with EarthScope.
 */
export function parseJmaEstimatedList(input: unknown): JmaEstimatedEntry[] {
  if (!Array.isArray(input)) {
    return [];
  }
  const entries: JmaEstimatedEntry[] = [];
  input.forEach((raw) => {
    if (!isRecord(raw)) {
      return;
    }
    const url = raw.url;
    const hypoRaw = raw.hypo;
    if (typeof url !== 'string' || !isRecord(hypoRaw)) {
      return;
    }
    const at = hypoRaw.at;
    const lat = hypoRaw.lat;
    const lon = hypoRaw.lon;
    if (
      typeof at !== 'string' ||
      !isFiniteNumber(lat) ||
      !isFiniteNumber(lon)
    ) {
      return;
    }
    const meshNum = Array.isArray(raw.mesh_num)
      ? raw.mesh_num.filter(
          (mesh): mesh is string =>
            typeof mesh === 'string' && /^\d{4}$/.test(mesh),
        )
      : [];
    if (meshNum.length === 0) {
      return;
    }
    const datum = isFiniteNumber(raw.datum) ? raw.datum : undefined;
    const bounds = Array.isArray(raw.bounds)
      ? (raw.bounds as [[number, number], [number, number]])
      : undefined;
    entries.push({
      url,
      meshNum,
      ...(datum !== undefined ? { datum } : {}),
      ...(bounds !== undefined ? { bounds } : {}),
      hypo: {
        at,
        lat,
        lon,
        dep: isFiniteNumber(hypoRaw.dep) ? hypoRaw.dep : 0,
        mag: isFiniteNumber(hypoRaw.mag) ? hypoRaw.mag : 0,
        epi: typeof hypoRaw.epi === 'string' ? hypoRaw.epi : '',
        maxi: isFiniteNumber(hypoRaw.maxi) ? hypoRaw.maxi : 0,
      },
    });
  });
  return entries;
}

/**
 * Match a normalized JMA event to the estimated-intensity list by the first
 * 12 digits of the JMA event ID (YYYYMMDDHHmm in JST). This avoids relying on
 * floating-point times or approximate coordinates.
 */
export function findJmaEstimatedEntry(
  event: Earthquake | null,
  entries: readonly JmaEstimatedEntry[],
): JmaEstimatedEntry | null {
  if (event === null || event.source.provider !== 'JMA') {
    return null;
  }
  const prefix = event.source.originalId.slice(0, 12);
  if (prefix.length !== 12) {
    return null;
  }
  return entries.find((entry) => entry.url.slice(0, 12) === prefix) ?? null;
}

/**
 * Decode one JMA estimated-intensity mesh ID into geographic bounds.
 *
 * JMA's mesh IDs encode a 1-degree longitude by 40-minute latitude tile.
 * The legacy datum adjustment is the same linear correction used by the JMA
 * map viewer. Each PNG contains 250m estimated-intensity cells.
 */
export function estimatedMeshBounds(
  mesh: string,
  datum?: number,
): ImageCoordinates | null {
  if (!/^\d{4}$/.test(mesh)) {
    return null;
  }
  let south = Number.parseInt(mesh.slice(0, 2), 10) / 1.5;
  let west = Number.parseInt(mesh.slice(2, 4), 10) + 100;
  let north = south + 40 / 60;
  let east = west + 1;
  if (datum !== 2) {
    south =
      south -
      10695e-8 * south +
      17464e-9 * west +
      0.0046017;
    west =
      west -
      46038e-9 * south -
      83043e-9 * west +
      0.01004;
    north =
      north -
      10695e-8 * north +
      17464e-9 * east +
      0.0046017;
    east =
      east -
      46038e-9 * north -
      83043e-9 * east +
      0.01004;
  }
  return [
    [west, north],
    [east, north],
    [east, south],
    [west, south],
  ];
}

export function estimatedMeshUrl(
  entry: JmaEstimatedEntry,
  mesh: string,
): string {
  return `${JMA_ESTIMATED_BASE_URL}/${entry.url}/${mesh}.png`;
}

let cachedList: Promise<JmaEstimatedEntry[]> | null = null;

/**
 * Load the JMA estimated-intensity list lazily. The list is cached in memory
 * only after a user selects a qualifying event; it is not fetched at startup.
 */
export function loadJmaEstimatedList(): Promise<JmaEstimatedEntry[]> {
  if (cachedList === null) {
    cachedList = fetch(JMA_ESTIMATED_LIST_URL)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            `推計震度分布図の一覧を取得できませんでした（HTTP ${response.status}）。`,
          );
        }
        return parseJmaEstimatedList((await response.json()) as unknown);
      })
      .catch((error: unknown) => {
        cachedList = null;
        throw error;
      });
  }
  return cachedList;
}
