import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useRef,
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
  INTENSITY_LEGEND_CLASSES,
  JSHIS_ATTRIBUTION,
  JSHIS_URL,
  PB2002_ATTRIBUTION,
  type BasemapId,
} from './mapStyle';
import {
  JMA_ESTIMATED_ATTRIBUTION,
  findJmaEstimatedEntry,
  loadJmaEstimatedList,
  type JmaEstimatedEntry,
} from './jmaEstimatedIntensity';

const LazyEarthquakeMap = lazy(() =>
  import('./EarthquakeMap').then((module) => ({
    default: module.EarthquakeMap,
  })),
);

const LazyCrust3DPanel = lazy(() =>
  import('../crust3d/Crust3DPanel').then((module) => ({
    default: module.Crust3DPanel,
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

class Crust3DErrorBoundary extends Component<
  MapErrorBoundaryProps,
  MapErrorBoundaryState
> {
  state: MapErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): MapErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('3D module error', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="map-3d-loading map-3d-error">
          3Dモジュールの読み込みに失敗しました。2D地図は引き続き利用できます。
        </div>
      );
    }
    return this.props.children;
  }
}

function IntensityLegend({ event }: { event: Earthquake }) {
  if (event.intensityAreas === undefined || event.intensityAreas.length === 0) {
    return null;
  }
  return (
    <aside className="map-intensity-legend" aria-label="震度分布の凡例">
      <p className="map-intensity-legend-title">震度分布</p>
      <p className="map-intensity-legend-row">
        選択イベントの市区町村別最大震度
      </p>
      <ul>
        {INTENSITY_LEGEND_CLASSES.map((intensityClass) => (
          <li key={intensityClass.display}>
            <span
              className="map-intensity-swatch"
              style={{ backgroundColor: intensityClass.color }}
              aria-hidden="true"
            />
            {intensityClass.label}
          </li>
        ))}
      </ul>
      <p className="map-intensity-legend-note">
        JMA の地域別震度を市区町村単位で集約したものです。政令指定都市の区は市単位に集約する場合があります。観測点分布ではありません。
      </p>
    </aside>
  );
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
  const [showPlateBoundaries, setShowPlateBoundaries] = useState(false);
  const [showSlab2, setShowSlab2] = useState(false);
  const [showHazard, setShowHazard] = useState(false);
  const [showIntensity, setShowIntensity] = useState(true);
  const [showEstimated, setShowEstimated] = useState(false);
  const [estimatedEntry, setEstimatedEntry] =
    useState<JmaEstimatedEntry | null>(null);
  const [estimatedStatus, setEstimatedStatus] = useState<
    'idle' | 'loading' | 'ready' | 'none' | 'error'
  >('idle');
  const [show3d, setShow3d] = useState(false);
  const map3dRef = useRef<HTMLDivElement>(null);
  const selectedEvent =
    selectedId === null
      ? null
      : events.find((event) => event.id === selectedId) ?? null;
  const hasProfile = profileStart !== null && profileEnd !== null;

  useEffect(() => {
    let cancelled = false;
    setShowEstimated(false);
    if (
      selectedEvent === null ||
      selectedEvent.source.provider !== 'JMA' ||
      (selectedEvent.intensity?.rank ?? 0) < 5
    ) {
      setEstimatedEntry(null);
      setEstimatedStatus('idle');
      return;
    }
    setEstimatedEntry(null);
    setEstimatedStatus('loading');
    loadJmaEstimatedList()
      .then((entries) => {
        if (cancelled) {
          return;
        }
        const entry = findJmaEstimatedEntry(selectedEvent, entries);
        setEstimatedEntry(entry);
        setEstimatedStatus(entry === null ? 'none' : 'ready');
      })
      .catch((error: unknown) => {
        console.error('JMA estimated intensity list failed', error);
        if (!cancelled) {
          setEstimatedEntry(null);
          setEstimatedStatus('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedEvent]);

  useEffect(() => {
    if (show3d) {
      map3dRef.current?.scrollIntoView({
        block: 'start',
        behavior: 'smooth',
      });
    }
  }, [show3d]);

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
      <div className="map-layer-controls">
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
            onChange={(event) => {
              const checked = event.target.checked;
              setShowSlab2(checked);
              if (!checked) {
                setShow3d(false);
              }
            }}
          />
          Slab2 等深線
        </label>
        <label className={showSlab2 ? '' : 'map-layer-disabled'}>
          <input
            type="checkbox"
            checked={show3d}
            disabled={!showSlab2}
            onChange={(event) => setShow3d(event.target.checked)}
          />
          3D地殻ブロック
        </label>
        <label>
          <input
            type="checkbox"
            checked={showHazard}
            onChange={(event) => setShowHazard(event.target.checked)}
          />
          J-SHIS 地震ハザード
        </label>
        <label>
          <input
            type="checkbox"
            checked={showIntensity}
            onChange={(event) => setShowIntensity(event.target.checked)}
          />
          震度分布
        </label>
        <label className={estimatedEntry ? '' : 'map-layer-disabled'}>
          <input
            type="checkbox"
            checked={showEstimated}
            disabled={estimatedEntry === null}
            onChange={(event) => setShowEstimated(event.target.checked)}
          />
          推定震度（250m）
        </label>
      </div>
      {showSlab2 ? (
        <p className="map-layer-note">
          Slab2 等深線は USGS のモデル（Hayes et al., 2018）です。
          深さに応じて色分けしています。3D地殻ブロックを表示するには、
          上の「3D地殻ブロック」を有効にしてください。2D地図は地理院タイルのままです。
        </p>
      ) : null}
      {showHazard ? (
        <p className="map-layer-note">
          {JSHIS_ATTRIBUTION} 2020年版。確率論的評価であり、現在の揺れではありません。{' '}
          <a href={JSHIS_URL} target="_blank" rel="noreferrer">
            J-SHIS 公式
          </a>
        </p>
      ) : null}
      {selectedEvent !== null &&
      selectedEvent.source.provider === 'JMA' &&
      (selectedEvent.intensity?.rank ?? 0) >= 5 ? (
        <p className="map-layer-note">
          {estimatedStatus === 'loading'
            ? '250m推計震度分布を確認中…'
            : estimatedStatus === 'error'
              ? '250m推計震度分布の一覧を取得できませんでした。'
              : estimatedStatus === 'none'
                ? 'このイベントの250m推計震度分布は公開されていません。'
                : showEstimated
                  ? `${JMA_ESTIMATED_ATTRIBUTION}を表示中。観測値ではなく、地盤増幅度等を用いた推計値です。`
                  : 'このイベントには250m推計震度分布があります。チェックすると表示します。'}
        </p>
      ) : selectedEvent !== null && selectedEvent.intensity !== undefined ? (
        <p className="map-layer-note">
          250m推計震度分布は最大震度5弱以上の地震が対象です。
        </p>
      ) : null}
      {showPlateBoundaries ? (
        <p className="map-layer-note">{PB2002_ATTRIBUTION}</p>
      ) : null}
      {showIntensity ? (
        <p className="map-layer-note">
          {selectedEvent === null
            ? '地震マーカーをクリックすると、そのイベントの市区町村別最大震度を表示します。'
            : selectedEvent.intensityAreas === undefined ||
                selectedEvent.intensityAreas.length === 0
              ? '選択イベントには JMA の地域別震度データがありません。'
              : '選択イベントの市区町村別最大震度を表示中。JMA の地域別震度を市区町村単位で集約したもので、観測点分布ではありません。'}
        </p>
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
              showPlateBoundaries={showPlateBoundaries}
              showSlab2={showSlab2}
              showHazard={showHazard}
              showIntensity={showIntensity}
              showEstimated={showEstimated}
              estimatedEntry={estimatedEntry}
              profileStart={profileStart}
              profileEnd={profileEnd}
              profileMode={profileMode}
              onProfilePoint={handleProfilePoint}
              onSelect={onSelect}
            />
          </MapErrorBoundary>
        </Suspense>
        <MapLegend basemap={basemap} />
        {showIntensity && selectedEvent !== null ? (
          <IntensityLegend event={selectedEvent} />
        ) : null}
      </div>
      {show3d && showSlab2 ? (
        <div className="map-3d-section" ref={map3dRef}>
          <Suspense
            fallback={
              <div className="map-3d-loading">3D地殻ブロックを読み込み中…</div>
            }
          >
            <Crust3DErrorBoundary>
              <LazyCrust3DPanel
                events={events}
                selectedEvent={selectedEvent}
                onSelect={onSelect}
              />
            </Crust3DErrorBoundary>
          </Suspense>
        </div>
      ) : null}
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
