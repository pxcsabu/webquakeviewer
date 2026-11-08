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
- The source does not state its CRS. EarthScope stores `crs: UNKNOWN` and applies no datum transformation.

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