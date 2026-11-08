import { useMemo, useState } from 'react';
import { buildDepthHistogram } from '../../analysis/depth/histogram';
import { estimateBValue } from '../../analysis/magnitude/bValue';
import { buildCumulativeMagnitudeFrequency } from '../../analysis/magnitude/frequency';
import type { Earthquake } from '../../domain/earthquake/types';

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
