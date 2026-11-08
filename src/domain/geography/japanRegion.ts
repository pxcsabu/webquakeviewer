/**
 * Provisional Japan-region filter for the Phase 1 USGS catalog.
 *
 * This is an operational seismicity rectangle, not a political boundary. It
 * intentionally includes surrounding seas where earthquakes near Japan occur.
 * It may also include events near neighboring countries. Do not use it as a
 * legal or administrative boundary.
 */
export interface GeographicBounds {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
}

export const JAPAN_REGION_BOUNDS: Readonly<GeographicBounds> = Object.freeze({
  minLatitude: 20,
  maxLatitude: 47,
  minLongitude: 120,
  maxLongitude: 155,
});

export interface HasLocation {
  location: {
    latitude: number;
    longitude: number;
  };
}

export function isInJapanRegion(location: {
  latitude: number;
  longitude: number;
}): boolean {
  return (
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude) &&
    location.latitude >= JAPAN_REGION_BOUNDS.minLatitude &&
    location.latitude <= JAPAN_REGION_BOUNDS.maxLatitude &&
    location.longitude >= JAPAN_REGION_BOUNDS.minLongitude &&
    location.longitude <= JAPAN_REGION_BOUNDS.maxLongitude
  );
}

export function filterEventsInJapanRegion<T extends HasLocation>(
  events: readonly T[],
): T[] {
  return events.filter((event) => isInJapanRegion(event.location));
}
