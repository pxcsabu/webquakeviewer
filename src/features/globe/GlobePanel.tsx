import {
  Component,
  Suspense,
  lazy,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import type { Earthquake } from '../../domain/earthquake/types';
import { GLOBE_DEPTH_CLASSES } from './globeStyle';

const LazyEarthGlobe = lazy(() =>
  import('./EarthGlobe').then((module) => ({
    default: module.EarthGlobe,
  })),
);

interface GlobePanelProps {
  events: Earthquake[];
}

interface GlobeErrorBoundaryProps {
  children: ReactNode;
}

interface GlobeErrorBoundaryState {
  hasError: boolean;
}

class GlobeErrorBoundary extends Component<
  GlobeErrorBoundaryProps,
  GlobeErrorBoundaryState
> {
  state: GlobeErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): GlobeErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Globe module error', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="map-overlay map-overlay-error">
          3D地球モジュールの読み込みに失敗しました。カタログ表示は引き続き利用できます。
        </div>
      );
    }
    return this.props.children;
  }
}

function GlobeLegend() {
  return (
    <aside className="globe-legend" aria-label="3D地球の凡例">
      <p className="map-legend-title">凡例</p>
      <p className="map-legend-row">円の大きさ: マグニチュード</p>
      <ul className="map-legend-depth">
        {GLOBE_DEPTH_CLASSES.map((depthClass) => (
          <li key={depthClass.label}>
            <span
              className="map-legend-swatch"
              style={{ backgroundColor: depthClass.color }}
              aria-hidden="true"
            />
            {depthClass.label}
          </li>
        ))}
      </ul>
      <p className="map-legend-note">
        地球表面は深部可視化のため半透明です。深さは 0–700 km を
        0.15R に対応させた表示スケールで、物理的な縮尺ではありません。
      </p>
      <p className="map-legend-note">
        Slab2 等深線は USGS のモデル（Hayes et al., 2018）です。
      </p>
      <p className="map-legend-note">
        ドラッグで回転、ホイールで拡大縮小できます。
      </p>
    </aside>
  );
}

export function GlobePanel({ events }: GlobePanelProps) {
  const [showPlateBoundaries, setShowPlateBoundaries] = useState(false);
  const [showSlab2, setShowSlab2] = useState(false);
  const [resetToken, setResetToken] = useState(0);

  return (
    <section className="panel globe-panel" aria-labelledby="globe-heading">
      <div className="panel-heading">
        <h2 id="globe-heading">3D地球</h2>
        <span>{events.length} 件</span>
      </div>
      <div className="globe-toolbar">
        <label>
          <input
            type="checkbox"
            checked={showPlateBoundaries}
            onChange={(event) =>
              setShowPlateBoundaries(event.target.checked)
            }
          />
          プレート境界（PB2002）
        </label>
        <label>
          <input
            type="checkbox"
            checked={showSlab2}
            onChange={(event) => setShowSlab2(event.target.checked)}
          />
          Slab2 等深線
        </label>
        <button
          type="button"
          onClick={() => setResetToken((token) => token + 1)}
        >
          日本中心に戻す
        </button>
      </div>
      <div className="globe-frame">
        <Suspense
          fallback={
            <div className="map-overlay">3D地球モジュールを読み込み中…</div>
          }
        >
          <GlobeErrorBoundary>
            <LazyEarthGlobe
              events={events}
              showPlateBoundaries={showPlateBoundaries}
              showSlab2={showSlab2}
              resetToken={resetToken}
            />
          </GlobeErrorBoundary>
        </Suspense>
        <GlobeLegend />
      </div>
    </section>
  );
}
