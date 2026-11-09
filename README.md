# EarthScope

**An extensible browser-based earthquake monitoring and geophysical visualization platform.**

EarthScope is a static-first web application for exploring earthquake activity, seismic intensity, hypocenter distributions, and geophysical datasets.

The project is designed to be hosted on GitHub Pages without requiring a dedicated backend.

## Features

### Core

- JMA earthquake information list (default, 30-day rolling list)
- USGS GeoJSON catalog (switchable source)
- Japanese seismic intensity display
- Earthquake event list and detail panel
- Time, magnitude, and depth filtering
- IndexedDB catalog cache
- Periodic catalog updates with conditional HTTP requests
- Data source status, timestamps, and acquisition warnings
- MapLibre GL JS hypocenter map
- GSI standard/pale detailed basemap with selector
- Natural Earth offline fallback (no API key or tile server)
- List/map selection synchronization
- Magnitude-sized and depth-colored event markers
- 地震分布図 / 速度構造 / 波形解析 / 強震モニタ tabs
- Cross-section tool with Slab2 depth contours
- Strong-motion availability panel and JMA intensity summary
- Documented NIED kmoni permission policy (no GIF retrieval/processing implemented)
- Japan-limited, non-spherical 3D crust block embedded in the 2D map (available when Slab2 is on) with right-drag orbit, middle-drag pan, and wheel zoom
- PB2002 plate-boundary overlay on the 2D map and 3D block
- J-SHIS 2020 probabilistic seismic-hazard WMS raster overlay
- Slab2 depth-contour overlay on the 2D map and 3D block
- Selected-event municipality-level JMA intensity fill (not a station distribution)
- JMA 250m estimated-intensity distribution tiles for qualifying events
- Clickable 3D hypocenters with a selection ring and event detail
- User-provided CSV/JSON waveform import, time-series chart, simple filters, and amplitude statistics
- Desktop-only user-provided NIED Hi-net ALJ2023 velocity-model import with depth slices and cross-sections
- Surface and hypocentral distance modules; Aki–Utsu b-value module
- Depth histogram, cumulative magnitude-frequency, temporal statistics, DBSCAN spatial clusters, and b-value analysis panel

### Planned

- Focal mechanism visualization
- MiniSEED / binary waveform support
- Global 3D Earth visualization (Japan-limited crust block is implemented)
- Tomography and Earth interior models

Advanced features depend on the availability and permitted use of suitable datasets.

## Technology Stack

| Component | Technology |
|---|---|
| Language | TypeScript |
| UI | React |
| Build system | Vite |
| Geographic map | MapLibre GL JS |
| 3D crust block | Three.js |
| Charts | Custom SVG/Canvas |
| Desktop application | Tauri 2 (Rust + WebView2/WebKitGTK) |
| Local cache | IndexedDB |
| Background processing | Web Workers |
| Web hosting | GitHub Pages |

Technology choices may be adjusted when a demonstrable technical reason exists.

## Data Sources

The default catalog is the JMA earthquake information list (`bosai/quake/data/list.json`), marked `READY` with PDL1.0 attribution to 気象庁. It is a 30-day rolling list; the UI defaults to a 24-hour view and can show the full list. The USGS GeoJSON feed is also integrated and selectable; browser access, CORS, and 304 conditional requests have been verified. USGS is a U.S. federal agency and its works are generally public domain; attribution to the U.S. Geological Survey is retained.

The Phase 2 map uses GSI standard/pale raster tiles with attribution and no API key, plus bundled Natural Earth 1:110m vectors as an offline fallback. GSI tiles are fetched directly from the Geospatial Information Authority of Japan and are not bundled by EarthScope. The 3D crust block is available inside the 地震分布図 panel only when the Slab2 overlay is enabled. The 2D map remains on GSI tiles. The 3D top surface uses GSI pale tiles in Web Mercator, with Natural Earth as a fallback, and draws PB2002 / Slab2 as model context. Clicking a 3D hypocenter selects the event.

Selecting a JMA event displays municipality-level maximum intensity as a fill layer. JMA supplies city/area intensity summaries (`int`), not a station-by-station shaking field. The overlay is an area aggregation and does not interpolate intensity between municipalities. Municipality polygons are derived from 国土数値情報 N03 via [simplify-japan-geojson](https://github.com/ricewin/simplify-japan-geojson) (CC BY 4.0). Designated-city wards that are not present in the simplified boundary asset are aggregated to their parent city.

For qualifying events (maximum intensity 5弱 or greater), EarthScope can also load the JMA 250m estimated-intensity distribution. The tiles are fetched directly from JMA and are model-derived estimates, not observations. They are not bundled or interpolated.

Waveform analysis currently accepts user-provided CSV/JSON files only. MiniSEED and binary waveforms, and NIED waveform feeds, are not connected. Amplitude units and station metadata are preserved as supplied; EarthScope does not verify them.

Velocity structure analysis accepts a user-selected `ALJ2023.zip` (or equivalent official package) and reads it locally in a Web Worker. The model is not bundled, relayed, or redistributed. It is displayed as depth slices and cross-sections with nearest-grid sampling. The model is classified `MODEL`, not an observation, and the provider does not state a CRS in the package; EarthScope keeps it `UNKNOWN`.

Potential future sources include:

- Japan Meteorological Agency
- NIED
- J-SHIS
- Geological Survey of Japan
- Published geophysical models

Data access is subject to each provider's technical and legal conditions.

Some datasets require registration or authentication. Some prohibit redistribution. EarthScope must not bypass these restrictions.

See [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md).

### Japan region filter

The Phase 1 catalog is restricted to the provisional rectangle 20°N–47°N, 120°E–155°E. This is an operational seismicity region that includes surrounding seas, not a political boundary. The USGS `all_day` feed is global and may be subject to provider limits, so the filtered subset is not guaranteed to be a complete regional catalog.

## Architecture

EarthScope is static-first.

The frontend retrieves permitted public data directly from external providers. Data is normalized internally and cached locally when appropriate.

No custom backend is required for the initial release.

Features that require restricted data, authentication, or server-side processing must be treated as conditional extensions.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Scientific Accuracy

EarthScope distinguishes observed data from calculated, estimated, simulated, and illustrative information.

Every scientific calculation must document:

- Formula
- Input units
- Output units
- Assumptions
- Limitations
- Numerical precision
- Relevant uncertainty

See [docs/SCIENCE.md](docs/SCIENCE.md).

## Development

Requirements: Node.js 20.19 or later (this repository is developed with Node.js 20.19.6).

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Run the unit tests and strict type checking:

```bash
npm test
npm run typecheck
```

Build the application:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

### Cross-section tool

In the 地震分布図 tab, select 断面を選択 and click a start point followed by an end point on the map. The cross-section panel shows:

- earthquake hypocenters within ±100 km of the profile
- distance from the start and depth
- Slab2 model-derived depth contours intersecting the profile

The Slab2 contours are model context, not direct observations. Horizontal and vertical scales are independent. Events with unknown depth are excluded and counted.

### Velocity structure tab

The 速度構造 tab is shown only in the Tauri desktop runtime. It accepts a user-downloaded `ALJ2023.zip` from the NIED Hi-net 日本列島三次元地震波速度構造 distribution page. The ZIP is parsed locally; no model data is sent to a server or included in the build. The panel shows:

- P-wave velocity, S-wave velocity, Vp/Vs, and supplied reliability values
- a depth slice on a longitude/latitude grid
- a cross-section selected by dragging a line on the depth slice

The display uses nearest grid cells, not interpolation or a new inversion. The model is `MODEL` data, not an observation. The NIED terms require citation of Matsubara et al. (2022) and prohibit redistribution of the data and distribution of processed model outputs. The panel shows this restriction.

### Strong-motion tab

The 強震モニタ tab intentionally does not embed, relay, or extract values from the NIED kmoni image. NIED's terms prohibit reproduction, transmission, and redistribution of kmoni content and discourage extracting individual station values from the image colors. A Vercel/edge relay would be a transmission/redistribution and is not implemented. The tab shows the restriction status, official links, the terms, and a clearly labeled JMA intensity summary. K-NET/KiK-net data also requires registration and has usage restrictions.

Technical feasibility and permission are tracked separately in [docs/NIED_STRONG_MOTION_POLICY.md](docs/NIED_STRONG_MOTION_POLICY.md). Desktop native HTTP and local processing are technically possible, but no kmoni retrieval/processing feature is enabled until NIED permission is documented.

### Local caches

On this workstation, development and build caches are kept on the G drive:

- npm cache: `G:\_cache\earthscope\npm` (local `.npmrc`)
- Vite/Vitest cache: `G:\_cache\earthscope\vite` (local `.env.local`)

`.npmrc` and `.env.local` are intentionally excluded from version control. Use `.env.example` as a template. Browser IndexedDB remains under browser-managed storage; it cannot be relocated to a filesystem path by a static web application.

### Sample data

Sample data is disabled by default. It can be explicitly enabled with `VITE_ENABLE_SAMPLE_DATA=true` for a UI demonstration; it is always labeled `ILLUSTRATIVE`, displays a warning banner, and is never written to IndexedDB. It is not a fallback for a failed USGS request.

### USGS feed behavior

- Feed: `summary/all_day.geojson`
- Refresh interval: 5 minutes while the page is visible
- Conditional requests: `If-Modified-Since` using the stored `Last-Modified` value; `304 Not Modified` keeps the cached catalog
- Cache: events are replaced per provider snapshot, so events leaving the rolling feed do not remain indefinitely
- Revised events with the same normalized id replace the previous version

## Desktop Application (Tauri 2)

EarthScope can be packaged as a Windows, macOS, or Linux desktop application with Tauri 2. The desktop app uses the existing React/Vite frontend and does not use Electron.

### Prerequisites

- Node.js 20.19 or later.
- Rust 1.77.2 or later via rustup.
- Windows: Microsoft C++ Build Tools (MSVC) and the WebView2 Runtime. Windows 10 1803+ usually includes WebView2.
- macOS: Xcode Command Line Tools and the macOS SDK.
- Linux: WebKitGTK 4.1, GTK 3, librsvg, and related distribution packages. The CI workflow lists the Ubuntu package set.

### Development

```bash
npm install
npm run tauri:dev
```

`tauri:dev` starts the Vite dev server through `dev:desktop` (with `VITE_BASE_PATH=/`) and opens the Tauri window.

### Production builds

```bash
# Current host OS; uses the bundle targets configured by Tauri
npm run tauri:build

# Compile the executable without creating installers
npm run tauri:build:no-bundle

# Windows installer only
npm run tauri:build -- --bundles nsis

# macOS application and disk image
npm run tauri:build -- --bundles app,dmg

# Linux AppImage and Debian package
npm run tauri:build -- --bundles appimage,deb
```

Typical artifacts:

- Windows: `src-tauri/target/release/bundle/nsis/EarthScope_<version>_x64-setup.exe`
- macOS: `src-tauri/target/release/bundle/macos/EarthScope.app` and `.../dmg/EarthScope_<version>_<arch>.dmg`
- Linux: `src-tauri/target/release/bundle/appimage/` and `.../deb/`

The current desktop configuration does not configure code signing, notarization, or an updater. Builds are unsigned unless the corresponding platform credentials are supplied. macOS and Linux builds must be produced on their respective operating systems; Tauri does not provide general cross-compilation for those bundles. The Windows installer was built and smoke-tested locally on Windows 11 with WebView2. The macOS/Linux CI matrix is configured but has not yet been executed on hosted runners.

### Web and desktop asset paths

- Web/GitHub Pages: `npm run build`; GitHub Actions supplies `VITE_BASE_PATH=/webquakeviewer/`.
- Desktop: `npm run build:desktop`; this sets `VITE_BASE_PATH=/` and produces the `dist/` consumed by Tauri.
- Do not publish the desktop `dist/` to Pages. The Pages workflow continues to build with the Pages base path and is unchanged by the desktop workflow.

### Security and capabilities

- No custom Tauri commands are exposed.
- The only native plugin is `opener`, restricted to opening `http://` and `https://` URLs in the system browser for the existing official links.
- No filesystem, shell, clipboard, or updater permissions are granted.
- The production CSP allows the existing data origins (JMA, USGS, GSI, J-SHIS) and local/asset resources. Dev CSP additionally allows the Vite dev server and HMR WebSocket.
- API keys and credentials are not embedded in the frontend or bundle.
- The Windows build uses a frameless window and an in-app draggable title bar with minimize, maximize/restore, and close controls. macOS and Linux keep native window decorations.

### Desktop CI

`.github/workflows/desktop-build.yml` builds Windows, macOS, and Linux bundles on pull requests or manual dispatch and uploads them as workflow artifacts. It does not run on pushes, does not create releases, and does not modify the GitHub Pages deployment workflow.

## Deployment

The production build is intended for GitHub Pages.

The Vite `base` path is configured from `VITE_BASE_PATH`. The GitHub Actions workflow obtains it from `actions/configure-pages`, so the build works for project sites and custom domains. Do not assume that the application is deployed at the domain root.

Upload the repository to GitHub and set Pages to use GitHub Actions. The deploy workflow runs type checking, tests, and the production build before publishing `dist`.

To check a project-site subpath locally in PowerShell:

```powershell
$env:VITE_BASE_PATH="/webquakeviewer/"
npm run build
npm run preview
# Open http://127.0.0.1:4173/webquakeviewer/
```

Remove `VITE_BASE_PATH` before a normal root-path build. The GitHub Actions workflow gets the correct value from `actions/configure-pages`.

## Documentation

- [Design specification](DESIGN.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data sources](docs/DATA_SOURCES.md)
- [Data formats](docs/DATA_FORMATS.md)
- [Scientific methods](docs/SCIENCE.md)
- [Development instructions](AGENTS.md)
- [Roadmap](docs/ROADMAP.md)

## Important Limitations

- External data availability may change.
- Browser CORS restrictions may prevent direct access to some providers.
- Some NIED datasets require registration and have redistribution restrictions.
- Real-time earthquake early warning and strong-motion streaming are not guaranteed.
- Advanced geophysical models may require large datasets and substantial processing resources.

EarthScope must communicate these limitations clearly rather than presenting unavailable information as if it were live data.

## License and Data Attribution

The application source code and third-party datasets may have different licenses.

Do not assume that the license of EarthScope also grants redistribution rights to external datasets.

Follow the terms of each data provider.