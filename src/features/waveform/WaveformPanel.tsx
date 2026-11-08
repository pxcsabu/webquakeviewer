import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ClassificationBadge } from '../../components/ClassificationBadge';
import type {
  WaveformFilterKind,
  WaveformTrace,
} from '../../domain/waveform/types';
import { formatUtcTimestamp } from '../../utils/format';
import { createDemoWaveform } from './demoWaveform';
import {
  parseWaveformCsv,
  parseWaveformJson,
  WaveformParseError,
} from './parseWaveformFile';
import {
  applyWaveformFilter,
  measureWaveform,
} from './processing';
import { WaveformChart } from './WaveformChart';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

function formatValue(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  const absolute = Math.abs(value);
  if (absolute >= 10000 || (absolute > 0 && absolute < 0.001)) {
    return value.toExponential(2);
  }
  return value.toFixed(3);
}

function formatRate(rate: number): string {
  return Number.isFinite(rate) && rate > 0 ? `${rate.toFixed(2)} Hz` : '不明';
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '不明';
  }
  return `${seconds.toFixed(3)} s`;
}

export function WaveformPanel() {
  const [trace, setTrace] = useState<WaveformTrace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterKind, setFilterKind] = useState<WaveformFilterKind>('none');
  const [windowSeconds, setWindowSeconds] = useState(2);
  const [stationInput, setStationInput] = useState('');
  const [unitsInput, setUnitsInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (trace === null) {
      return null;
    }
    return applyWaveformFilter(
      trace.samples,
      filterKind,
      windowSeconds,
      trace.samplingRateHz,
    );
  }, [trace, filterKind, windowSeconds]);

  const measurements = useMemo(
    () =>
      trace === null || filtered === null
        ? null
        : measureWaveform(filtered.samples, trace.samplingRateHz),
    [trace, filtered],
  );

  const loadTrace = (next: WaveformTrace): void => {
    setTrace(next);
    setError(null);
    setFilterKind('none');
    setWindowSeconds(2);
  };

  const handleFile = async (file: File): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      if (file.size > MAX_FILE_BYTES) {
        throw new WaveformParseError(
          'ファイルが大きすぎます（上限 10 MB）。',
        );
      }
      const text = await file.text();
      const isJson = file.name.toLowerCase().endsWith('.json');
      const options = {
        fileName: file.name,
        loadedAt: new Date().toISOString(),
        units: unitsInput.trim() || undefined,
        station: stationInput.trim()
          ? { station: stationInput.trim() }
          : undefined,
      };
      const next = isJson
        ? parseWaveformJson(text, options)
        : parseWaveformCsv(text, options);
      loadTrace(next);
    } catch (caught) {
      setTrace(null);
      setError(
        caught instanceof Error
          ? caught.message
          : '波形ファイルを読み込めませんでした。',
      );
    } finally {
      setLoading(false);
      if (fileInputRef.current !== null) {
        fileInputRef.current.value = '';
      }
    }
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file !== undefined) {
      void handleFile(file);
    }
  };

  const clear = (): void => {
    setTrace(null);
    setError(null);
    setFilterKind('none');
    setWindowSeconds(2);
  };

  return (
    <section
      className="panel waveform-panel"
      aria-labelledby="waveform-heading"
    >
      <div className="panel-heading">
        <h2 id="waveform-heading">波形解析</h2>
        {trace !== null ? (
          <ClassificationBadge classification={trace.classification} />
        ) : null}
      </div>

      <div className="waveform-toolbar">
        <label className="waveform-file-button">
          波形ファイルを選択
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.json,text/csv,application/json"
            onChange={onFileChange}
          />
        </label>
        <button
          type="button"
          onClick={() => loadTrace(createDemoWaveform())}
        >
          デモ波形（合成）
        </button>
        {trace !== null ? (
          <button type="button" onClick={clear}>
            クリア
          </button>
        ) : null}
        <span className="waveform-toolbar-note">
          CSV / JSON、最大 10 MB。MiniSEED / NIED 波形は未接続です。
        </span>
      </div>

      <div className="waveform-input-row">
        <label>
          <span>観測点（任意）</span>
          <input
            type="text"
            value={stationInput}
            placeholder="例: N.TKWH"
            onChange={(event) => setStationInput(event.target.value)}
          />
        </label>
        <label>
          <span>単位（任意）</span>
          <input
            type="text"
            value={unitsInput}
            placeholder="例: counts, m/s, gal"
            onChange={(event) => setUnitsInput(event.target.value)}
          />
        </label>
        <p className="waveform-input-note">
          ファイルに観測点・単位がない場合に使用します。読み込み時に適用されます。
        </p>
      </div>

      {loading ? <p className="waveform-status">読み込み中…</p> : null}
      {error !== null ? (
        <p className="waveform-error" role="alert">
          {error}
        </p>
      ) : null}

      {trace === null || filtered === null || measurements === null ? (
        <div className="waveform-empty">
          <p>ユーザー提供の波形ファイルを読み込むと、時系列と基本統計を表示します。</p>
          <p>
            CSV は <code>time,amplitude</code> の列が必要です。任意で
            <code>station,network,channel,units,samplingRateHz</code>{' '}
            を追加できます。時刻はタイムゾーン付き ISO 8601、Unix 秒、または
            Unix ミリ秒です。
          </p>
          <p>
            波形の単位変換・機器応答補正は行いません。振幅は入力された単位の
            まま表示します。NIED の波形は利用条件により接続していません。
          </p>
        </div>
      ) : (
        <>
          {trace.classification === 'SIMULATED' ? (
            <p className="warning-box">
              この波形は観測データではなく、表示確認用の合成データです。
            </p>
          ) : null}

          <div className="waveform-summary-grid">
            <div>
              <span className="waveform-summary-label">観測点</span>
              <strong>{trace.station.station ?? '未指定'}</strong>
            </div>
            <div>
              <span className="waveform-summary-label">ネットワーク / チャンネル</span>
              <strong>
                {[trace.station.network, trace.station.channel]
                  .filter((value) => value !== undefined && value.length > 0)
                  .join(' / ') || '未指定'}
              </strong>
            </div>
            <div>
              <span className="waveform-summary-label">単位</span>
              <strong>{trace.units}</strong>
            </div>
            <div>
              <span className="waveform-summary-label">サンプリング周波数</span>
              <strong>{formatRate(trace.samplingRateHz)}</strong>
            </div>
            <div>
              <span className="waveform-summary-label">開始時刻 (UTC)</span>
              <strong>{formatUtcTimestamp(new Date(trace.startTimeMs).toISOString())}</strong>
            </div>
            <div>
              <span className="waveform-summary-label">継続時間</span>
              <strong>{formatDuration(measurements.durationSeconds)}</strong>
            </div>
          </div>

          <div className="waveform-filter-row">
            <label>
              <span>フィルタ</span>
              <select
                value={filterKind}
                onChange={(event) =>
                  setFilterKind(event.target.value as WaveformFilterKind)
                }
              >
                <option value="none">なし</option>
                <option value="lowpass">ローパス（移動平均）</option>
                <option value="highpass">ハイパス（移動平均除去）</option>
              </select>
            </label>
            <label>
              <span>窓 (秒)</span>
              <input
                type="number"
                min="0.01"
                step="0.1"
                value={windowSeconds}
                disabled={filterKind === 'none'}
                onChange={(event) =>
                  setWindowSeconds(Number(event.target.value))
                }
              />
            </label>
            <span className="waveform-filter-note">
              簡易フィルタです。機器応答補正ではありません。
            </span>
          </div>

          <div className="waveform-chart-frame">
            <WaveformChart
              samples={filtered.samples}
              units={trace.units}
              startTimeMs={trace.startTimeMs}
            />
          </div>

          <div className="waveform-stats-grid">
            <div>
              <span>サンプル数</span>
              <strong>{measurements.sampleCount.toLocaleString('ja-JP')}</strong>
            </div>
            <div>
              <span>平均</span>
              <strong>{formatValue(measurements.mean)} {trace.units}</strong>
            </div>
            <div>
              <span>最大振幅</span>
              <strong>{formatValue(measurements.peakAmplitude)} {trace.units}</strong>
            </div>
            <div>
              <span>最大–最小</span>
              <strong>{formatValue(measurements.peakToPeak)} {trace.units}</strong>
            </div>
            <div>
              <span>RMS</span>
              <strong>{formatValue(measurements.rms)} {trace.units}</strong>
            </div>
          </div>

          {filtered.warnings.length > 0 ? (
            <ul className="waveform-warning-list">
              {filtered.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}

          <div className="waveform-provenance">
            <h3>データ出典</h3>
            <dl>
              <div>
                <dt>提供元</dt>
                <dd>{trace.source.provider}</dd>
              </div>
              <div>
                <dt>データセット</dt>
                <dd>{trace.source.dataset}</dd>
              </div>
              <div>
                <dt>取得時刻</dt>
                <dd>{trace.source.retrievedAt}</dd>
              </div>
              <div>
                <dt>分類</dt>
                <dd>{trace.classification}</dd>
              </div>
            </dl>
            {trace.source.note !== undefined ? (
              <p>{trace.source.note}</p>
            ) : null}
            {trace.warnings.length > 0 ? (
              <ul className="waveform-warning-list">
                {trace.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
            <p className="waveform-provenance-note">
              数値は入力ファイルの振幅をそのまま表示しています。EarthScope
              は出典・観測点・単位を検証していません。波形の再配布条件は
              提供元の条件に従ってください。
            </p>
          </div>
        </>
      )}
    </section>
  );
}
