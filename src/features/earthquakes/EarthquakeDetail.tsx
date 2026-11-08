import { ClassificationBadge } from '../../components/ClassificationBadge';
import type { Earthquake } from '../../domain/earthquake/types';
import {
  formatCoordinates,
  formatDepthKm,
  formatJstTimestamp,
  formatMagnitude,
  formatUtcTimestamp,
} from '../../utils/format';

interface EarthquakeDetailProps {
  event: Earthquake | null;
}

export function EarthquakeDetail({ event }: EarthquakeDetailProps) {
  if (event === null) {
    return (
      <section className="panel event-detail" aria-labelledby="event-detail-heading">
        <div className="panel-heading">
          <h2 id="event-detail-heading">イベント詳細</h2>
        </div>
        <p className="empty-message">イベントを選択してください。</p>
      </section>
    );
  }

  return (
    <section className="panel event-detail" aria-labelledby="event-detail-heading">
      <div className="panel-heading">
        <h2 id="event-detail-heading">イベント詳細</h2>
        <ClassificationBadge classification={event.classification} />
      </div>

      {event.classification === 'ILLUSTRATIVE' ? (
        <p className="warning-box">
          このレコードは開発用サンプルです。実際の地震ではありません。
        </p>
      ) : null}

      <dl className="detail-grid">
        <div>
          <dt>発生時刻 (UTC)</dt>
          <dd>{formatUtcTimestamp(event.time.originTime)}</dd>
        </div>
        <div>
          <dt>発生時刻 (JST)</dt>
          <dd>{formatJstTimestamp(event.time.originTime)}</dd>
        </div>
        <div>
          <dt>マグニチュード</dt>
          <dd>{formatMagnitude(event.magnitude)}</dd>
        </div>
        <div>
          <dt>場所</dt>
          <dd>{event.place ?? '不明'}</dd>
        </div>
        <div>
          <dt>イベント種別</dt>
          <dd>{event.eventType ?? '不明'}</dd>
        </div>
        <div>
          <dt>深さ</dt>
          <dd>{formatDepthKm(event.location.depthKm)}</dd>
        </div>
        <div>
          <dt>座標</dt>
          <dd>{formatCoordinates(event.location)}</dd>
        </div>
        <div>
          <dt>CRS</dt>
          <dd>{event.location.crs}</dd>
        </div>
        <div>
          <dt>出典</dt>
          <dd>{event.source.provider}</dd>
        </div>
        <div>
          <dt>データセット</dt>
          <dd>{event.source.dataset}</dd>
        </div>
        <div>
          <dt>元 ID</dt>
          <dd>{event.source.originalId}</dd>
        </div>
        <div>
          <dt>取得時刻</dt>
          <dd>
            {event.source.retrievedAt
              ? formatUtcTimestamp(event.source.retrievedAt)
              : 'なし（ILLUSTRATIVE）'}
          </dd>
        </div>
        <div>
          <dt>出典 URL</dt>
          <dd>
            {event.source.sourceUrl ? (
              <a
                href={event.source.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                イベントページを開く
              </a>
            ) : (
              '不明'
            )}
          </dd>
        </div>
        <div>
          <dt>帰属</dt>
          <dd>{event.source.attribution ?? '不明'}</dd>
        </div>
        <div>
          <dt>更新時刻</dt>
          <dd>
            {event.source.updatedAt
              ? formatUtcTimestamp(event.source.updatedAt)
              : '不明'}
          </dd>
        </div>
        <div>
          <dt>震度</dt>
          <dd>
            {event.intensity
              ? `${event.intensity.display}（rank ${event.intensity.rank}）`
              : '未取得'}
          </dd>
        </div>
      </dl>
    </section>
  );
}
