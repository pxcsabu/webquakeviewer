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
| Charts | Custom SVG/Canvas |
| Desktop packaging | Tauri 2 (Rust) |
| Local storage | IndexedDB |
| Background processing | Web Workers |
| Web hosting | GitHub Pages |

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
    waveform/
    crust3d/

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
- Selected-event municipality-level intensity fill and optional JMA 250m estimated-intensity tiles
- Desktop-only user-provided velocity-model depth slices and cross-sections
- Map interaction

Keep data processing separate from map rendering.

Avoid rebuilding all map sources for every small state change.

## 10. 3D Visualization

Three.js is used for the Japan-limited 3D crust block. A global Earth globe is not part of the current scope.

The block is responsible for:

- Japan-region land texture on a horizontal top surface
- Hypocenter visualization by longitude, latitude, and depth
- PB2002 boundaries on the top surface
- Slab2 depth contours at their model depth
- Depth-coloured earthquake points
- Click selection of hypocenters via Three.js raycasting

The initial camera position, target, and up vector are explicit and deterministic. The initial view centers the operational Japan region. The block is a display model, not a velocity or geological model.

### Interaction model

The 3D block uses OrbitControls with:

- right-drag orbit
- middle-drag pan
- wheel zoom toward the cursor
- double-click reset
- one-finger touch orbit and two-finger touch pan/zoom

The left mouse button is reserved and does not manipulate the camera.

### Tab isolation and WebGL lifecycle

The 2D MapLibre map and the Three.js block share the 地震分布図 panel. The 3D block is an optional, lazy-mounted section that becomes available when the Slab2 overlay is enabled. The 2D GSI map remains mounted. Turning off Slab2 or the 3D option unmounts the 3D renderer and disposes its GPU resources.

Both WebGL contexts can coexist while the 3D option is enabled. This is an explicit user action, not a default. Monitor context creation and disposal; do not assume an unlimited number of WebGL contexts.

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

## 14. Desktop Packaging (Tauri 2)

The desktop application reuses the same Vite/React frontend. It does not replace the web build and does not use Electron.

### Build separation

- Web/GitHub Pages: `npm run build` with `VITE_BASE_PATH` supplied by the Pages workflow (for example `/webquakeviewer/`).
- Desktop: `npm run build:desktop` sets `VITE_BASE_PATH=/`; Tauri consumes `dist/` through `frontendDist`.
- `src-tauri/tauri.conf.json` defines `devUrl`, `beforeDevCommand`, `beforeBuildCommand`, and `frontendDist`.
- The desktop build must not overwrite or publish the GitHub Pages artifact.

### Security and capabilities

- The Tauri frontend uses the same browser APIs for fetch, IndexedDB, WebGL, and file input.
- No custom Rust commands are registered.
- No filesystem, shell, clipboard, or updater permissions are granted.
- The `opener` plugin is restricted to HTTP(S) URLs so existing official links open in the system browser.
- The production CSP explicitly allowlists JMA, USGS, GSI, and J-SHIS for `connect-src`/`img-src`, plus MapLibre worker blobs and Tauri IPC.
- The development CSP additionally permits the Vite dev server and HMR WebSocket.
- No API key or secret is embedded in the desktop bundle.

### Platform behavior

- Windows: frameless native window; the renderer draws a draggable app title bar with minimize, maximize/restore, and close controls. This is configured only in `src-tauri/tauri.windows.conf.json`.
- macOS and Linux: native window decorations remain.
- Builds are unsigned unless signing credentials are supplied. macOS/Linux bundles must be built on their native operating systems; general cross-compilation is not supported.
- Desktop CI is separate from Pages deployment and runs only on pull requests or manual dispatch.

