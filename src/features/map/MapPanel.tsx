import {
  Component,
  Suspense,
  lazy,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { haversineDistanceKm, type GeoPoint } from '../../analysis/geodesy/distance';
import { JAPAN_REGION_BOUNDS } from '../../domain/geography/japanRegion';
import type { Earthquake } from '../../domain/earthquake/types';
import { CrossSectionPanel } from '../cross-section/CrossSectionPanel';
import {
  BASEMAP_OPTIONS,
  DEFAULT_BASEMAP,
  DEPTH_CLASSES,
  GSI_TILE_LIST_URL,
  type BasemapId,
} from './mapStyle';

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

function MapLegend({ basemap }: { basemap: BasemapId }) {
  const selectedBasemap = BASEMAP_OPTIONS.find(
    (option) => option.id === basemap,
  );
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
        ベースマップ: {selectedBasemap?.label ?? '不明'}
      </p>
      {basemap !== 'natural-earth' ? (
        <p className="map-legend-note">
          出典:{' '}
          <a
            href={GSI_TILE_LIST_URL}
            target="_blank"
            rel="noreferrer"
          >
            国土地理院 地理院タイル一覧
          </a>
        </p>
      ) : null}
    </aside>
  );
}

export function MapPanel({ events, selectedId, onSelect }: MapPanelProps) {
  const [basemap, setBasemap] = useState<BasemapId>(DEFAULT_BASEMAP);
  const [profileMode, setProfileMode] = useState(false);
  const [profileStart, setProfileStart] = useState<GeoPoint | null>(null);
  const [profileEnd, setProfileEnd] = useState<GeoPoint | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const hasProfile = profileStart !== null && profileEnd !== null;

  const clearProfile = (): void => {
    setProfileMode(false);
    setProfileStart(null);
    setProfileEnd(null);
    setProfileError(null);
  };

  const toggleProfileMode = (): void => {
    if (profileMode) {
      clearProfile();
      return;
    }
    setProfileMode(true);
    setProfileStart(null);
    setProfileEnd(null);
    setProfileError(null);
  };

  const handleProfilePoint = (point: GeoPoint): void => {
    setProfileError(null);
    if (profileStart === null || profileEnd !== null) {
      setProfileStart(point);
      setProfileEnd(null);
      return;
    }
    if (haversineDistanceKm(profileStart, point) < 5) {
      setProfileError('始点と終点が近すぎます。5 km 以上離してください。');
      return;
    }
    setProfileEnd(point);
    setProfileMode(false);
  };

  return (
    <section
      className={`panel map-panel${hasProfile ? ' map-panel-with-analysis' : ''}`}
      aria-labelledby="map-heading"
    >
      <div className="panel-heading">
        <h2 id="map-heading">地震分布図</h2>
        <label className="map-basemap-control">
          <span>ベースマップ</span>
          <select
            value={basemap}
            onChange={(event) =>
              setBasemap(event.target.value as BasemapId)
            }
          >
            {BASEMAP_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="map-toolbar">
        <button
          type="button"
          aria-pressed={profileMode}
          onClick={toggleProfileMode}
        >
          {profileMode ? '地図上で始点/終点を選択中…' : '断面を選択'}
        </button>
        {profileStart !== null || profileEnd !== null ? (
          <button type="button" onClick={clearProfile}>
            クリア
          </button>
        ) : null}
        <span className="map-toolbar-note">
          地図上で始点 → 終点の順にクリック
        </span>
      </div>
      {profileError ? (
        <p className="map-toolbar-error">{profileError}</p>
      ) : null}
      <div className="map-frame">
        <Suspense
          fallback={<div className="map-overlay">地図モジュールを読み込み中…</div>}
        >
          <MapErrorBoundary>
            <LazyEarthquakeMap
              events={events}
              selectedId={selectedId}
              basemap={basemap}
              profileStart={profileStart}
              profileEnd={profileEnd}
              profileMode={profileMode}
              onProfilePoint={handleProfilePoint}
              onSelect={onSelect}
            />
          </MapErrorBoundary>
        </Suspense>
        <MapLegend basemap={basemap} />
      </div>
      {hasProfile && profileStart !== null && profileEnd !== null ? (
        <CrossSectionPanel
          events={events}
          start={profileStart}
          end={profileEnd}
          onClear={clearProfile}
        />
      ) : null}
    </section>
  );
}
