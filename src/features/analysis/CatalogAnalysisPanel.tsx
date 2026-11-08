import { useMemo, useState } from 'react';
import { buildDepthHistogram } from '../../analysis/depth/histogram';
import { estimateBValue } from '../../analysis/magnitude/bValue';
import { buildCumulativeMagnitudeFrequency } from '../../analysis/magnitude/frequency';
import { clusterEvents } from '../../analysis/spatial/clustering';
import {
  buildDailyEventHistogram,
  computeTemporalStatistics,
} from '../../analysis/temporal/statistics';
import type { Earthquake } from '../../domain/earthquake/types';
import {
  formatLatitude,
  formatLongitude,
  formatUtcTimestamp,
} from '../../utils/format';

interface CatalogAnalysisPanelProps {
  events: Earthquake[];
}

function magnitudeLabel(value: number): string {
  return `M${value.toFixed(1)}`;
}

export function CatalogAnalysisPanel({
  events,
}: CatalogAnalysisPanelProps) {
  const magnitudes = useMemo(
    () =>
      events
        .map((event) => event.magnitude?.value)
        .filter((value): value is number => value !== undefined),
    [events],
  );
  const minMagnitude =
    magnitudes.length > 0 ? Math.min(...magnitudes) : 0;
  const suggestedMc = Math.max(0, Math.floor(minMagnitude * 10) / 10);
  const [mc, setMc] = useState<number | null>(null);
  const [mcInput, setMcInput] = useState<string | null>(null);

  const effectiveMc = mc ?? suggestedMc;
  const displayedMc = mcInput ?? String(suggestedMc);
  const depthHistogram = useMemo(
    () => buildDepthHistogram(events),
    [events],
  );
  const dailyBins = useMemo(
    () => buildDailyEventHistogram(events),
    [events],
  );
  const temporal = useMemo(
    () => computeTemporalStatistics(events),
    [events],
  );
  const clustering = useMemo(
    () => clusterEvents(events, { epsKm: 50, minPts: 3 }),
    [events],
  );
  const frequencies = useMemo(
    () => buildCumulativeMagnitudeFrequency(magnitudes, 0.5),
    [magnitudes],
  );
  const bValue = estimateBValue(magnitudes, {
    mc: effectiveMc,
    binWidth: 0.1,
  });

  const maxDepthCount = Math.max(
    1,
    ...depthHistogram.map((bin) => bin.count),
  );
  const maxFrequency = Math.max(
    1,
    ...frequencies.map((point) => point.count),
  );
  const maxDailyCount = Math.max(
    1,
    ...dailyBins.map((bin) => bin.count),
  );
  const missingDepth = events.filter(
    (event) => event.location.depthKm === undefined,
  ).length;
  const missingMagnitude = events.length - magnitudes.length;

  const applyMc = (value: string): void => {
    setMcInput(value);
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      setMc(parsed);
    }
  };

  return (
    <section className="panel analysis-panel" aria-labelledby="analysis-heading">
      <div className="panel-heading">
        <h2 id="analysis-heading">解析</h2>
        <span>{events.length} 件</span>
      </div>

      <div className="analysis-block">
        <h3>深さ分布</h3>
        <p className="analysis-note">
          深さ不明 {missingDepth} 件を除外
        </p>
        <ul className="analysis-bars">
          {depthHistogram.map((bin) => (
            <li key={bin.label}>
              <span className="analysis-bar-label">{bin.label}</span>
              <span className="analysis-bar-track">
                <span
                  className="analysis-bar-fill"
                  style={{
                    width: `${(bin.count / maxDepthCount) * 100}%`,
                  }}
                />
              </span>
              <span className="analysis-bar-count">{bin.count}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="analysis-block">
        <h3>マグニチュード頻度（累積）</h3>
        <p className="analysis-note">
          マグニチュード不明 {missingMagnitude} 件を除外
        </p>
        {frequencies.length === 0 ? (
          <p className="empty-message">マグニチュードがありません。</p>
        ) : (
          <ul className="analysis-bars">
            {frequencies.map((point) => (
              <li key={point.threshold}>
                <span className="analysis-bar-label">
                  {magnitudeLabel(point.threshold)} 以上
                </span>
                <span className="analysis-bar-track">
                  <span
                    className="analysis-bar-fill analysis-bar-fill-alt"
                    style={{
                      width: `${(point.count / maxFrequency) * 100}%`,
                    }}
                  />
                </span>
                <span className="analysis-bar-count">{point.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="analysis-block">
        <h3>時系列統計（UTC）</h3>
        {temporal.count === 0 ? (
          <p className="empty-message">有効な時刻がありません。</p>
        ) : (
          <>
            <dl className="analysis-result">
              <div>
                <dt>期間</dt>
                <dd>{temporal.spanHours.toFixed(1)} h</dd>
              </div>
              <div>
                <dt>イベント数</dt>
                <dd>{temporal.count}</dd>
              </div>
              <div>
                <dt>間隔中央値</dt>
                <dd>
                  {temporal.medianInterEventHours === null
                    ? '—'
                    : `${temporal.medianInterEventHours.toFixed(1)} h`}
                </dd>
              </div>
              <div>
                <dt>最大間隔</dt>
                <dd>
                  {temporal.maxInterEventHours === null
                    ? '—'
                    : `${temporal.maxInterEventHours.toFixed(1)} h`}
                </dd>
              </div>
            </dl>
            <div
              className="analysis-timeline"
              aria-label="UTC日別イベント数"
            >
              {dailyBins.map((bin) => (
                <span
                  key={bin.startUtc}
                  className="analysis-timeline-bar"
                  style={{
                    height: `${(bin.count / maxDailyCount) * 100}%`,
                  }}
                  title={`${bin.label}: ${bin.count} 件`}
                />
              ))}
            </div>
            <p className="analysis-note">
              日別UTC（{dailyBins[0]?.label ?? '—'}–
              {dailyBins[dailyBins.length - 1]?.label ?? '—'}）。棒の高さは日別件数。
            </p>
          </>
        )}
      </div>

      <div className="analysis-block">
        <h3>空間クラスタ（DBSCAN）</h3>
        <p className="analysis-note">eps 50 km / minPts 3 / 球面距離</p>
        {clustering.clusters.length === 0 ? (
          <p className="empty-message">
            条件を満たすクラスタはありません。
          </p>
        ) : (
          <ol className="analysis-clusters">
            {clustering.clusters.slice(0, 5).map((cluster) => (
              <li key={cluster.id}>
                <div className="analysis-cluster-head">
                  <strong>{cluster.events.length} 件</strong>
                  <span>
                    {formatLatitude(cluster.centroid.latitude)},{' '}
                    {formatLongitude(cluster.centroid.longitude)}
                  </span>
                </div>
                <span className="analysis-cluster-meta">
                  最大 M {cluster.maxMagnitude?.toFixed(1) ?? '—'} /{' '}
                  {formatUtcTimestamp(cluster.startTime)} –{' '}
                  {formatUtcTimestamp(cluster.endTime)}
                </span>
              </li>
            ))}
          </ol>
        )}
        <p className="analysis-note">
          ノイズ {clustering.noiseCount} 件。クラスタは活動の目安であり、
          断層・プレート境界の同定ではありません。
        </p>
      </div>

      <div className="analysis-block">
        <h3>b値（Aki–Utsu）</h3>
        <div className="analysis-controls">
          <label>
            <span>Mc</span>
            <input
              type="number"
              step="0.1"
              min="0"
              value={displayedMc}
              onChange={(event) => applyMc(event.target.value)}
            />
          </label>
          <span className="analysis-fixed">ΔM = 0.1</span>
          <button
            type="button"
            onClick={() => {
              setMc(null);
              setMcInput(null);
            }}
          >
            最小値に戻す
          </button>
        </div>

        {bValue.ok ? (
          <dl className="analysis-result">
            <div>
              <dt>b値</dt>
              <dd>{bValue.bValue.toFixed(2)}</dd>
            </div>
            <div>
              <dt>a値</dt>
              <dd>{bValue.aValue.toFixed(2)}</dd>
            </div>
            <div>
              <dt>サンプル数</dt>
              <dd>{bValue.sampleCount}</dd>
            </div>
            <div>
              <dt>平均 M</dt>
              <dd>{bValue.meanMagnitude.toFixed(2)}</dd>
            </div>
          </dl>
        ) : (
          <p className="analysis-error">{bValue.error}</p>
        )}

        <p className="analysis-note">
          Mc の完備性は評価していません。Mc・ビン幅・サンプル数を確認してください。
        </p>
      </div>
    </section>
  );
}
