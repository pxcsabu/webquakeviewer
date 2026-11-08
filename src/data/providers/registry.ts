import type { SourceRegistryEntry } from './types';

/**
 * Source registry.
 *
 * Unknown legal and technical values intentionally remain null. Do not mark a
 * source READY until browser access and usage conditions have been verified.
 */
export const SOURCE_REGISTRY: readonly SourceRegistryEntry[] = [
  {
    id: 'usgs-earthquake-feed',
    name: 'USGS Earthquake GeoJSON Feed',
    provider: 'United States Geological Survey',
    status: 'CONDITIONAL',
    homepage: 'https://earthquake.usgs.gov/earthquakes/feed/',
    documentationUrl: 'https://earthquake.usgs.gov/fdsnws/event/1/',
    dataLicense: null,
    attribution: 'USGS Earthquake Hazards Program',
    accessMethod:
      'HTTPS GeoJSON feed (browser fetch, Last-Modified / 304 conditional requests)',
    requiresAuthentication: false,
    corsVerified: true,
    redistributionAllowed: null,
    lastVerifiedAt: '2026-11-08T06:26:23Z',
    notes:
      'Browser fetch from the built app succeeded on 2026-11-08 (HTTP 200, 197 events). Last-Modified / 304 conditional requests work. The USGS usage/license page returned HTTP 403, so license and redistribution terms remain subject to manual review.',
  },
  {
    id: 'jma-disaster-prevention-xml',
    name: 'JMA Disaster Prevention XML',
    provider: 'Japan Meteorological Agency',
    status: 'CONDITIONAL',
    homepage: 'https://www.jma.go.jp/',
    documentationUrl: 'https://xml.kishou.go.jp/',
    dataLicense: null,
    attribution: null,
    accessMethod: 'HTTPS XML pull (endpoint pending verification)',
    requiresAuthentication: false,
    corsVerified: false,
    redistributionAllowed: null,
    lastVerifiedAt: null,
    notes:
      'Endpoint-specific CORS behavior, update frequency, and usage conditions must be verified before implementation.',
  },
  {
    id: 'nied-hinet',
    name: 'NIED Hi-net',
    provider: 'National Research Institute for Earth Science and Disaster Resilience',
    status: 'RESTRICTED',
    homepage: 'https://www.hinet.bosai.go.jp/',
    documentationUrl: null,
    dataLicense: null,
    attribution: null,
    accessMethod: 'Restricted download / authenticated access',
    requiresAuthentication: true,
    corsVerified: false,
    redistributionAllowed: null,
    lastVerifiedAt: null,
    notes:
      'Historical waveform download requires credentials and redistribution is restricted. Not implemented.',
  },
  {
    id: 'nied-knet-kiknet',
    name: 'NIED K-NET / KiK-net',
    provider: 'National Research Institute for Earth Science and Disaster Resilience',
    status: 'RESTRICTED',
    homepage: 'https://www.kyoshin.bosai.go.jp/',
    documentationUrl: null,
    dataLicense: null,
    attribution: null,
    accessMethod: 'Registered download / authenticated access',
    requiresAuthentication: true,
    corsVerified: false,
    redistributionAllowed: null,
    lastVerifiedAt: null,
    notes:
      'Registration and data usage conditions apply. Not implemented.',
  },
  {
    id: 'j-shis',
    name: 'J-SHIS',
    provider: 'National Research Institute for Earth Science and Disaster Resilience',
    status: 'CONDITIONAL',
    homepage: 'https://www.j-shis.bosai.go.jp/',
    documentationUrl: null,
    dataLicense: null,
    attribution: null,
    accessMethod: 'Dataset-specific download (pending review)',
    requiresAuthentication: false,
    corsVerified: false,
    redistributionAllowed: null,
    lastVerifiedAt: null,
    notes:
      'Dataset-specific license, coordinate reference system, resolution, and redistribution terms must be reviewed.',
  },
  {
    id: 'gsj',
    name: 'Geological Survey of Japan',
    provider: 'National Institute of Advanced Industrial Science and Technology',
    status: 'CONDITIONAL',
    homepage: 'https://www.gsj.jp/',
    documentationUrl: null,
    dataLicense: null,
    attribution: null,
    accessMethod: 'Dataset-specific download (pending review)',
    requiresAuthentication: false,
    corsVerified: false,
    redistributionAllowed: null,
    lastVerifiedAt: null,
    notes:
      'Dataset-specific licensing, attribution, scale, and coordinate systems must be reviewed.',
  },
];

export function getSourceRegistryEntry(
  id: string,
): SourceRegistryEntry | undefined {
  return SOURCE_REGISTRY.find((entry) => entry.id === id);
}
