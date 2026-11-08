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
    status: 'READY',
    homepage: 'https://earthquake.usgs.gov/earthquakes/feed/',
    documentationUrl: 'https://earthquake.usgs.gov/fdsnws/event/1/',
    dataLicense: 'Public Domain (U.S. Government Work)',
    attribution: 'U.S. Geological Survey',
    accessMethod:
      'HTTPS GeoJSON feed (browser fetch, Last-Modified / 304 conditional requests)',
    requiresAuthentication: false,
    corsVerified: true,
    redistributionAllowed: true,
    lastVerifiedAt: '2026-11-08T06:26:23Z',
    notes:
      'Browser fetch from the built app succeeded on 2026-11-08 (HTTP 200, 197 events). Last-Modified / 304 conditional requests work. USGS is a U.S. federal agency and its works are generally in the public domain. Attribution to the U.S. Geological Survey is retained. The license page returned HTTP 403 to automated access; the public-domain determination was confirmed separately.',
  },
  {
    id: 'natural-earth-110m',
    name: 'Natural Earth 1:110m Land and Boundaries',
    provider: 'Natural Earth',
    status: 'READY',
    homepage: 'https://www.naturalearthdata.com/',
    documentationUrl: 'https://github.com/nvkelso/natural-earth-vector',
    dataLicense: 'Public Domain',
    attribution: 'Natural Earth',
    accessMethod:
      'Bundled static GeoJSON assets (no tile server, no API key)',
    requiresAuthentication: false,
    corsVerified: true,
    redistributionAllowed: true,
    lastVerifiedAt: '2026-11-08T07:30:00Z',
    notes:
      'ne_110m_land.geojson and ne_110m_admin_0_boundary_lines_land.geojson are bundled under public/geo for the basemap. They provide geographic context only and are not a source of earthquake parameters.',
  },
  {
    id: 'gsi-tiles',
    name: 'GSI Standard / Pale Map Tiles',
    provider: 'Geospatial Information Authority of Japan',
    status: 'READY',
    homepage: 'https://maps.gsi.go.jp/development/ichiran.html',
    documentationUrl:
      'https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html',
    dataLicense:
      '国土地理院コンテンツ利用規約 / PDL1.0 (attribution required)',
    attribution: '国土地理院',
    accessMethod:
      'HTTPS raster tiles (z5-18, direct browser fetch, no API key)',
    requiresAuthentication: false,
    corsVerified: true,
    redistributionAllowed: null,
    lastVerifiedAt: '2026-11-08T08:00:00Z',
    notes:
      'GSI standard and pale raster tiles (z5-18) returned CORS-enabled PNGs. Attribution to 国土地理院 and a link to the GSI tile list are required. Tiles are fetched directly from the GSI service and are not bundled or redistributed by EarthScope.',
  },
  {
    id: 'jma-earthquake-list-json',
    name: 'JMA Earthquake Information List',
    provider: 'Japan Meteorological Agency',
    status: 'READY',
    homepage: 'https://www.jma.go.jp/bosai/quake/',
    documentationUrl:
      'https://www.jma.go.jp/jma/kishou/info/coment.html',
    dataLicense:
      '公共データ利用規約（第1.0版） / PDL1.0 (attribution required)',
    attribution: '気象庁',
    accessMethod:
      'HTTPS JSON (browser fetch, no API key, no conditional headers)',
    requiresAuthentication: false,
    corsVerified: true,
    redistributionAllowed: true,
    lastVerifiedAt: '2026-11-08T08:20:00Z',
    notes:
      'list.json returned 196 records / 154 unique Japan-region events over 30 days. CORS returned Access-Control-Allow-Origin: *. Coordinates use a mixed decimal-degree / degree-minute cod format and are stored as UNKNOWN CRS without datum transformation because the JSON does not state the CRS. Conditional requests are not sent because the JMA CORS allow-list is limited.',
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
