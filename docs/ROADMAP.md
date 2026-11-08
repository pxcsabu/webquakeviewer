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

## Phase 0 — Foundation

**Goal: Establish a reliable application foundation.**

- [ ] Initialize TypeScript, React, and Vite
- [ ] Configure GitHub Pages deployment
- [ ] Establish application layout
- [ ] Establish data provider interface
- [ ] Establish normalized earthquake model
- [ ] Establish error and loading states
- [ ] Establish scientific data classification
- [ ] Establish unit testing
- [ ] Establish IndexedDB infrastructure

Completion criteria:

The application builds, deploys, and can display validated sample data without depending on a backend.

## Phase 1 — Core Earthquake Catalog

**Goal: Create a genuinely usable earthquake monitoring application.**

- [ ] Integrate USGS GeoJSON feeds
- [ ] Display earthquake events on MapLibre
- [ ] Display magnitude and depth
- [ ] Implement event list
- [ ] Implement event detail panel
- [ ] Implement time filtering
- [ ] Implement magnitude filtering
- [ ] Implement depth filtering
- [ ] Implement periodic catalog updates
- [ ] Implement data source status
- [ ] Implement IndexedDB caching
- [ ] Handle duplicate and updated events

Completion criteria:

A user can browse, search, and inspect real earthquake events using permitted public data.

## Phase 2 — Basic Scientific Analysis

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

Calculations have documented methods and automated tests.

## Phase 3 — Japan-Focused Data

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

## Phase 4 — 3D Earth Visualization

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

## Phase 5 — Waveform Analysis

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

## Phase 6 — Advanced Geophysical Visualization

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

## Phase 7 — Advanced Analysis

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

1. Reliable core earthquake catalog
2. Correct scientific analysis
3. Japan-specific data integration
4. 3D Earth visualization
5. Waveform analysis
6. Advanced geophysical models

The long-term vision remains comprehensive geophysical analysis. The staged roadmap exists to make that vision achievable rather than to reduce its scope.