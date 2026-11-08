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

## 4. Japan Meteorological Agency

**Status: CONDITIONAL**

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

Before integration:

1. Identify the exact endpoint.
2. Test HTTPS access.
3. Test CORS from the deployed browser environment.
4. Inspect response format and encoding.
5. Check update behavior.
6. Check usage and redistribution conditions.

Do not claim that an endpoint supports CORS without testing it.

Do not claim that all JMA information is real-time.

## 5. NIED Hi-net

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

## 6. NIED K-NET / KiK-net

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

## 7. J-SHIS

**Status: CONDITIONAL**

Potential uses:

- Probabilistic seismic hazard maps
- Ground-motion hazard information
- Site amplification
- Geological and subsurface information

Official resource:

- https://www.j-shis.bosai.go.jp/

Before integration, verify:

- Dataset-specific license
- Download method
- Coordinate reference system
- Resolution
- Units
- Redistribution permission
- Browser accessibility

## 8. Geological Survey of Japan

**Status: CONDITIONAL**

Potential uses:

- Geological maps
- Fault information
- Geological structures
- Background geographic layers

Official resource:

- https://www.gsj.jp/

Check dataset-specific licensing, attribution, scale, coordinate system, and update history.

## 9. Published Geophysical Models

Potential sources include published:

- Plate boundary models
- Seismic velocity models
- Crustal structure models
- Mantle structure models
- Tomography datasets

**Status: UNVERIFIED until a specific dataset is selected**

Each model must have its own metadata and usage review.

Do not combine models from different publications without recording their differences.

## 10. Browser Compatibility Verification

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

## 11. Live Data Policy

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

## 12. Source Registry

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