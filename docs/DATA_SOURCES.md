# Data Sources

## 1. Purpose

This document records potential external data providers and the conditions required before integration.

A provider being publicly accessible does not automatically mean its data can be freely redistributed or fetched from a browser.

Every source must be reviewed individually.

## 2. Source Status Definitions

| Status | Meaning |
|---|---|
| READY | Browser access and usage conditions have been verified |
| CONDITIONAL | Potentially usable, but technical or legal verification is required |
| RESTRICTED | Requires authentication, registration, or special permission |
| UNVERIFIED | Not yet tested |
| UNAVAILABLE | Currently unusable for the intended purpose |

Do not mark a source READY without actual verification.

## 3. USGS Earthquake Feeds

**Status: READY**

USGS provides earthquake GeoJSON feeds suitable for automated event display.

Verification notes (2026-11-08):

- `summary/all_day.geojson` returned HTTP 200 with `Access-Control-Allow-Origin: *` from the built application in a browser.
- A browser run displayed 197 events and stored them in IndexedDB.
- `Last-Modified` and `304 Not Modified` conditional requests were verified in the browser.
- The feed did not return an `ETag` in the observed response; `Last-Modified` is therefore the primary validator.
- Catalog display and cache are restricted to the provisional Japan region 20°N–47°N, 120°E–155°E. This is a seismicity rectangle, not a legal boundary.
- The `all_day` feed is global and may be subject to provider limits. The filtered subset is not guaranteed to be a complete regional catalog.
- USGS is a U.S. federal agency. Its works are generally public domain (U.S. Government Work). Attribution to the U.S. Geological Survey is retained.
- The license page returned HTTP 403 to automated access. The public-domain determination was confirmed separately; do not treat the 403 as a redistribution prohibition.

Official resources:

- https://earthquake.usgs.gov/earthquakes/feed/
- https://earthquake.usgs.gov/fdsnws/event/1/

Potential uses:

- Global earthquake catalog
- Recent earthquake list
- Magnitude filtering
- Depth visualization
- Event detail display
- Periodic catalog updates

Implementation requirements:

- Prefer official GeoJSON feeds for recent-event display.
- Respect provider update intervals.
- Avoid unnecessary polling.
- Preserve event IDs and source timestamps.
- Handle updated and deleted events where applicable.
- Provide source attribution.

The feed is suitable for near-current catalog display, not guaranteed real-time seismic streaming.

## 4. Natural Earth Basemap

**Status: READY**

Natural Earth 1:110m land and country-boundary vectors are bundled as static
GeoJSON assets for the MapLibre basemap.

Bundled files:

- `public/geo/ne_110m_land.geojson`
- `public/geo/ne_110m_admin_0_boundary_lines_land.geojson`

Conditions and limitations:

- Natural Earth data is public domain.
- Attribution: Natural Earth.
- No tile server, API key, or cross-origin tile request is required.
- The basemap provides geographic context only. It is not used for distance,
  area, boundary, or legal determinations.
- The 1:110m scale is intentionally coarse. It must not be presented as a
  high-resolution coastline or administrative boundary.

## 5. GSI Standard / Pale Map Tiles

**Status: READY**

The Geospatial Information Authority of Japan (GSI) provides detailed raster
tiles for the Japanese archipelago and surrounding areas.

Tile endpoints:

- Standard: `https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png`
- Pale: `https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png`

Conditions and limitations:

- Zoom levels 5–18 for both standard and pale tiles.
- CORS was verified with `Origin: https://pxcsabu.github.io`; the responses
  include `Access-Control-Allow-Origin: *`.
- No API key is required.
- Attribution to 国土地理院 and a link to the GSI tile list are required.
- Tiles are fetched directly from the GSI service. EarthScope does not bundle
  or redistribute the tile images.
- The tiles are a geographic basemap only. They are not used for distance,
  boundary, or scientific calculations.
- The standard and pale styles are selectable in the map UI. Natural Earth is
  retained as an offline fallback.

Reference: [GSI tile list](https://maps.gsi.go.jp/development/ichiran.html),
[GSI content terms](https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html).

## 6. Japan Meteorological Agency

**Status: READY for the earthquake information list; CONDITIONAL for disaster-prevention XML**

Implemented source:

- Endpoint: `https://www.jma.go.jp/bosai/quake/data/list.json`
- Format: JSON array of earthquake information reports
- Browser access: verified; `Access-Control-Allow-Origin: *`
- Usage terms: 公共データ利用規約（第1.0版 / PDL1.0） with attribution to 気象庁
- Observed data: 196 reports / 154 unique Japan-region events over 30 days
- The list is a 30-day rolling window. The UI defaults to the last 24 hours and allows the full 30-day window.
- JMA default display and USGS switching were verified on the deployed GitHub Pages site on 2026-11-08.
- The list contains multiple report types for the same `eid`. EarthScope deduplicates by `eid` and uses the latest complete report, while retaining the latest available maximum intensity.
- JMA `cod` coordinates mix decimal-degree and degree-minute notation. They are normalized to decimal degrees without a datum transformation.
- The JSON does not state a coordinate reference system. EarthScope stores these coordinates with `crs: UNKNOWN` rather than silently assuming WGS84.
- Conditional requests are not sent because the JMA CORS allow-list does not include `If-None-Match` or `If-Modified-Since`. EarthScope uses its IndexedDB cache for offline/stale fallback.
- Seismic intensity `maxi` is stored as the display value plus an explicit ordinal rank; the rank is not a linear physical quantity.

Potential uses:

- Domestic earthquake information
- Japanese seismic intensity information
- Earthquake announcements
- Disaster-prevention XML

Official resources:

- https://www.jma.go.jp/
- https://xml.kishou.go.jp/

Important limitations:

- Disaster-prevention XML is a pull-based service.
- The previous push environment ended on 2020-09-01.
- Browser-side access depends on endpoint-specific CORS behavior.
- Public availability does not guarantee browser accessibility.
- Polling frequency and usage conditions must be checked.

Do not claim that an endpoint supports CORS without testing it.

Do not claim that all JMA information is real-time.

## 7. NIED Hi-net

**Status: RESTRICTED / CONDITIONAL**

Potential uses:

- High-sensitivity seismic observation
- Hypocenter and station information
- Waveform analysis

Official resource:

- https://www.hinet.bosai.go.jp/

Important limitations:

- Historical waveform downloads require a user ID and password.
- Redistribution of data and materials is restricted.
- Station and hypocenter location information may use JGD2000.
- Access conditions differ by dataset.

Do not assume that Hi-net waveforms are available through an unrestricted public browser API.

Do not redistribute downloaded waveforms without explicit permission.

## 8. NIED K-NET / KiK-net

**Status: RESTRICTED / CONDITIONAL**

Potential uses:

- Strong-motion records
- Acceleration waveforms
- Ground-motion analysis
- Station metadata

Official resource:

- https://www.kyoshin.bosai.go.jp/

Important limitations:

- Waveform download requires user registration.
- Data usage and redistribution conditions apply.
- Download availability does not imply unrestricted redistribution.
- Browser-side access and CORS must be tested separately.

Potential formats include ASCII, binary, and CSV depending on the dataset.

A future EarthScope waveform module may support user-provided files obtained under valid access conditions.

## 9. J-SHIS Seismic Hazard Map

**Status: READY (WMS image overlay; raw-data redistribution prohibited)**

J-SHIS provides probabilistic seismic hazard maps and related information.

Implemented overlay:

- WMS service: `https://www.j-shis.bosai.go.jp/map/wms/pshm/Y2020`
- Layer: `P-Y2020-MAP-AVR-TTL_MTTL-T30_I55_PS`
- Image extent: 30°N–46°N, 128°E–150°E
- CRS: EPSG:4612
- CORS: `Access-Control-Allow-Origin: *` verified
- The image is displayed as a derived overlay with attribution.
- The WMS overlay was verified on GitHub Pages on 2026-11-08.
- The J-SHIS terms permit editing, processing, and distribution of derived results with attribution, but prohibit copying and redistributing the seismic-hazard data as-is. EarthScope does not redistribute raw J-SHIS data.

Limitations:

- This is a probabilistic hazard evaluation, not current shaking or an earthquake prediction.
- The 2020 map is a model-derived product with uncertainty.
- It is not suitable for site-specific engineering decisions without consulting J-SHIS and the underlying models.
- The WMS image is a fixed geographic image overlay; it is not a real-time layer.

Official resources:

- https://www.j-shis.bosai.go.jp/
- https://www.j-shis.bosai.go.jp/wms-pshm
- https://www.j-shis.bosai.go.jp/agreement

## 10. Geological Survey of Japan

**Status: CONDITIONAL**

Potential uses:

- Geological maps
- Fault information
- Geological structures
- Background geographic layers

Official resource:

- https://www.gsj.jp/

Check dataset-specific licensing, attribution, scale, coordinate system, and update history.

## 11. Published Geophysical Models

Potential sources include published:

- Plate boundary models
- Seismic velocity models
- Crustal structure models
- Mantle structure models
- Tomography datasets

**Status: UNVERIFIED until a specific dataset is selected**

Each model must have its own metadata and usage review.

Do not combine models from different publications without recording their differences.

## 12. Browser Compatibility Verification

For each provider, test the actual deployed browser environment.

Record:

- HTTPS availability
- CORS behavior
- Authentication requirements
- Response content type
- Response encoding
- Rate limits
- Update frequency
- Usage restrictions
- Redistribution restrictions
- Failure behavior

A successful command-line download does not prove that browser-side fetching works.

## 13. Live Data Policy

EarthScope divides live information into three categories.

### Category A: Live-ish earthquake catalog

Use suitable public feeds such as USGS GeoJSON.

This is the initial live-data target.

### Category B: Domestic earthquake information

JMA integration is conditional on endpoint verification.

Use polling only when appropriate.

### Category C: Real-time strong motion and early warning

Do not promise this capability in the initial static application.

It may require specialized access, authentication, a relay service, or a separate authorized integration.

The application must never simulate real-time observations and label them as live data.

## 14. Source Registry

Each integrated source must have a registry entry containing:

- `id`
- `name`
- `provider`
- `status`
- `homepage`
- `documentationUrl`
- `dataLicense`
- `attribution`
- `accessMethod`
- `requiresAuthentication`
- `corsVerified`
- `redistributionAllowed`
- `lastVerifiedAt`
- `notes`

Unknown values must remain explicitly unknown rather than being guessed.

## 15. USGS Slab2 Depth Contours

**Status: READY (model-derived)**

The USGS Slab2 depth contours are used only for cross-section context. They are not direct observations of a plate interface.

- Source: USGS Slab2 depth service (`eq/slab2_depth`), derived from Hayes et al. (2018).
- License: Public Domain (U.S. Government Work) / CC0 1.0.
- Attribution: USGS Slab2 (Hayes et al., 2018).
- The Japan-region contours were retrieved for 120°E–155°E, 20°N–47°N.
- The static GeoJSON asset was simplified with Douglas–Peucker 0.01° and rounded to 4 decimal places for display.
- Depth values are in kilometres. The model includes the Izu-Bonin, Kuril, Manila, and Ryukyu regions.
- The cross-section tool intersects these contours with the user-selected profile. It does not interpolate or claim a unique plate interface where multiple slabs overlap.
- The same contours are available as an optional 3D globe overlay, placed at the depth display radius and colored by depth.
- The bundled contour asset and cross-section rendering were verified on the deployed GitHub Pages site on 2026-11-08.
- Do not use the contours for legal boundaries, hazard zoning, or quantitative plate reconstruction.

## 16. NIED Strong Motion Monitor

**Status: RESTRICTED — no embedding, relay, or pixel-value extraction**

NIED's strong-motion monitor terms (https://www.kyoshin.bosai.go.jp/ja/about_kmoni/) state that:

- Reproduction, transmission, and redistribution of kmoni content are prohibited.
- Extracting individual station values from the image colors and publishing or distributing them is not an intended use and is discouraged.

The reference desktop client (`ingen084/KyoshinEewViewerIngen`) fetches the official GIF image over HTTP, decodes it, reads pixel colors at observation-point coordinates, and derives intensities. That method does not grant EarthScope permission to reproduce, relay, or publish the content.

A Vercel/edge relay would be a transmission/redistribution of NIED content and would also facilitate prohibited pixel-value extraction. It is therefore not implemented, even on a free tier.

EarthScope currently:

- links to the official NIED monitor and terms,
- does not embed or proxy the image,
- does not bundle restricted images,
- does not fabricate a strong-motion monitor,
- shows a clearly labeled JMA intensity summary, which is not a strong-motion monitor.

K-NET/KiK-net waveform and strong-motion data remain registration-restricted.


## 17. PB2002 Plate Boundaries

**Status: READY**

- Dataset: PB2002 plate boundaries, converted to GeoJSON by Nordpil/csterling.
- Citation: Bird, P. (2003), An updated digital model of plate boundaries, Geochemistry Geophysics Geosystems, 4(3), 1027, doi:10.1029/2001GC000252.
- License: Open Data Commons Attribution License 1.0 (ODC-By 1.0).
- Attribution: Bird (2003) PB2002 / Hugo Ahlenius, Nordpil.
- 241 boundary features, WGS84.
- Bundled as `public/geo/PB2002_boundaries.json`.
- This is a model-derived plate-boundary dataset, not a legal or administrative boundary.
- It is displayed as an optional map overlay and is not used for distance or hazard calculations.
- The bundled overlay was verified on GitHub Pages on 2026-11-08.
