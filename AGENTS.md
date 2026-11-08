# AGENTS.md — Instructions for Coding Agents

## 1. Project Overview

You are developing EarthScope, a static-first earthquake monitoring and geophysical visualization application.

The project prioritizes scientific correctness, maintainability, data provenance, and performance.

Do not reduce the project to a generic dashboard.

Read the following documents before making significant architectural or scientific changes:

- `DESIGN.md`
- `README.md`
- `docs/SCIENCE.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_SOURCES.md`
- `docs/DATA_FORMATS.md`
- `docs/ROADMAP.md`

## 2. Fundamental Rules

### 2.1 Do not fabricate data

Never invent:

- Earthquake events
- Hypocenter coordinates
- Seismic intensity observations
- Waveforms
- Geological structures
- Velocity models
- Focal mechanisms
- Data source update timestamps

Mock data is permitted only for clearly labeled development and demonstration purposes.

### 2.2 Preserve data provenance

Every imported dataset must preserve its source information.

At minimum, retain:

- Provider
- Source dataset
- Original event or record ID
- Original timestamp
- Original units
- Original coordinate reference system
- Retrieval timestamp
- Data revision or version when available

Do not silently overwrite source information during normalization.

### 2.3 Respect provider restrictions

Before implementing a data source, inspect its official documentation and usage conditions.

Do not:

- Bypass authentication
- Circumvent CORS restrictions
- Proxy restricted data through an unauthorized service
- Redistribute data against provider terms
- Treat a downloadable dataset as automatically redistributable

If browser access is unavailable or uncertain, document the limitation and implement an appropriate alternative.

### 2.4 Static-first requirement

The initial application must work on GitHub Pages.

Do not introduce a backend dependency without explicit architectural justification.

Do not expose API keys, credentials, or private tokens in frontend code.

## 3. Technology Rules

Preferred stack:

- TypeScript
- React
- Vite
- MapLibre GL JS
- Three.js
- Apache ECharts
- IndexedDB
- Web Workers

Use strict TypeScript where practical.

Avoid `any` unless there is a documented reason.

Keep scientific calculations separate from UI components.

## 4. Data Access Rules

Every provider adapter must implement:

- Fetching
- Parsing
- Validation
- Normalization
- Error handling
- Source metadata preservation

Provider-specific behavior must remain isolated from the rest of the application.

A provider failure must not crash the entire application.

Use appropriate request intervals and caching.

Do not poll a provider aggressively.

Do not assume that an API is suitable for real-time use without checking its update characteristics.

## 5. Scientific Calculation Rules

All scientific calculations must be implemented in testable modules.

Important requirements:

- Use Float64 for precision-sensitive geographic calculations.
- Use stable formulas for small distances.
- Distinguish surface distance from 3D hypocentral distance.
- Validate all inputs.
- Handle missing and invalid values.
- Document assumptions and units.
- Do not interpret ordinal categories as linear physical quantities.

For hypocentral distance, prefer ECEF-based Euclidean distance or another numerically stable method.

For surface distance, use Haversine or an ellipsoidal geodesic implementation.

For b-value calculations, document the completeness magnitude convention and magnitude bin correction.

## 6. Coordinate Reference Systems

Never assume all historical earthquake coordinates are WGS84.

Support explicit CRS metadata:

- `WGS84`
- `JGD2000`
- `JGD2011`
- `TOKYO_DATUM`
- `UNKNOWN`

Preserve original coordinates.

Perform transformations only using a documented and appropriate transformation method.

Do not silently label unknown coordinates as WGS84.

## 7. Visualization Rules

### MapLibre

- Use appropriate geographic projections.
- Preserve coordinate order conventions.
- Avoid unnecessary source and layer duplication.
- Handle map resize and lifecycle events.

### Three.js

- Define the initial camera position and target.
- Dispose geometries, materials, textures, and renderers when appropriate.
- Handle WebGL context loss and restoration.
- Avoid loading large datasets during initial application startup.

### WebGL coexistence

MapLibre and Three.js may coexist, but GPU and WebGL context resources must be managed carefully.

Do not assume a fixed maximum number of WebGL contexts.

Measure actual behavior on target browsers and devices.

## 8. Performance Rules

- Move expensive computations to Web Workers.
- Use lazy loading for advanced modules.
- Cache suitable public data in IndexedDB.
- Avoid redundant parsing.
- Avoid repeated rendering of unchanged data.
- Dispose unused GPU resources.
- Provide reduced-quality modes for weaker devices.

## 9. Testing Requirements

Add tests for:

- Coordinate transformations
- Distance calculations
- Magnitude filtering
- Depth filtering
- Timestamp conversion
- Intensity ordering
- b-value calculation
- Data parsing
- Missing and malformed records

Scientific calculation tests must include edge cases.

Do not consider a calculation complete solely because it produces a plausible-looking result.

## 10. UI Rules

Avoid unnecessary decorative effects.

Do not add:

- Excessive gradients
- Excessive glow
- Unnecessary animations
- Decorative cards without functional purpose
- Unnecessary explanatory filler

Prioritize readable scientific information.

## 11. Change Management

Before adding a major feature:

1. Check the roadmap.
2. Check data availability and licensing.
3. Check architectural compatibility.
4. Identify computational and rendering costs.
5. Define validation and testing requirements.

If implementation requires a change to the scientific specification, update `docs/SCIENCE.md` as well.

If implementation requires a new data provider, update `docs/DATA_SOURCES.md`.

If implementation introduces a new data format, update `docs/DATA_FORMATS.md`.

Keep documentation synchronized with actual implementation.

## 12. Definition of Done

A feature is complete only when:

- It works in the intended deployment environment.
- It handles unavailable data.
- It preserves source attribution.
- Its units and coordinate systems are correct.
- Its scientific assumptions are documented.
- Important calculations have tests.
- It does not introduce unnecessary performance regressions.
- Relevant documentation is updated.