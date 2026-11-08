import type {
  EarthquakeLocation,
  EarthquakeMagnitude,
} from '../domain/earthquake/types';

const UTC_FORMATTER = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'UTC',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const JST_FORMATTER = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const COUNT_FORMATTER = new Intl.NumberFormat('ja-JP');

function parseTimestamp(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function formatUtcTimestamp(iso: string): string {
  const date = parseTimestamp(iso);
  return date === null ? '不明' : `${UTC_FORMATTER.format(date)} UTC`;
}

export function formatJstTimestamp(iso: string): string {
  const date = parseTimestamp(iso);
  return date === null ? '不明' : `${JST_FORMATTER.format(date)} JST`;
}

export function formatDepthKm(depthKm: number | undefined): string {
  if (depthKm === undefined || !Number.isFinite(depthKm)) {
    return '不明';
  }
  return `${depthKm.toFixed(1)} km`;
}

export function formatMagnitude(
  magnitude: EarthquakeMagnitude | undefined,
): string {
  if (magnitude === undefined || !Number.isFinite(magnitude.value)) {
    return '不明';
  }
  const value = `M${magnitude.value.toFixed(1)}`;
  return magnitude.type === undefined ? value : `${value} (${magnitude.type})`;
}

export function formatLatitude(latitude: number): string {
  if (!Number.isFinite(latitude)) {
    return '不明';
  }
  const hemisphere = latitude >= 0 ? 'N' : 'S';
  return `${Math.abs(latitude).toFixed(3)}°${hemisphere}`;
}

export function formatLongitude(longitude: number): string {
  if (!Number.isFinite(longitude)) {
    return '不明';
  }
  const hemisphere = longitude >= 0 ? 'E' : 'W';
  return `${Math.abs(longitude).toFixed(3)}°${hemisphere}`;
}

export function formatCoordinates(location: EarthquakeLocation): string {
  return `${formatLatitude(location.latitude)}, ${formatLongitude(
    location.longitude,
  )}`;
}

export function formatCount(value: number): string {
  return COUNT_FORMATTER.format(value);
}
