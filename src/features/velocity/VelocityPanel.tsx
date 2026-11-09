import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { ClassificationBadge } from '../../components/ClassificationBadge';
import type { GeoPoint } from '../../analysis/geodesy/distance';
import {
  propertyLabel,
  propertyUnit,
  type VelocityModel,
  type VelocityProperty,
} from '../../domain/geophysics/velocityModel';
import { VelocitySlice } from './VelocitySlice';
import { VelocitySection } from './VelocitySection';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface WorkerProgress {
  type: 'progress';
  parsedRows?: number;
  totalRows?: number;
}

interface WorkerComplete {
  type: 'complete';
  model: VelocityModel;
}

interface WorkerError {
  type: 'error';
  message: string;
}

type WorkerResponse = WorkerProgress | WorkerComplete | WorkerError;

const PROPERTY_OPTIONS: ReadonlyArray<{
  id: VelocityProperty;
  label: string;
}> = [
  { id: 'vp', label: 'P波速度' },
  { id: 'vs', label: 'S波速度' },
  { id: 'vpvs', label: 'Vp/Vs' },
  { id: 'relp', label: 'P波信頼度' },
  { id: 'rels', label: 'S波信頼度' },
];

const DEFAULT_PROFILE_START: GeoPoint = {
  latitude: 36,
  longitude: 132,
};
const DEFAULT_PROFILE_END: GeoPoint = {
  latitude: 36,
  longitude: 145,
};

function nearestDepthIndex(model: VelocityModel, targetKm: number): number {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  model.axes.depths.forEach((depth, index) => {
    const distance = Math.abs(depth - targetKm);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function formatLoadedAt(iso: string): string {
  const date = new Date(iso);
  return Number.isFinite(date.getTime())
    ? date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC')
    : iso;
}

export function VelocityPanel() {
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [model, setModel] = useState<VelocityModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ parsed: number; total: number }>({
    parsed: 0,
    total: 0,
  });
  const [property, setProperty] = useState<VelocityProperty>('vp');
  const [depthIndex, setDepthIndex] = useState(0);
  const [profileStart, setProfileStart] = useState<GeoPoint | null>(null);
  const [profileEnd, setProfileEnd] = useState<GeoPoint | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    },
    [],
  );

  const handleFile = (file: File): void => {
    workerRef.current?.terminate();
    setStatus('loading');
    setModel(null);
    setError(null);
    setProgress({ parsed: 0, total: 0 });
    const worker = new Worker(
      new URL('./velocity.worker.ts', import.meta.url),
      { type: 'module' },
    );
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (message.type === 'progress') {
        setProgress({
          parsed: message.parsedRows ?? 0,
          total: message.totalRows ?? 0,
        });
        return;
      }
      if (message.type === 'error') {
        setStatus('error');
        setError(message.message);
        worker.terminate();
        workerRef.current = null;
        return;
      }
      setModel(message.model);
      setDepthIndex(nearestDepthIndex(message.model, 10));
      setProfileStart(DEFAULT_PROFILE_START);
      setProfileEnd(DEFAULT_PROFILE_END);
      setStatus('ready');
      worker.terminate();
      workerRef.current = null;
    };
    worker.onerror = (event) => {
      setStatus('error');
      setError(event.message || '速度構造ワーカーでエラーが発生しました。');
      worker.terminate();
      workerRef.current = null;
    };
    worker.postMessage({ file });
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file !== undefined) {
      handleFile(file);
    }
  };

  const clear = (): void => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setModel(null);
    setStatus('idle');
    setError(null);
    setProgress({ parsed: 0, total: 0 });
    setProfileStart(null);
    setProfileEnd(null);
    if (fileInputRef.current !== null) {
      fileInputRef.current.value = '';
    }
  };

  const handleProfileChange = (start: GeoPoint, end: GeoPoint): void => {
    setProfileStart(start);
    setProfileEnd(end);
  };

  const loadedDepth = model?.axes.depths[depthIndex] ?? 0;
  const progressRatio =
    progress.total > 0 ? Math.min(1, progress.parsed / progress.total) : 0;

  return (
    <section className="panel velocity-panel" aria-labelledby="velocity-heading">
      <div className="panel-heading">
        <h2 id="velocity-heading">日本列島 三次元速度構造</h2>
        {model !== null ? (
          <ClassificationBadge classification={model.classification} />
        ) : null}
      </div>

      <div className="velocity-toolbar">
        <label className="velocity-file-button">
          ALJ2023.zip を選択
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,application/zip"
            onChange={onFileChange}
          />
        </label>
        {model !== null ? (
          <button type="button" onClick={clear}>
            クリア
          </button>
        ) : null}
        <span className="velocity-toolbar-note">
          データはNIEDから取得したZIPをローカルで読み込みます。EarthScopeはデータを同梱・送信しません。
        </span>
      </div>

      {status === 'loading' ? (
        <div className="velocity-loading">
          <p>速度構造モデルを解析中…</p>
          {progress.total > 0 ? (
            <>
              <progress value={progress.parsed} max={progress.total} />
              <span>
                {progress.parsed.toLocaleString('ja-JP')} /{' '}
                {progress.total.toLocaleString('ja-JP')} 行
              </span>
            </>
          ) : (
            <span>{progressRatio > 0 ? `${Math.round(progressRatio * 100)}%` : 'ZIPを準備中…'}</span>
          )}
        </div>
      ) : null}

      {error !== null ? (
        <p className="velocity-error" role="alert">
          {error}
        </p>
      ) : null}

      {model === null && status !== 'loading' ? (
        <div className="velocity-empty">
          <p>
            <strong>ALJ2023.zip</strong> を選択すると、日本列島下のP波速度・S波速度・
            Vp/Vs・信頼度を深さスライスと断面図で表示します。
          </p>
          <p>
            データはNIED Hi-netの「日本列島三次元地震波速度構造」
            <a
              href="https://www.hinet.bosai.go.jp/topics/sokudo_kozo/alljpn_download.php?LANG=ja"
              target="_blank"
              rel="noreferrer"
            >
              配布ページ
            </a>
            から利用者が取得してください。EarthScopeはモデルデータを同梱・再配布しません。
          </p>
          <p>
            出典: Matsubara et al. (2022), Earth, Planets and Space 74:171,{' '}
            <a
              href="https://doi.org/10.1186/s40623-022-01724-0"
              target="_blank"
              rel="noreferrer"
            >
              doi:10.1186/s40623-022-01724-0
            </a>
          </p>
          <p className="velocity-usage-note">
            NIEDの配布条件により、データの再配布および加工物の配布は行いません。
            この画面はローカル表示専用です。
          </p>
        </div>
      ) : null}

      {model !== null ? (
        <>
          <div className="velocity-summary">
            <div>
              <span>ファイル</span>
              <strong>{model.source.fileName}</strong>
            </div>
            <div>
              <span>グリッド</span>
              <strong>
                {model.axes.lonCount} × {model.axes.latCount} ×{' '}
                {model.axes.depthCount}
              </strong>
            </div>
            <div>
              <span>範囲</span>
              <strong>
                {model.axes.lons[0]?.toFixed(0)}–{model.axes.lons[model.axes.lonCount - 1]?.toFixed(0)}°E,{' '}
                {model.axes.lats[0]?.toFixed(0)}–{model.axes.lats[model.axes.latCount - 1]?.toFixed(0)}°N
              </strong>
            </div>
            <div>
              <span>深さ</span>
              <strong>
                {model.axes.depths[0]?.toFixed(0)}–{model.axes.depths[model.axes.depthCount - 1]?.toFixed(0)} km
              </strong>
            </div>
            <div>
              <span>読み込み</span>
              <strong>{formatLoadedAt(model.source.loadedAt)}</strong>
            </div>
          </div>

          <div className="velocity-controls">
            <label>
              <span>表示量</span>
              <select
                value={property}
                onChange={(event) =>
                  setProperty(event.target.value as VelocityProperty)
                }
              >
                {PROPERTY_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>深さ</span>
              <select
                value={depthIndex}
                onChange={(event) => setDepthIndex(Number(event.target.value))}
              >
                {Array.from(model.axes.depths).map((depth, index) => (
                  <option key={`${depth}-${index}`} value={index}>
                    {depth.toFixed(depth % 1 === 0 ? 0 : 1)} km
                  </option>
                ))}
              </select>
            </label>
            <span className="velocity-current">
              {propertyLabel(property)} [{propertyUnit(property)}] / 深さ{' '}
              {Number.isFinite(loadedDepth) ? loadedDepth.toFixed(1) : '—'} km
            </span>
          </div>

          <div className="velocity-visuals">
            <VelocitySlice
              model={model}
              depthIndex={depthIndex}
              property={property}
              profileStart={profileStart}
              profileEnd={profileEnd}
              onProfileChange={handleProfileChange}
            />
            <VelocitySection
              model={model}
              property={property}
              start={profileStart}
              end={profileEnd}
            />
          </div>

          <div className="velocity-provenance">
            <h3>データ出典・利用条件</h3>
            <p>
              提供: {model.source.provider} / {model.source.dataset}
            </p>
            <p>{model.source.citation}</p>
            <p>
              <a href={model.source.doi} target="_blank" rel="noreferrer">
                論文 DOI
              </a>
            </p>
            <p className="velocity-usage-note">{model.source.usageNote}</p>
            <p>
              このモデルは地震波速度構造のモデルであり、観測値そのものではありません。
              グリッド間の値は最近傍セルで表示しています。CRSは提供元が明示していないため
              <code>UNKNOWN</code> として扱っています。
            </p>
          </div>
        </>
      ) : null}
    </section>
  );
}
