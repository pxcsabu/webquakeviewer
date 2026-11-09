import { useState } from 'react';
import type { Earthquake } from '../../domain/earthquake/types';
import {
  formatDepthKm,
  formatMagnitude,
  formatUtcTimestamp,
} from '../../utils/format';
import { JAPAN_REGION_BOUNDS } from '../../domain/geography/japanRegion';
import { Crust3DView } from './Crust3DView';
import {
  CRUST3D_DEPTH_CLASSES,
  isInCrust3DRegion,
} from './crust3dStyle';

interface Crust3DPanelProps {
  events: Earthquake[];
  selectedEvent: Earthquake | null;
  onSelect: (id: string) => void;
}

export function Crust3DPanel({
  events,
  selectedEvent,
  onSelect,
}: Crust3DPanelProps) {
  const [showPlateBoundaries, setShowPlateBoundaries] = useState(true);
  const [showSlab2, setShowSlab2] = useState(true);
  const [resetToken, setResetToken] = useState(0);
  const visibleEventCount = events.filter((event) =>
    isInCrust3DRegion(event.location),
  ).length;

  return (
    <section
      className="panel crust3d-panel"
      aria-labelledby="crust3d-heading"
    >
      <div className="panel-heading">
        <h2 id="crust3d-heading">日本周辺 3D地殻ブロック</h2>
        <div className="crust3d-heading-actions">
          <span className="crust3d-count">{visibleEventCount} 件</span>
          <button
            type="button"
            onClick={() => setResetToken((value) => value + 1)}
          >
            視点リセット
          </button>
        </div>
      </div>

      <div className="crust3d-toolbar">
        <span className="crust3d-control-help">
          右ドラッグ: 回転 / 中ドラッグ: 移動 / ホイール: ズーム /
          ダブルクリック: 視点リセット
        </span>
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
      </div>

      <p className="crust3d-selection">
        {selectedEvent === null ? (
          '地震の球をクリックすると、そのイベントの詳細を表示します。'
        ) : (
          <>
            選択中: {selectedEvent.place ?? '場所未取得'} /{' '}
            {formatMagnitude(selectedEvent.magnitude)} / 深さ{' '}
            {formatDepthKm(selectedEvent.location.depthKm)}
            {selectedEvent.intensity !== undefined
              ? ` / 最大震度 ${selectedEvent.intensity.display}`
              : ''}
            {' / '}
            {formatUtcTimestamp(selectedEvent.time.originTime)}
          </>
        )}
      </p>
      <div className="crust3d-frame">
        <Crust3DView
          events={events}
          showPlateBoundaries={showPlateBoundaries}
          showSlab2={showSlab2}
          resetToken={resetToken}
          selectedId={selectedEvent?.id ?? null}
          onSelectEvent={onSelect}
        />
        <aside className="crust3d-legend" aria-label="3D地殻ブロックの凡例">
          <p className="crust3d-legend-title">凡例</p>
          <p className="crust3d-legend-row">地震の色: 深さ</p>
          <ul>
            {CRUST3D_DEPTH_CLASSES.map((depthClass) => (
              <li key={depthClass.label}>
                <span
                  className="crust3d-legend-swatch"
                  style={{ backgroundColor: depthClass.color }}
                  aria-hidden="true"
                />
                {depthClass.label}
              </li>
            ))}
          </ul>
          <p className="crust3d-legend-note">線: PB2002 / Slab2 等深線</p>
        </aside>
      </div>

      <p className="crust3d-note">
        対象: 日本周辺（{JAPAN_REGION_BOUNDS.minLatitude}–
        {JAPAN_REGION_BOUNDS.maxLatitude}°N,{' '}
        {JAPAN_REGION_BOUNDS.minLongitude}–{JAPAN_REGION_BOUNDS.maxLongitude}
        °E）。深さは 0–700 km を表示しています。水平方向は地理院タイルと同じ
        Web メルカトル投影でマッピングした表示用ブロックで、厳密な地質構造・
        速度構造ではありません。
        地球全体の3D球体は提供していません。
      </p>
      <p className="crust3d-note">
        3D上面は地理院 淡色タイル（
        <a href="https://maps.gsi.go.jp/development/ichiran.html"
          target="_blank" rel="noreferrer">国土地理院</a>
        ）です。2D地図と同じ地理院タイルを使い、取得できない場合のみ
        Natural Earth にフォールバックします。
        PB2002（Bird 2003; Nordpil, ODC-By 1.0）と Slab2（Hayes et al.,
        2018）はモデル由来の境界・等深線です。地震はカタログの震源情報を
        そのまま深さ方向に配置しています。深さ不明の地震は灰色で上面に表示します。
      </p>
    </section>
  );
}
