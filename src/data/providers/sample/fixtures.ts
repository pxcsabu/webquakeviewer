import type { Earthquake } from '../../../domain/earthquake/types';

/**
 * Development-only fixtures.
 *
 * These are explicitly ILLUSTRATIVE. They are not observations, do not describe
 * actual earthquakes, and must never be cached or presented as live data.
 */
export const sampleEarthquakes: readonly Earthquake[] = [
  {
    id: 'sample-001',
    source: {
      provider: 'EarthScope Development Fixture',
      dataset: 'phase0-sample',
      originalId: 'sample-001',
      retrievedAt: null,
    },
    time: {
      originTime: '2026-01-01T00:00:00Z',
    },
    location: {
      latitude: 35.6,
      longitude: 139.7,
      depthKm: 42.5,
      crs: 'UNKNOWN',
      original: {
        latitude: 35.6,
        longitude: 139.7,
        depth: { value: 42.5, unit: 'km' },
        crs: 'UNKNOWN',
      },
    },
    magnitude: {
      value: 4.8,
      type: 'SAMPLE',
    },
    classification: 'ILLUSTRATIVE',
  },
  {
    id: 'sample-002',
    source: {
      provider: 'EarthScope Development Fixture',
      dataset: 'phase0-sample',
      originalId: 'sample-002',
      retrievedAt: null,
    },
    time: {
      originTime: '2026-01-01T01:30:00Z',
    },
    location: {
      latitude: 38.3,
      longitude: 142.4,
      depthKm: 12.0,
      crs: 'UNKNOWN',
      original: {
        latitude: 38.3,
        longitude: 142.4,
        depth: { value: 12.0, unit: 'km' },
        crs: 'UNKNOWN',
      },
    },
    magnitude: {
      value: 5.6,
      type: 'SAMPLE',
    },
    classification: 'ILLUSTRATIVE',
  },
  {
    id: 'sample-003',
    source: {
      provider: 'EarthScope Development Fixture',
      dataset: 'phase0-sample',
      originalId: 'sample-003',
      retrievedAt: null,
    },
    time: {
      originTime: '2026-01-01T03:15:00Z',
    },
    location: {
      latitude: 33.1,
      longitude: 135.2,
      depthKm: 88.0,
      crs: 'UNKNOWN',
      original: {
        latitude: 33.1,
        longitude: 135.2,
        depth: { value: 88.0, unit: 'km' },
        crs: 'UNKNOWN',
      },
    },
    magnitude: {
      value: 3.9,
      type: 'SAMPLE',
    },
    classification: 'ILLUSTRATIVE',
  },
];
