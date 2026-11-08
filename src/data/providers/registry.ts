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
    id: 'usgs-slab2',
    name: 'USGS Slab2 Depth Contours',
    provider: 'United States Geological Survey',
    status: 'READY',
    homepage: 'https://earthquake.usgs.gov/slab2/',
    documentationUrl:
      'https://earthquake.usgs.gov/arcgis/rest/services/eq/slab2_depth/MapServer',
    dataLicense: 'Public Domain (U.S. Government Work) / CC0 1.0',
    attribution: 'USGS Slab2 (Hayes et al., 2018)',
    accessMethod:
      'Bundled static GeoJSON contours derived from the USGS Slab2 depth service',
    requiresAuthentication: false,
    corsVerified: true,
    redistributionAllowed: true,
    lastVerifiedAt: '2026-11-08T08:30:00Z',
    notes:
      'Japan-region depth contours (20–640 km) were retrieved from the USGS Slab2 depth service and simplified with Douglas-Peucker 0.01° for display. Slab2 is a model-derived subduction geometry, not direct observation. It is used for cross-section context only.',
  },
  {
    id: 'nied-kmoni',
    name: 'NIED Strong Motion Monitor (kmoni)',
    provider:
      'National Research Institute for Earth Science and Disaster Resilience',
    status: 'RESTRICTED',
    homepage: 'http://www.kmoni.bosai.go.jp/',
    documentationUrl:
      'https://www.kyoshin.bosai.go.jp/ja/about_kmoni/',
    dataLicense:
      'NIED 強震モニタ利用条件（転載・送信・再配布・観測点色抽出を禁止）',
    attribution: '防災科学技術研究所（NIED）',
    accessMethod:
      'Official HTTP page; embedding, relay, and pixel-value extraction are not permitted',
    requiresAuthentication: false,
    corsVerified: false,
    redistributionAllowed: false,
    lastVerifiedAt: '2026-11-08T09:00:00Z',
    notes:
      'NIED terms prohibit reproduction, transmission, and redistribution of kmoni content, and explicitly discourage extracting individual station values from the image colors. A Vercel/edge relay would be transmission/redistribution and is therefore not implemented. EarthScope links to the official site only. K-NET/KiK-net also remain restricted.',
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
    name: 'J-SHIS Seismic Hazard Map',
    provider: 'National Research Institute for Earth Science and Disaster Resilience',
    status: 'READY',
    homepage: 'https://www.j-shis.bosai.go.jp/map/',
    documentationUrl: 'https://www.j-shis.bosai.go.jp/wms-pshm',
    dataLicense:
      'J-SHIS利用規約（出典明記、地震動予測地図データの無断複製・再配布禁止）',
    attribution: 'J-SHIS 地震ハザードステーション（防災科研）',
    accessMethod: 'HTTPS WMS raster tiles (EPSG:3857, CORS enabled)',
    requiresAuthentication: false,
    corsVerified: true,
    redistributionAllowed: false,
    lastVerifiedAt: '2026-11-08T10:20:00Z',
    notes:
      'J-SHIS 2020年版の確率論的地震動予測地図をWMS画像として地図に重ねる。出典を明記し、生データの複製・再配布は行わない。WMSはCORS対応を確認済み。現在の揺れではなくモデルによる確率評価。',
  },
  {
    id: 'pb2002-plate-boundaries',
    name: 'PB2002 Plate Boundaries',
    provider: 'Peter Bird / Nordpil',
    status: 'READY',
    homepage: 'https://github.com/fraxen/tectonicplates',
    documentationUrl: 'https://github.com/fraxen/tectonicplates',
    dataLicense: 'Open Data Commons Attribution License 1.0 (ODC-By 1.0)',
    attribution: 'Bird (2003) PB2002 / Hugo Ahlenius, Nordpil',
    accessMethod: 'Bundled static GeoJSON (WGS84)',
    requiresAuthentication: false,
    corsVerified: true,
    redistributionAllowed: true,
    lastVerifiedAt: '2026-11-08T10:20:00Z',
    notes:
      '241 plate-boundary features from PB2002. Citation: Bird (2003), doi:10.1029/2001GC000252. GeoJSON conversion by Nordpil and csterling. Model-derived plate boundaries, not legal boundaries.',
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
