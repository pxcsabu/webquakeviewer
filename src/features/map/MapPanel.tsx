import {
  Component,
  Suspense,
  lazy,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { JAPAN_REGION_BOUNDS } from '../../domain/geography/japanRegion';
import type { Earthquake } from '../../domain/earthquake/types';
import { DEPTH_CLASSES } from './mapStyle';

const LazyEarthquakeMap = lazy(() =>
  import('./EarthquakeMap').then((module) => ({
    default: module.EarthquakeMap,
  })),
);

interface MapPanelProps {
  events: Earthquake[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

interface MapErrorBoundaryProps {
  children: ReactNode;
}

interface MapErrorBoundaryState {
  hasError: boolean;
}

class MapErrorBoundary extends Component<
  MapErrorBoundaryProps,
  MapErrorBoundaryState
> {
  state: MapErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): MapErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Map module error', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="map-overlay map-overlay-error">
          地図モジュールの読み込みに失敗しました。カタログ表示は引き続き利用できます。
        </div>
      );
    }
    return this.props.children;
  }
}

function MapLegend() {
  return (
    <aside className="map-legend" aria-label="地図の凡例">
      <p className="map-legend-title">凡例</p>
      <p className="map-legend-row">円の大きさ: マグニチュード</p>
      <ul className="map-legend-depth">
        {DEPTH_CLASSES.map((depthClass) => (
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
        対象: 日本周辺（{JAPAN_REGION_BOUNDS.minLatitude}–
        {JAPAN_REGION_BOUNDS.maxLatitude}°N,{' '}
        {JAPAN_REGION_BOUNDS.minLongitude}–{JAPAN_REGION_BOUNDS.maxLongitude}
        °E）
      </p>
      <p className="map-legend-note">
        ベースマップ: Natural Earth（パブリックドメイン）
      </p>
    </aside>
  );
}

export function MapPanel({ events, selectedId, onSelect }: MapPanelProps) {
  return (
    <section className="panel map-panel" aria-labelledby="map-heading">
      <div className="panel-heading">
        <h2 id="map-heading">地震分布図</h2>
        <span>Phase 2</span>
      </div>
      <div className="map-frame">
        <Suspense
          fallback={<div className="map-overlay">地図モジュールを読み込み中…</div>}
        >
          <MapErrorBoundary>
            <LazyEarthquakeMap
              events={events}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          </MapErrorBoundary>
        </Suspense>
        <MapLegend />
      </div>
    </section>
  );
}
