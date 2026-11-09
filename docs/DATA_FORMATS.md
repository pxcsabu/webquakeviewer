# EarthScope Data Formats

## 1. Purpose

This document defines data format conventions used internally and when importing external datasets.

The application must preserve original source information and avoid ambiguous unit or coordinate conversions.

## 2. General Rules

Every dataset should document:

- Format
- Version
- Provider
- Units
- Coordinate reference system
- Timestamp convention
- Missing-value representation
- Precision
- Array ordering where applicable

Do not infer units or coordinate systems from numeric values alone.

## 3. Earthquake Catalog

Preferred internal representation:

- JSON objects
- GeoJSON for geographic feature collections

Earthquake coordinates must follow GeoJSON conventions:

```text
[longitude, latitude, altitude]
```

Do not reverse latitude and longitude.

Depth conventions must be documented separately.

If altitude is used to represent depth, document the sign convention. Prefer keeping `depthKm` as an explicit property rather than relying on GeoJSON altitude semantics.

Preserve source event IDs.

### 3.1 USGS GeoJSON feed

The USGS summary feed uses a GeoJSON `FeatureCollection`.

- `geometry.coordinates` order is `[longitude, latitude, depth]`.
- Depth is expressed in kilometres and is positive downwards. Negative depths can occur for shallow or anomalous events; preserve them and report a warning rather than silently clamping to zero.
- `geometry.coordinates[2]` may be `null`. Treat it as unavailable, not as 0 km.
- `properties.time` and `properties.updated` are Unix epoch milliseconds. Convert them to UTC ISO 8601 internally and preserve `updated` as source metadata.
- `feature.id` is the original source event ID. The normalized internal ID uses a provider prefix to avoid collisions.
- `properties.mag` may be `null`. Do not fabricate a magnitude.
- `properties.type` may identify non-earthquake events such as quarry blasts. Preserve it as `eventType`.
- `properties.place` is provider text. Preserve it without treating it as a structured location.

### 3.2 JMA earthquake information list

The JMA `bosai/quake/data/list.json` source is a JSON array of reports.

- `eid` is the source event identifier. Multiple report types can share one `eid`.
- `at` is the origin time with a `+09:00` offset. It is preserved as original time and normalized to UTC internally.
- `rdt` is the report time. The latest report time is used as source update metadata.
- `anm` is the Japanese place/area text.
- `cod` is a coordinate string such as `+32.6+130.6-10000/` or `+3456.1+13739.5-41000/`. Latitude/longitude may be decimal degrees or DDMM.M / DDDMM.M. Depth is in metres and may be omitted.
- `mag` is a string and may be empty. Do not fabricate a magnitude when it is unavailable.
- `maxi` is the maximum seismic intensity display value. Store display and ordinal rank separately.
- Reports are deduplicated by `eid`. The latest complete report supplies the hypocenter/magnitude, while the latest available maximum intensity is retained.
- `int` is an array of area-level intensity summaries. Each entry has a two-digit prefecture `code`, a `maxi`, and optional `city` entries with city codes and `maxi`. EarthScope stores these as `intensityAreas` while preserving the original display values.
- `int` city codes are matched to municipality-level geometry; they are not station coordinates and must not be rendered as point observations.
- The JMA estimated-intensity list and 250m PNG tiles are a separate, event-dependent product.
- The source does not state its CRS. EarthScope stores `crs: UNKNOWN` and applies no datum transformation.

### 3.3 Slab2 depth contours

The bundled Slab2 asset is a GeoJSON `FeatureCollection` of `LineString` contours.

- `properties.depth` is the contour depth in kilometres.
- `properties.region` is the Slab2 region name.
- The source is USGS Slab2, a model-derived subduction geometry, not direct observation.
- Coordinates are WGS84 decimal degrees, simplified with Douglas–Peucker 0.01° for display.
- The file includes a `metadata` foreign member with source, citation, license, retrieval time, and simplification notes.
- Cross-section intersections are computed locally; the contours are not a replacement for a full 3D velocity or slab model.
- The same contours are drawn at their model depth in the Japan-limited 3D crust block.

## 4. Time

Use ISO 8601 timestamps.

Internally, use UTC where possible.

Preserve the original timestamp and timezone when supplied.

Example:

```text
2026-11-08T03:15:00Z
```

Do not confuse origin time, publication time, retrieval time, and update time.

## 5. Geographic Coordinates

Store:

- Latitude
- Longitude
- CRS identifier
- Original coordinates
- Transformation metadata where applicable

Supported CRS identifiers:

```text
WGS84
JGD2000
JGD2011
TOKYO_DATUM
UNKNOWN
```

Do not silently transform coordinates.

## 6. Seismic Intensity

Use separate fields for display and ordering.

Example:

```json
{
  "display": "5-",
  "rank": 5
}
```

The rank is an ordinal index, not a linear measurement.

## 7. Waveform Data

### 7.1 User-provided CSV waveform

Current implementation:

```text
time,amplitude,station,channel,units,samplingRateHz
2026-01-01T00:00:00Z,1.0,TEST,BHZ,counts,10
2026-01-01T00:00:00.1Z,-1.1,TEST,BHZ,counts,10
```

- `time` and `amplitude` are required.
- `station`, `network`, `channel`, `location`, `units`, and `samplingRateHz` are optional.
- Lines whose first field begins with `#` are comments.
- Time accepts ISO 8601 with a timezone, Unix seconds, or Unix milliseconds.
- Numeric amplitudes are preserved without unit conversion.
- The original time text is retained per sample when supplied.
- Invalid rows are excluded and reported. The parser does not interpolate gaps.
- Duplicate timestamps keep the first value and emit a warning.
- If `samplingRateHz` is absent, the median positive interval is used.
- A single file is treated as a single trace.

### 7.2 User-provided JSON waveform

```json
{
  "station": { "network": "XX", "station": "ABC", "channel": "HHZ" },
  "units": "m/s",
  "samplingRateHz": 100,
  "samples": [
    { "time": "2026-01-01T00:00:00Z", "amplitude": 0.001 },
    { "time": "2026-01-01T00:00:00.01Z", "amplitude": 0.002 }
  ]
}
```

A top-level array of `{ "time", "amplitude" }` objects is also accepted. Metadata is optional. The same validation, timezone warning, and unit-preservation rules as CSV apply.

### 7.3 MiniSEED and binary waveforms

MiniSEED and binary waveform support are **not implemented**. Do not treat a user-provided file with a `.mseed` extension as parsed data. Future binary support must follow the relevant format specification and document:

- record version and byte order
- sample encoding
- start time and sampling rate
- station/channel/location metadata
- units and calibration
- missing-value handling

### 7.4 General waveform storage

Waveform data can be large and should not be stored as enormous JSON arrays.

Preferred options:

- MiniSEED for compatible seismic waveform datasets
- Float32 binary for application-controlled waveform storage
- Float64 binary only when higher precision is genuinely required

A waveform binary format must define:

- Magic identifier
- Format version
- Endianness
- Data type
- Sampling frequency
- Start timestamp
- Sample count
- Unit
- Station ID
- Channel ID
- Missing-value representation
- Optional calibration or instrument metadata

Do not assume all waveform providers use the same sample type or byte order.

MiniSEED parsing must follow the relevant format specification and support the actual record versions encountered.

## 8. Tomography and 3D Velocity Models

For large regular grids, use compact binary arrays.

A recommended representation is:

- Float32 values
- JSON metadata
- Explicit array ordering
- Explicit axis definitions

Metadata should include:

```json
{
  "format": "earthscope-grid",
  "version": 1,
  "dataType": "float32",
  "endianness": "little",
  "dimensions": [100, 100, 50],
  "axisOrder": ["longitude", "latitude", "depth"],
  "units": "km/s",
  "missingValue": null,
  "coordinateReferenceSystem": "WGS84"
}
```

The example above is illustrative. Actual dimensions, axes, units, and values must come from the source dataset.

Never assume that all tomography models use the same axis order or depth convention.

For geographic raster data, GeoTIFF may be appropriate when its coordinate metadata and licensing are suitable.

## 9. Focal Mechanisms

Store source values and conventions explicitly.

Potential fields:

- Strike
- Dip
- Rake
- Moment tensor
- Magnitude type
- Source
- Uncertainty
- Coordinate reference system

Do not assume that all sources use identical conventions.

## 10. Geological and Geographic Layers

Use formats appropriate to the source:

- GeoJSON for small vector datasets
- GeoPackage for suitable downloadable vector datasets
- GeoTIFF for raster datasets
- Binary grids for large regular scientific arrays

Preserve source metadata and licensing information.

## 11. Compression

Large datasets should use suitable compression where practical.

Possible approaches:

- HTTP compression for text formats
- gzip-compressed binary files
- Provider-native compressed formats
- Chunked loading for large grids

Compression must not compromise data integrity.

## 12. Validation

Every parser must validate:

- File signature or expected format
- Version
- Data length
- Dimensions
- Numeric values
- Units
- Endianness
- Coordinate system
- Missing-value representation

Reject malformed data rather than silently interpreting it.

## 13. Versioning

Internal binary formats must include a version identifier.

Do not change the interpretation of an existing format version without incrementing its version.

Maintain compatibility or provide explicit migration logic where necessary.

## 14. Geological and Hazard Overlay Formats

### 14.1 PB2002 plate boundaries

- Format: GeoJSON `FeatureCollection`
- CRS: WGS84
- Geometry: `LineString` / `MultiLineString`
- Properties include plate-boundary metadata from the source dataset
- The bundled file has a `metadata` foreign member with source, citation, license, retrieval time, and CRS
- Model-derived boundaries, not legal boundaries

### 14.2 J-SHIS WMS raster tiles

- Format: PNG raster tiles returned by WMS `GetMap`
- Source CRS: EPSG:3857
- Tile template uses `{bbox-epsg-3857}`
- Displayed as a raster overlay with attribution
- Not a raw-data redistribution and not a real-time observation

### 14.3 Japan municipality boundaries

- Format: GeoJSON `FeatureCollection` of `Polygon` / `MultiPolygon`
- File: `public/geo/japan_municipalities.geojson`
- Source: 国土数値情報 行政区域データ N03 via `simplify-japan-geojson` (CC BY 4.0)
- CRS: WGS84 longitude/latitude
- Properties: `code` (five-digit administrative area code), `name`, `prefecture`
- Simplified with Mapshaper to 8% for the static asset
- Used only for the selected-event municipality-level intensity fill
- The polygons are not JMA observation areas and are not survey-grade administrative boundaries

### 14.4 JMA estimated-intensity (250m) tiles

- List: `https://www.jma.go.jp/bosai/estimated_intensity_map/data/list.json`
- Tile: `https://www.jma.go.jp/bosai/estimated_intensity_map/data/<event>/<mesh>.png`
- Event key: first 12 digits of the JMA event ID (`YYYYMMDDHHmm` JST)
- Mesh key: four digits encoding a 1-degree longitude by 40-minute latitude tile
- PNG content: 250m estimated-intensity cells, displayed directly as a MapLibre image source
- Datum handling: the legacy linear mesh correction used by the JMA viewer is applied when the entry does not declare datum 2
- These tiles are estimates, not observations, and are not bundled by EarthScope

## 15. ALJ2023 Velocity Model

### 15.1 Archive

- File: `ALJ2023.zip` (official NIED Hi-net package)
- Compression: ZIP with DEFLATE entries
- `VEL.dat` is about 138 MB uncompressed
- Required metadata entries: `LON.lst`, `LAT.lst`, `DEP.lst`
- EarthScope reads the archive locally and does not redistribute it

### 15.2 VEL.dat

Whitespace-separated rows:

```text
longitude latitude depth vp vs p_reliability s_reliability
```

- Longitude: decimal degrees east
- Latitude: decimal degrees north
- Depth: km
- Vp: km/s
- Vs: km/s
- Reliability: values as supplied by the provider
- Row order: longitude varies fastest, then latitude, then depth
- Grid: 301 x 281 x 32
- CRS: not stated by the provider; EarthScope uses `UNKNOWN`

The import validates the axis files and row count before creating the model. The UI samples nearest grid cells for depth slices and profiles; it does not interpolate between cells or redistribute the model.
