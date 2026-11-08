export const GLOBE_RADIUS = 1;
export const DEPTH_DISPLAY_MAX_KM = 700;
export const DEPTH_RADIUS_OFFSET = 0.15;
export const JAPAN_CENTER = { latitude: 36, longitude: 138 };

/**
 * Display-only radial scale: 0 km is the surface, 700 km is 0.15 R below it.
 * This is not a physical depth scale; it exists so hypocenters remain visible
 * inside the semi-transparent globe.
 */
export function depthToRadius(depthKm: number | undefined): number {
  if (depthKm === undefined || !Number.isFinite(depthKm)) {
    return GLOBE_RADIUS;
  }
  const clamped = Math.min(
    DEPTH_DISPLAY_MAX_KM,
    Math.max(0, depthKm),
  );
  return (
    GLOBE_RADIUS - (clamped / DEPTH_DISPLAY_MAX_KM) * DEPTH_RADIUS_OFFSET
  );
}

export function depthColorHex(depthKm: number | undefined): string {
  if (depthKm === undefined || !Number.isFinite(depthKm)) {
    return '#7f8c8d';
  }
  if (depthKm < 30) {
    return '#c0392b';
  }
  if (depthKm < 100) {
    return '#d68910';
  }
  if (depthKm < 300) {
    return '#2e86c1';
  }
  return '#6c3483';
}

export const GLOBE_DEPTH_CLASSES = [
  { label: '0–30 km', color: '#c0392b' },
  { label: '30–100 km', color: '#d68910' },
  { label: '100–300 km', color: '#2e86c1' },
  { label: '300 km 以上', color: '#6c3483' },
  { label: '深さ不明', color: '#7f8c8d' },
] as const;
