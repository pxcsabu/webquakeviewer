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

The 3D crust block is available inside the 地震分布図 panel when Slab2 is enabled. Its top surface uses GSI pale tiles in Web Mercator with attribution; the 2D map remains on GSI tiles. If the tile requests fail, Natural Earth is used as a fallback. The embedded 3D view and GSI tile top surface were verified on GitHub Pages on 2026-11-08.

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
- The `int` array contains area-level intensity summaries with two-digit prefecture codes and optional city codes. EarthScope preserves these as `intensityAreas` for the selected-event map fill. It does not claim station-level coverage.

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

EarthScope supports user-provided CSV/JSON waveform files obtained under valid access conditions. The file's provenance, station metadata, units, and redistribution rights remain the user's responsibility. MiniSEED and binary parsing are not yet implemented.

## 9. J-SHIS Seismic Hazard Map

**Status: READY (WMS raster tiles; raw-data redistribution prohibited)**

J-SHIS provides probabilistic seismic hazard maps and related information.

Implemented overlay:

- WMS service: `https://www.j-shis.bosai.go.jp/map/wms/pshm/Y2020`
- Layer: `P-Y2020-MAP-AVR-TTL_MTTL-T30_I55_PS`
- Raster tiles: WMS GetMap with `{bbox-epsg-3857}`
- CRS: EPSG:3857
- CORS: `Access-Control-Allow-Origin: *` verified
- The raster tiles are displayed as a derived overlay with attribution.
- The WMS overlay was verified on GitHub Pages on 2026-11-08.
- The J-SHIS terms permit editing, processing, and distribution of derived results with attribution, but prohibit copying and redistributing the seismic-hazard data as-is. EarthScope does not redistribute raw J-SHIS data.

Limitations:

- This is a probabilistic hazard evaluation, not current shaking or an earthquake prediction.
- The 2020 map is a model-derived product with uncertainty.
- It is not suitable for site-specific engineering decisions without consulting J-SHIS and the underlying models.
- The WMS layer is not a real-time layer.

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
- The contours are available as an optional 2D map overlay and as depth-positioned lines in the Japan-limited 3D crust block. A continuous 3D slab surface and a global 3D globe are not provided.
- The bundled contour asset and cross-section rendering were verified on the deployed GitHub Pages site on 2026-11-08.
- Do not use the contours for legal boundaries, hazard zoning, or quantitative plate reconstruction.

## 16. NIED Strong Motion Monitor

**Status: RESTRICTED / PERMISSION PENDING — no embedding, relay, or pixel-value extraction is implemented**

NIED's strong-motion monitor terms (https://www.kyoshin.bosai.go.jp/ja/about_kmoni/) state, in substance:

- NIED holds copyright in the content except where another provider owns it.
- Copying is prohibited except for private use, quotation, and other uses permitted by copyright law.
- Reprinting, modifying, transmitting, or redistributing copied content is prohibited.
- Detecting individual observation-point color changes and extracting observation values from colors are described as unintended uses.
- Publishing or distributing information processed in those ways is requested to be refrained from.

The terms do not explicitly enumerate every operation (direct retrieval, local decode, local analysis, desktop embedding). See [NIED_STRONG_MOTION_POLICY.md](NIED_STRONG_MOTION_POLICY.md) for the item-by-item classification and the permission checklist.

Technical feasibility is acknowledged:

- Web: an HTTPS GitHub Pages app cannot directly load the documented HTTP image because of Mixed Content. A relay is not adopted.
- Desktop: native HTTP retrieval, local decoding, and local analysis are technically possible, but the NIED terms still apply.

EarthScope currently:

- links to the official NIED monitor and terms,
- does not fetch, embed, decode, proxy, or process the kmoni image,
- does not bundle restricted images or derived values,
- does not fabricate a strong-motion monitor,
- shows a clearly labeled JMA intensity summary, which is not a strong-motion monitor.

A Vercel/edge relay is not implemented because it would transmit/redistribute NIED content and would not resolve the permission question.

The public implementations surveyed (`KyoshinEewViewerIngen`, `EQMonitor`, JQuake, Quarog) demonstrate that direct retrieval and local processing are technically possible. Their existence is not evidence of NIED permission; their code licenses do not grant data rights. JQuake's public notice states that per-station numerical information has been withdrawn following a terms update.

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
- It is displayed as an optional 2D map overlay and on the top surface of the Japan-limited 3D crust block. It is not used for distance or hazard calculations.
- A global 3D globe is not provided.
- The bundled overlay was verified on GitHub Pages on 2026-11-08.

## 18. User-Provided Waveform Files

**Status: USER-PROVIDED — no provider integration**

EarthScope accepts CSV and JSON waveforms selected by the user. It does not fetch, relay, or redistribute waveform data from a provider.

- Required CSV columns: `time`, `amplitude`.
- Optional metadata columns: `station`, `network`, `channel`, `location`, `units`, `samplingRateHz`.
- JSON may contain a top-level sample array or an object with `samples`, `units`, `samplingRateHz`, and `station`.
- Time is interpreted as ISO 8601 with timezone, Unix seconds, or Unix milliseconds.
- Amplitude units are preserved as supplied. No conversion or instrument-response correction is applied.
- Station metadata and source provenance are not verified by EarthScope.
- The synthetic demo is explicitly classified `SIMULATED`; it is not an observation.
- MiniSEED, binary waveform storage, and NIED waveform feeds are not implemented.
- Users are responsible for ensuring that they have the right to use and redistribute any file they load.

NIED Hi-net / K-NET / KiK-net waveform access remains subject to registration, authentication, and redistribution conditions. Do not treat those services as unrestricted public APIs.

## 19. Japan Municipality Boundaries

**Status: READY — static display geometry**

The selected-event intensity fill uses municipality polygons, not JMA observation-area polygons.

- Source: 国土数値情報 行政区域データ (N03).
- Processing: [ricewin/simplify-japan-geojson](https://github.com/ricewin/simplify-japan-geojson), simplified with Mapshaper to 8%.
- License: CC BY 4.0; attribution to 国土数値情報 and the simplification project is displayed with the map.
- The 47 prefecture files are merged into `public/geo/japan_municipalities.geojson` (about 2.6 MB).
- `properties.code` is the five-digit administrative area code (`N03_007`), `properties.name` is the municipality name, and `properties.prefecture` is the prefecture name.
- JMA city codes are seven digits. EarthScope matches the first five digits. A designated-city ward code absent from the simplified asset is aggregated to its known parent city code (for example Yokohama, Kawasaki, Sagamihara, Hamamatsu, Sakai, and Fukuoka), or to `prefix + 00` for other codes.
- The boundaries are a geographic display aid. They are not JMA intensity observation areas, legal boundaries, or survey-grade administrative boundaries.
- The fill shows the maximum intensity reported for each municipality and must not be interpreted as a continuous shaking field.
- The JMA intensity-area fill and 3D hypocenter click selection were verified on GitHub Pages on 2026-11-09.

## 20. JMA Estimated Intensity (250m Mesh)

**Status: READY — event-dependent, direct JMA delivery**

JMA publishes estimated-intensity distribution maps for earthquakes with a maximum intensity of 5弱 or greater. EarthScope loads these products only for the selected event.

- List: `https://www.jma.go.jp/bosai/estimated_intensity_map/data/list.json`
- Tile: `https://www.jma.go.jp/bosai/estimated_intensity_map/data/<event>/<mesh>.png`
- Format: PNG tiles corresponding to JMA 250m estimated-intensity meshes.
- CORS: verified with `Origin: http://tauri.localhost`; `Access-Control-Allow-Origin: *`.
- Matching: the first 12 digits of the JMA event ID (YYYYMMDDHHmm JST) are matched to the first 12 digits of the estimated-map URL.
- The list is fetched lazily only after a qualifying event is selected; it is cached in memory for the session.
- The PNG tiles are displayed directly by MapLibre. EarthScope does not bundle, resample, or redistribute the JMA tiles.
- These are **estimated** intensities based on observed intensity and site amplification, not station observations. They are not interpolated or averaged by EarthScope.
- Event mesh IDs and legacy datum handling follow the JMA map viewer's tile geometry.
- If the list or individual tiles are unavailable, the rest of the map remains usable and a warning may be shown.

## 21. NIED Hi-net ALJ2023 Velocity Structure

**Status: USER-PROVIDED — local import only; no data bundled**

Source page: https://www.hinet.bosai.go.jp/topics/sokudo_kozo/alljpn_download.php?LANG=ja

The package is `ALJ2023.zip` (approximately 13 MB compressed). It contains `VEL.dat` (about 138 MB), `LON.lst`, `LAT.lst`, `DEP.lst`, and the provider's interpolation tools/documentation.

- Grid: 301 longitudes x 281 latitudes x 32 depths.
- Longitude range: 120°E–150°E; latitude range: 20°N–48°N; depth range in the supplied package: -5 to 400 km (32 layers).
- `VEL.dat` columns: longitude, latitude, depth, Vp, Vs, P reliability, S reliability.
- Units: Vp/Vs in km/s; reliability values are preserved as supplied.
- The provider does not state a CRS in the package. EarthScope stores the grid as `UNKNOWN` and applies no datum transformation.
- Citation required: Matsubara et al. (2022), Earth, Planets and Space 74:171, https://doi.org/10.1186/s40623-022-01724-0.
- The provider states: do not redistribute the data; do not distribute processed versions of the data.
- EarthScope therefore does not bundle, relay, or redistribute `ALJ2023.zip` or derived model outputs. The user selects the ZIP locally, and the file is read by a Web Worker in the browser/WebView. No model data is sent to an EarthScope server.
- The displayed depth slices and cross-sections use nearest-grid sampling. They are display products, not a new inversion, and are classified `MODEL`.
- The full 3D volume is not rendered; only the selected depth slice and profile are shown.
