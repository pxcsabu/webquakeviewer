# EarthScope Roadmap

## Development Philosophy

EarthScope has a broad long-term scope.

However, development must proceed in stages based on:

- Data availability
- Access permissions
- Scientific validity
- Implementation complexity
- Performance
- Testing requirements

A feature must not be considered complete merely because a visualization can be drawn.

The data foundation and the rendering foundation are deliberately separated. Geographic rendering introduces tile delivery, CORS, API-key restrictions, WebGL context management, and layout issues that must be validated without obscuring catalog correctness.

## Phase 0 — Foundation

**Goal: Establish a reliable application foundation.**

- [x] Initialize TypeScript, React, and Vite
- [x] Configure GitHub Pages build and Actions deployment workflow
- [x] Verify GitHub Pages deployment on the live URL
- [x] Establish application layout
- [x] Establish data provider interface
- [x] Establish normalized earthquake model
- [x] Establish error and loading states
- [x] Establish scientific data classification
- [x] Establish unit testing
- [x] Establish IndexedDB infrastructure

Completion criteria:

The application builds, deploys, and displays validated data without depending on a backend. Live GitHub Pages deployment and browser verification have been completed.

## Phase 1 — Earthquake Data Foundation

**Goal: Create a usable, provenance-preserving earthquake data foundation.**

- [x] Integrate USGS GeoJSON feeds
- [x] Normalize USGS records while preserving source IDs, timestamps, coordinates, and units
- [x] Display magnitude and depth
- [x] Implement event list
- [x] Implement event detail panel
- [x] Implement time filtering
- [x] Implement magnitude filtering
- [x] Implement depth filtering
- [x] Implement periodic catalog updates
- [x] Implement data source status
- [x] Implement IndexedDB caching
- [x] Handle duplicate and updated events
- [x] Implement conditional HTTP requests using Last-Modified / 304
- [x] Display acquisition warnings, including negative or missing depth
- [x] Preserve event type and provider place text
- [x] Restrict catalog display and cache to the documented Japan region

Completion criteria:

A user can browse, filter, and inspect real earthquake events from a permitted public source within the documented Japan region, with local caching, source status, and no backend dependency. Geographic rendering is explicitly out of scope for this phase.

## Phase 2 — Geographic Visualization and Monitoring

**Goal: Add geographic visualization without destabilizing the data foundation.**

- [x] Select and verify a no-API-key basemap source
- [x] Document basemap license, attribution, CORS, and tile usage policy
- [x] Introduce MapLibre GL JS with lazy initialization
- [x] Display earthquake hypocenters on the map
- [x] Display magnitude and depth with documented visual scales
- [x] Synchronize event-list selection with map selection
- [x] Add navigation and scale controls
- [x] Add a GSI standard/pale basemap selector with attribution
- [x] Retain Natural Earth as an offline basemap fallback
- [x] Add 地震分布図 / 強震モニタ tabs
- [x] Add a strong-motion tab with official-link fallback; embedding/relay/extraction is prohibited by NIED terms
- [x] Handle WebGL lifecycle, including `map.remove()`
- [x] Test map resize and responsive layout
- [ ] Implement map layer visibility controls
- [ ] Test WebGL context loss and restoration
- [ ] Test coexistence with the future 3D module
- [x] Verify map rendering on GitHub Pages

Basemap candidates must be evaluated against the static-first and no-embedded-API-key requirements. A static vector basemap or an explicitly permitted tile service may be used. Provider terms must be documented before implementation.

Completion criteria:

The map displays the catalog without degrading data correctness, does not require an embedded API key, is usable on GitHub Pages, and releases WebGL resources when unmounted.

## Phase 3 — Basic Scientific Analysis

**Goal: Add scientifically meaningful analysis tools.**

**Status: COMPLETE — implemented, tested, and verified on GitHub Pages (2026-11-08).**

- [x] Implement surface distance calculation
- [x] Implement hypocentral distance calculation
- [x] Implement depth distribution charts
- [x] Implement magnitude-frequency distribution
- [x] Implement b-value calculation with an explicit Mc input (Aki–Utsu module, tests, and UI)
- [x] Implement temporal event statistics (UTC daily histogram, inter-event intervals)
- [x] Implement spatial clustering (DBSCAN, haversine surface distance)
- [x] Implement cross-section selection with Slab2 depth contours
- [x] Display sample count and analysis parameters
- [x] Add a cross-section chart with depth, distance, and slab interface context
- [x] Verify cross-section and strong-motion tabs on GitHub Pages
- [x] Verify temporal/spatial analysis on GitHub Pages

Completion criteria:

Calculations have documented methods, assumptions, units, and automated tests.

## Phase 4 — Japan-Focused Data

**Goal: Integrate domestic earthquake information.**

**Status: COMPLETE — implemented, tested, and verified on GitHub Pages (2026-11-08).**

- [x] Verify JMA endpoint browser accessibility
- [x] Verify JMA CORS behavior
- [x] Verify usage conditions
- [x] Implement permitted JMA earthquake information
- [x] Implement Japanese seismic intensity display
- [x] Implement intensity ordinal ranking
- [x] Implement JMA / USGS catalog source selector
- [x] Verify JMA integration on GitHub Pages
- [x] Verify historical coordinate reference systems (current JMA list has no CRS; stored UNKNOWN; no historical dataset integrated)
- [x] Integrate permitted geological and hazard datasets (PB2002 boundaries and J-SHIS WMS hazard overlay)
- [x] Verify Phase 4 overlays on GitHub Pages

This phase is conditional on endpoint availability and data usage conditions.

Do not block the core application if a source is unavailable.

Historical CRS note: the current JMA list JSON does not state a CRS, so EarthScope stores `UNKNOWN` and applies no datum transformation. Historical JMA datasets are not integrated. Any future historical dataset must carry dataset-specific CRS metadata (including the Tokyo Datum cutoff documented in `docs/SCIENCE.md`).

## Phase 5 — 3D Earth Visualization (DEFERRED — removed from current scope)

**Goal: Introduce interactive 3D geophysical visualization.**

**Status: DEFERRED — the 3D globe implementation was removed by project decision.** PB2002 plate boundaries and Slab2 depth contours are now integrated into the 2D earthquake map and cross-section tool.

- [ ] Initialize Three.js globe
- [ ] Define deterministic camera orientation
- [ ] Center the initial view on Japan
- [ ] Display earthquake hypocenters in 3D
- [ ] Implement depth visualization (display scale and depth colors)
- [ ] Implement cross-section visualization in 3D
- [ ] Add configurable geological overlays in 3D
- [ ] Add 3D Slab2 interface depth contours
- [ ] Implement 3D WebGL lifecycle management
- [ ] Test 3D coexistence with MapLibre
- [ ] Verify 3D globe on GitHub Pages

Completion criteria:

The 3D view works without degrading the core map and event catalog.

## Phase 6 — Waveform Analysis

**Goal: Support waveform visualization and basic processing.**

This phase depends on legally usable waveform data.

- [ ] Define waveform data model
- [ ] Support user-provided waveform files
- [ ] Implement MiniSEED parsing where appropriate
- [ ] Implement binary waveform support
- [ ] Display waveform time series
- [ ] Implement filtering
- [ ] Implement amplitude measurements
- [ ] Display sampling frequency and units
- [ ] Add station metadata

NIED waveform integration must follow the applicable access and redistribution conditions.

Do not assume unrestricted access to Hi-net, K-NET, or KiK-net waveforms.

## Phase 7 — Advanced Geophysical Visualization

**Goal: Expand into Earth interior and seismic source analysis.**

- [ ] Focal mechanism visualization
- [ ] Moment tensor display
- [ ] Published seismic velocity model support
- [ ] Tomography visualization
- [ ] 3D velocity model rendering
- [ ] Earth interior visualization
- [ ] Additional cross-section tools
- [ ] Model comparison tools

This phase requires carefully selected scientific datasets with documented provenance and licensing.

## Phase 8 — Advanced Analysis

Potential future work:

- [ ] Gutenberg-Richter regression tools
- [ ] Spatial b-value maps
- [ ] Temporal b-value analysis
- [ ] Seismicity migration analysis
- [ ] Aftershock sequence analysis
- [ ] Ground-motion comparison
- [ ] Custom analysis regions
- [ ] Exportable analysis reports

## Explicitly Deferred Features

The following must not be promised as initial capabilities:

- Unrestricted real-time Hi-net waveform streaming
- Unrestricted K-NET/KiK-net waveform streaming
- Guaranteed real-time JMA early warning
- Server-side processing
- Large-scale tomography processing without selected datasets

These may be reconsidered when suitable access and infrastructure are available.

## Release Priorities

1. Reliable core earthquake catalog and data foundation
2. Geographic visualization and monitoring
3. Correct scientific analysis
4. Japan-specific data integration
5. 3D Earth visualization (deferred)
6. Waveform analysis
7. Advanced geophysical models

The long-term vision remains comprehensive geophysical analysis. The staged roadmap exists to make that vision achievable rather than to reduce its scope.
