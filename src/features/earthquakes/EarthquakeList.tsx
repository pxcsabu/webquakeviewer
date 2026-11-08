import type { AsyncStatus } from '../../app/state/asyncState';
import { ClassificationBadge } from '../../components/ClassificationBadge';
import type { Earthquake } from '../../domain/earthquake/types';
import {
  formatCoordinates,
  formatDepthKm,
  formatMagnitude,
  formatUtcTimestamp,
} from '../../utils/format';

interface EarthquakeListProps {
  events: Earthquake[];
  status: AsyncStatus;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function EarthquakeList({
  events,
  status,
  selectedId,
  onSelect,
}: EarthquakeListProps) {
  return (
    <section className="panel event-list-panel" aria-labelledby="event-list-heading">
      <div className="panel-heading">
        <h2 id="event-list-heading">地震イベント</h2>
        <span>{events.length} 件</span>
      </div>

      {events.length === 0 && status === 'loading' ? (
        <p className="empty-message">IndexedDB とサンプルを確認しています…</p>
      ) : null}

      {events.length === 0 && status !== 'loading' ? (
        <p className="empty-message">
          表示できるイベントがありません。フィルター条件または USGS
          フィードの状態を確認してください。
        </p>
      ) : null}

      {events.length > 0 ? (
        <ul className="event-list">
          {events.map((event) => (
            <li key={event.id}>
              <button
                type="button"
                aria-pressed={selectedId === event.id}
                onClick={() => onSelect(event.id)}
              >
                <span className="event-row-top">
                  <span className="event-time">
                    {formatUtcTimestamp(event.time.originTime)}
                  </span>
                  <span className="event-magnitude">
                    {formatMagnitude(event.magnitude)}
                  </span>
                </span>
                {event.place ? (
                  <span className="event-place" title={event.place}>
                    {event.place}
                  </span>
                ) : null}
                <span className="event-row-bottom">
                  <span>{formatCoordinates(event.location)}</span>
                  <span>深さ {formatDepthKm(event.location.depthKm)}</span>
                </span>
                <span className="event-row-meta">
                  <span>
                    {event.source.provider}
                    {event.eventType && event.eventType !== 'earthquake'
                      ? ` / ${event.eventType}`
                      : ''}
                  </span>
                  <ClassificationBadge classification={event.classification} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
