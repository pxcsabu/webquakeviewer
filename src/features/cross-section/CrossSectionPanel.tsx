import { useEffect, useMemo, useState } from 'react';
import type { GeoPoint } from '../../analysis/geodesy/distance';
import type { SlabContourCollection } from '../../analysis/cross-section/profile';
import {
  buildCrossSection,
  groupSlabIntersectionsByRegion,
} from '../../analysis/cross-section/profile';
import type { Earthquake } from '../../domain/earthquake/types';
import {
  formatLatitude,
  formatLongitude,
  formatMagnitude,
  formatUtcTimestamp,
} from '../../utils/format';

interface CrossSectionPanelProps {
  events: Earthquake[];
  start: GeoPoint;
  end: GeoPoint;
  onClear: () => void;
}

const SLAB_COLORS = [
  '#6c3483',
  '#2e86c1',
  '#d68910',
  '#1f6b4d',
  '#a93226',
];

const CHART_WIDTH = 820;
const CHART_HEIGHT = 320;
const CHART_MARGIN = { top: 16, right: 16, bottom: 46, left: 58 };

function tickValues(max: number, target: number): number[] {
  if (!Number.isFinite(max) || max <= 0) {
    return [0];
  }
  const rawStep = max / target;
  const power = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / power;
  const step =
    (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) *
    power;
  const values: number[] = [];
  for (let value = 0; value <= max + 1e-9; value += step) {
    values.push(Number(value.toFixed(6)));
  }
  return values;
}

function eventRadius(magnitude: number | undefined): number {
  if (magnitude === undefined || !Number.isFinite(magnitude)) {
    return 2;
  }
  return 1.8 + Math.min(8, Math.max(0, magnitude)) * 0.7;
}

export function CrossSectionPanel({
  events,
  start,
  end,
  onClear,
}: CrossSectionPanelProps) {
  const [contours, setContours] = useState<SlabContourCollection | null>(null);
  const [slabStatus, setSlabStatus] = useState<
    'loading' | 'ready' | 'error'
  >('loading');

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const load = async (): Promise<void> => {
      try {
        const response = await fetch(
          `${import.meta.env.BASE_URL}geo/slab2_japan_depth_contours.geojson`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data: unknown = await response.json();
        if (
          typeof data !== 'object' ||
          data === null ||
          !('type' in data) ||
          data.type !== 'FeatureCollection' ||
          !('features' in data) ||
          !Array.isArray(data.features)
        ) {
          throw new Error('Slab2 GeoJSON の形式が不正です。');
        }
        if (!cancelled) {
          setContours(data as SlabContourCollection);
          setSlabStatus('ready');
        }
      } catch (error) {
        if (!cancelled && !controller.signal.aborted) {
          console.error('Slab2 load failed', error);
          setSlabStatus('error');
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const result = useMemo(
    () => buildCrossSection(events, contours, start, end, 100),
    [events, contours, start, end],
  );
  const grouped = useMemo(
    () => groupSlabIntersectionsByRegion(result.slabIntersections),
    [result.slabIntersections],
  );
  const regionColors = useMemo(() => {
    const map = new Map<string, string>();
    let index = 0;
    for (const region of grouped.keys()) {
      map.set(region, SLAB_COLORS[index % SLAB_COLORS.length] ?? '#6c3483');
      index += 1;
    }
    return map;
  }, [grouped]);

  const maxDepth = useMemo(() => {
    const values = [
      ...result.events.map((item) => item.depthKm),
      ...result.slabIntersections.map((item) => item.depthKm),
      100,
    ].filter((value) => Number.isFinite(value));
    return Math.max(100, Math.ceil(Math.max(...values) / 100) * 100);
  }, [result.events, result.slabIntersections]);
  const maxDistance = Math.max(1, result.lengthKm);
  const plotWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;
  const plotHeight = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom;
  const xScale = (value: number): number =>
    CHART_MARGIN.left + (value / maxDistance) * plotWidth;
  const yScale = (value: number): number =>
    CHART_MARGIN.top + (value / maxDepth) * plotHeight;
  const xTicks = tickValues(maxDistance, 6);
  const yTicks = tickValues(maxDepth, 6);
  const hasContent =
    result.events.length > 0 || result.slabIntersections.length > 0;

  return (
    <section className="cross-section-panel" aria-labelledby="cross-section-heading">
      <div className="cross-section-header">
        <div>
          <h3 id="cross-section-heading">断面解析</h3>
          <p className="cross-section-coordinates">
            始点 {formatLatitude(start.latitude)}, {formatLongitude(start.longitude)}
            {' → '}
            終点 {formatLatitude(end.latitude)}, {formatLongitude(end.longitude)}
          </p>
        </div>
        <button type="button" onClick={onClear}>
          クリア
        </button>
      </div>

      <p className="cross-section-meta">
        距離 {result.lengthKm.toFixed(0)} km / 半幅 ±{result.halfWidthKm} km /
        イベント {result.events.length} 件 / 深さ不明除外{' '}
        {result.exclusions.missingDepth} 件 / 範囲外除外{' '}
        {result.exclusions.outsideCorridor} 件
      </p>

      {slabStatus === 'loading' ? (
        <p className="cross-section-note">Slab2 等深線を読み込み中…</p>
      ) : null}
      {slabStatus === 'error' ? (
        <p className="error-box">
          Slab2 等深線を読み込めませんでした。地震の深さ分布のみ表示します。
        </p>
      ) : null}

      {hasContent ? (
        <>
          <div className="cross-section-chart-wrap">
            <svg
              className="cross-section-chart"
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              role="img"
              aria-label="距離と深さによる地震断面図"
            >
              <rect
                x={CHART_MARGIN.left}
                y={CHART_MARGIN.top}
                width={plotWidth}
                height={plotHeight}
                fill="#f7f9fa"
                stroke="#cfd7de"
              />

              {xTicks.map((tick) => (
                <g key={`x-${tick}`}>
                  <line
                    x1={xScale(tick)}
                    x2={xScale(tick)}
                    y1={CHART_MARGIN.top}
                    y2={CHART_MARGIN.top + plotHeight}
                    stroke="#e1e6ea"
                  />
                  <text
                    x={xScale(tick)}
                    y={CHART_HEIGHT - 20}
                    textAnchor="middle"
                    className="cross-section-axis-label"
                  >
                    {tick}
                  </text>
                </g>
              ))}

              {yTicks.map((tick) => (
                <g key={`y-${tick}`}>
                  <line
                    x1={CHART_MARGIN.left}
                    x2={CHART_MARGIN.left + plotWidth}
                    y1={yScale(tick)}
                    y2={yScale(tick)}
                    stroke="#e1e6ea"
                  />
                  <text
                    x={CHART_MARGIN.left - 8}
                    y={yScale(tick) + 4}
                    textAnchor="end"
                    className="cross-section-axis-label"
                  >
                    {tick}
                  </text>
                </g>
              ))}

              <text
                x={CHART_MARGIN.left + plotWidth / 2}
                y={CHART_HEIGHT - 3}
                textAnchor="middle"
                className="cross-section-axis-title"
              >
                始点からの距離 (km)
              </text>
              <text
                x={12}
                y={CHART_MARGIN.top + plotHeight / 2}
                textAnchor="middle"
                transform={`rotate(-90 12 ${
                  CHART_MARGIN.top + plotHeight / 2
                })`}
                className="cross-section-axis-title"
              >
                深さ (km)
              </text>

              {[...grouped.entries()].map(([region, intersections]) => {
                const color = regionColors.get(region) ?? '#6c3483';
                if (intersections.length === 1) {
                  const point = intersections[0];
                  if (point === undefined) {
                    return null;
                  }
                  return (
                    <circle
                      key={region}
                      cx={xScale(point.alongKm)}
                      cy={yScale(point.depthKm)}
                      r={3}
                      fill={color}
                    />
                  );
                }
                return (
                  <polyline
                    key={region}
                    points={intersections
                      .map(
                        (item) =>
                          `${xScale(item.alongKm)},${yScale(item.depthKm)}`,
                      )
                      .join(' ')}
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    strokeOpacity={0.9}
                  />
                );
              })}

              {result.events.map((item) => (
                <circle
                  key={item.event.id}
                  cx={xScale(item.alongKm)}
                  cy={yScale(item.depthKm)}
                  r={eventRadius(item.event.magnitude?.value)}
                  fill="#c0392b"
                  fillOpacity={0.72}
                  stroke="#ffffff"
                  strokeWidth={0.9}
                >
                  <title>
                    {formatUtcTimestamp(item.event.time.originTime)}
                    {' / '}
                    {item.event.place ?? '場所未取得'}
                    {' / '}
                    {formatMagnitude(item.event.magnitude)}
                    {' / 深さ '}
                    {item.depthKm.toFixed(1)} km
                  </title>
                </circle>
              ))}
            </svg>
          </div>

          <div className="cross-section-footer">
            <div>
              <span className="cross-section-legend-title">
                円: マグニチュード（大きさ）
              </span>
              {grouped.size > 0 ? (
                <ul className="cross-section-regions">
                  {[...grouped.keys()].map((region) => (
                    <li key={region}>
                      <span
                        className="cross-section-swatch"
                        style={{
                          backgroundColor:
                            regionColors.get(region) ?? '#6c3483',
                        }}
                        aria-hidden="true"
                      />
                      {region} スラブ等深線
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="cross-section-note">
                  この断面と交差する Slab2 等深線はありません。
                </p>
              )}
            </div>
            <p className="cross-section-note">
              Slab2 等深線は USGS のモデル（Hayes et al., 2018）です。
              縦横の縮尺は独立しています。深さ不明のイベントは断面に含めていません。
            </p>
          </div>
        </>
      ) : (
        <p className="empty-message">
          この断面の範囲には、深さが既知のイベントがありません。
        </p>
      )}
    </section>
  );
}
