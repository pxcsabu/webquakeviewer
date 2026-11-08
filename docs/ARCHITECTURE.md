# EarthScope Architecture

## 1. Overview

EarthScope uses a static-first frontend architecture.

The initial deployment target is GitHub Pages.

The application must not depend on a custom backend for its core functionality.

External data providers are accessed through isolated provider adapters when browser access and usage conditions permit.

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Language | TypeScript |
| UI | React |
| Build | Vite |
| Geographic rendering | MapLibre GL JS |
| 3D rendering | Three.js |
| Charts | Apache ECharts |
| Local storage | IndexedDB |
| Background processing | Web Workers |
| Hosting | GitHub Pages |

## 3. High-Level Architecture

```text
External Data Providers
        |
        v
Provider Adapters
        |
        v
Parsing and Validation
        |
        v
Normalized Data Model
        |
        +-------------------+
        |                   |
        v                   v
IndexedDB Cache       Analysis Modules
        |                   |
        +---------+---------+
                  |
                  v
             Application State
                  |
        +---------+---------+
        |         |         |
        v         v         v
       Map      Charts     3D View
```

## 4. Suggested Directory Structure

```text
src/
  app/
    App.tsx
    routes/
    state/

  components/
    layout/
    controls/
    panels/
    status/

  features/
    earthquakes/
    intensity/
    statistics/
    cross-section/
    waveforms/
    earth-3d/

  data/
    providers/
      usgs/
      jma/
      nied/
    parsers/
    normalization/
    validation/
    registry/

  domain/
    earthquake/
    station/
    waveform/
    geometry/
    geophysics/

  analysis/
    distance/
    magnitude/
    b-value/
    spatial/
    temporal/

  visualization/
    map/
    charts/
    three/

  workers/
    analysis.worker.ts
    parsing.worker.ts

  storage/
    indexeddb/

  utils/
    time/
    units/
    coordinates/

  types/

docs/
```

This is a recommended structure. Do not create empty folders or unnecessary abstractions before they are needed.

## 5. Provider Adapter Layer

Each provider must be isolated.

A provider adapter is responsible for:

1. Request construction
2. Network access
3. Response parsing
4. Validation
5. Normalization
6. Source metadata preservation
7. Error reporting

Example conceptual interface:

```ts
interface DataProvider<TQuery, TRecord> {
  id: string;

  fetch(query: TQuery): Promise<ProviderResult<TRecord[]>>;
}
```

Provider-specific response structures must not leak into UI components.

## 6. Normalized Earthquake Model

A normalized earthquake record should preserve both normalized and original source information.

Example:

```ts
interface Earthquake {
  id: string;

  source: {
    provider: string;
    dataset: string;
    originalId: string;
    retrievedAt: string;
    updatedAt?: string;
  };

  time: {
    originTime: string;
    originalTime?: string;
    originalTimezone?: string;
  };

  location: {
    latitude: number;
    longitude: number;
    depthKm?: number;

    originalLatitude?: number;
    originalLongitude?: number;
    originalDepth?: number;

    crs: "WGS84" | "JGD2000" | "JGD2011" | "TOKYO_DATUM" | "UNKNOWN";
  };

  magnitude?: {
    value: number;
    type?: string;
  };

  intensity?: {
    display: string;
    rank: number;
  };

  classification:
    | "OBSERVED"
    | "CALCULATED"
    | "ESTIMATED"
    | "SIMULATED"
    | "MODEL"
    | "ILLUSTRATIVE"
    | "UNAVAILABLE";
}
```

This is a conceptual model. Extend it only when real source data requires additional fields.

## 7. Data Fetching and Caching

Use a provider-specific update interval.

Do not use one global polling interval for every source.

The application should:

- Fetch only the necessary data.
- Avoid overlapping requests.
- Cache suitable public data.
- Respect provider update intervals.
- Record retrieval timestamps.
- Handle stale data.
- Handle network failures.
- Retry only when appropriate.

Use IndexedDB for structured local caching.

Do not store restricted data unless the applicable terms permit it.

## 8. Web Workers

Use Web Workers for computationally expensive operations, including:

- Large catalog filtering
- Spatial clustering
- Cross-section preparation
- Magnitude-frequency analysis
- Waveform processing
- Large model parsing

Do not send unnecessarily large objects between the main thread and workers.

Use transferable buffers when appropriate.

## 9. Geographic Map

MapLibre GL JS is responsible for:

- Basemap rendering
- Earthquake markers
- Geographic overlays
- Fault and plate boundary layers
- Map interaction

Keep data processing separate from map rendering.

Avoid rebuilding all map sources for every small state change.

## 10. 3D Visualization

Three.js is responsible for:

- Earth globe
- Earth interior
- Hypocenter visualization
- Cross-section visualization
- 3D scientific models

The initial globe orientation must be deterministic.

Set an explicit initial camera position, target, and up vector.

The initial view should place Japan near the center.

### WebGL lifecycle

MapLibre and Three.js both use WebGL.

They can coexist, but resource usage must be monitored.

Implement:

- Lazy initialization
- Renderer disposal
- Geometry and material disposal
- Texture disposal
- Event listener cleanup
- WebGL context-loss handling
- Context restoration handling
- Adaptive rendering quality

Do not assume a fixed browser WebGL context limit.

Measure behavior on actual target browsers and hardware.

## 11. GitHub Pages Deployment

Configure Vite's `base` path for the actual repository deployment path.

Use relative asset references where appropriate.

Do not assume root-domain deployment.

Ensure that all routes and assets work after production build.

External data requests must use HTTPS where available.

## 12. Error Handling

Errors must be isolated by provider and feature.

Examples:

- A failed USGS request must not prevent map initialization.
- A failed JMA request must not hide USGS events.
- A failed 3D renderer must not break the event list.
- An unavailable waveform file must not break the catalog.

Show meaningful status messages without exposing sensitive technical details to ordinary users.

## 13. Testing

Test:

- Provider parsing
- Normalization
- Coordinate conversion
- Distance calculations
- Time handling
- Intensity ordering
- b-value calculations
- Cache behavior
- Worker communication
- Production deployment paths

Test the deployed GitHub Pages environment, not only the local development server.