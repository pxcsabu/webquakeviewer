# EarthScope

**An extensible browser-based earthquake monitoring and geophysical visualization platform.**

EarthScope is a static-first web application for exploring earthquake activity, seismic intensity, hypocenter distributions, and geophysical datasets.

The project is designed to be hosted on GitHub Pages without requiring a dedicated backend.

## Features

### Core

- Global earthquake catalog
- Interactive earthquake map
- Magnitude and depth visualization
- Earthquake search and filtering
- Seismic intensity information
- Basic earthquake statistics
- Data source status and timestamps

### Planned

- Hypocenter cross-sections
- Magnitude-frequency analysis
- b-value calculation
- 3D Earth visualization
- Plate and geological overlays
- Seismic waveform visualization
- Focal mechanism visualization
- Tomography and Earth interior models

Advanced features depend on the availability and permitted use of suitable datasets.

## Technology Stack

| Component | Technology |
|---|---|
| Language | TypeScript |
| UI | React |
| Build system | Vite |
| Geographic map | MapLibre GL JS |
| 3D visualization | Three.js |
| Charts | Apache ECharts |
| Local cache | IndexedDB |
| Background processing | Web Workers |
| Hosting | GitHub Pages |

Technology choices may be adjusted when a demonstrable technical reason exists.

## Data Sources

Potential sources include:

- USGS earthquake feeds
- Japan Meteorological Agency
- NIED
- J-SHIS
- Geological Survey of Japan
- Published geophysical models

Data access is subject to each provider's technical and legal conditions.

Some datasets require registration or authentication. Some prohibit redistribution. EarthScope must not bypass these restrictions.

See [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md).

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

### Local caches

On this workstation, development and build caches are kept on the G drive:

- npm cache: `G:\_cache\earthscope\npm` (local `.npmrc`)
- Vite/Vitest cache: `G:\_cache\earthscope\vite` (local `.env.local`)

`.npmrc` and `.env.local` are intentionally excluded from version control. Use `.env.example` as a template. Browser IndexedDB remains under browser-managed storage; it cannot be relocated to a filesystem path by a static web application.

### Sample data

Phase 0 can display explicitly labeled `ILLUSTRATIVE` development fixtures when no cached catalog is available. Sample data is enabled by default only in Vite development mode. Production builds require an explicit `VITE_ENABLE_SAMPLE_DATA=true` and always display a warning banner. Sample records are never written to IndexedDB.

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