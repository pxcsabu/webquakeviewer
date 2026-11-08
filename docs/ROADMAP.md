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
- [ ] Verify GitHub Pages deployment on the live URL
- [x] Establish application layout
- [x] Establish data provider interface
- [x] Establish normalized earthquake model
- [x] Establish error and loading states
- [x] Establish scientific data classification
- [x] Establish unit testing
- [x] Establish IndexedDB infrastructure

Completion criteria:

The application builds, deploys, and can display validated data without depending on a backend. Live GitHub Pages verification remains pending until a remote repository is configured.

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

Completion criteria:

A user can browse, filter, and inspect real earthquake events from a permitted public source, with local caching, source status, and no backend dependency. Geographic rendering is explicitly out of scope for this phase.

## Phase 2 — Geographic Visualization and Monitoring

**Goal: Add geographic visualization without destabilizing the data foundation.**

- [ ] Select and verify a no-API-key basemap source
- [ ] Document basemap license, attribution, CORS, and tile usage policy
- [ ] Introduce MapLibre GL JS with lazy initialization
- [ ] Display earthquake hypocenters on the map
- [ ] Display magnitude and depth with documented visual scales
- [ ] Synchronize event-list selection with map selection
- [ ] Implement map layer visibility controls
- [ ] Handle WebGL lifecycle, including `map.remove()`
- [ ] Test resize, WebGL context loss, and restoration
- [ ] Test coexistence with the future 3D module

Basemap candidates must be evaluated against the static-first and no-embedded-API-key requirements. A static vector basemap or an explicitly permitted tile service may be used. Provider terms must be documented before implementation.

Completion criteria:

The map displays the catalog without degrading data correctness, does not require an embedded API key, is usable on GitHub Pages, and releases WebGL resources when unmounted.

## Phase 3 — Basic Scientific Analysis

**Goal: Add scientifically meaningful analysis tools.**

- [ ] Implement surface distance calculation
- [ ] Implement hypocentral distance calculation
- [ ] Implement depth distribution charts
- [ ] Implement magnitude-frequency distribution
- [ ] Implement b-value calculation
- [ ] Implement temporal event statistics
- [ ] Implement spatial clustering
- [ ] Implement cross-section selection
- [ ] Display sample count and analysis parameters

Completion criteria:

Calculations have documented methods, assumptions, units, and automated tests.

## Phase 4 — Japan-Focused Data

**Goal: Integrate domestic earthquake information.**

- [ ] Verify JMA endpoint browser accessibility
- [ ] Verify JMA CORS behavior
- [ ] Verify usage conditions
- [ ] Implement permitted JMA earthquake information
- [ ] Implement Japanese seismic intensity display
- [ ] Implement intensity ordinal ranking
- [ ] Verify historical coordinate reference systems
- [ ] Integrate permitted geological and hazard datasets

This phase is conditional on endpoint availability and data usage conditions.

Do not block the core application if a source is unavailable.

## Phase 5 — 3D Earth Visualization

**Goal: Introduce interactive 3D geophysical visualization.**

- [ ] Initialize Three.js globe
- [ ] Define deterministic camera orientation
- [ ] Center the initial view on Japan
- [ ] Display earthquake hypocenters in 3D
- [ ] Implement depth visualization
- [ ] Implement cross-section visualization
- [ ] Add configurable geological overlays
- [ ] Implement WebGL lifecycle management
- [ ] Test coexistence with MapLibre

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
5. 3D Earth visualization
6. Waveform analysis
7. Advanced geophysical models

The long-term vision remains comprehensive geophysical analysis. The staged roadmap exists to make that vision achievable rather than to reduce its scope.
