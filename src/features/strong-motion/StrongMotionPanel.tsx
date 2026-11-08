import { getSourceRegistryEntry } from '../../data/providers/registry';
import type { CatalogProviderId } from '../../data/providers/catalogProviders';
import type { Earthquake } from '../../domain/earthquake/types';
import { formatMagnitude, formatUtcTimestamp } from '../../utils/format';
import { ProviderStatusBadge } from '../../components/ProviderStatusBadge';

interface StrongMotionPanelProps {
  events: Earthquake[];
  providerId: CatalogProviderId;
}

const KMONI_URL = 'http://www.kmoni.bosai.go.jp/';
const KNET_URL = 'https://www.kyoshin.bosai.go.jp/';
const JMA_QUAKE_URL = 'https://www.jma.go.jp/bosai/quake/';

export function StrongMotionPanel({
  events,
  providerId,
}: StrongMotionPanelProps) {
  const kmoni = getSourceRegistryEntry('nied-kmoni');
  const knet = getSourceRegistryEntry('nied-knet-kiknet');
  const intensityEvents = events
    .filter((event) => event.intensity !== undefined)
    .sort(
      (left, right) =>
        Date.parse(right.time.originTime) -
        Date.parse(left.time.originTime),
    )
    .slice(0, 10);

  return (
    <section
      className="panel strong-motion-panel"
      aria-labelledby="strong-motion-heading"
    >
      <div className="panel-heading">
        <h2 id="strong-motion-heading">強震モニタ</h2>
        <span className="badge status-unavailable">利用不可</span>
      </div>

      <div className="strong-motion-grid">
        <div className="strong-motion-status">
          <h3>リアルタイム強震モニタ</h3>
          <p>
            NIED 強震モニタの HTTPS エンドポイントは応答せず、HTTP
            版は HTTPS の EarthScope に直接埋め込めません（mixed
            content）。K-NET / KiK-net の強震データは登録・利用条件があります。
          </p>
          <p>
            EarthScope はプロキシ、再配布、模擬データで強震モニタを補完しません。
            公式サービスを新しいタブで確認してください。
          </p>
          <ul className="strong-motion-links">
            <li>
              <a href={KMONI_URL} target="_blank" rel="noreferrer">
                NIED 強震モニタ（HTTP）
              </a>
            </li>
            <li>
              <a href={KNET_URL} target="_blank" rel="noreferrer">
                NIED K-NET / KiK-net
              </a>
            </li>
            <li>
              <a href={JMA_QUAKE_URL} target="_blank" rel="noreferrer">
                気象庁 地震情報
              </a>
            </li>
          </ul>
        </div>

        <div className="strong-motion-sources">
          <h3>データソース状態</h3>
          <div className="strong-motion-source-row">
            <div>
              <p className="strong-motion-source-name">{kmoni?.name ?? 'NIED 強震モニタ'}</p>
              <p className="strong-motion-source-note">
                {kmoni?.notes ?? '利用条件を確認していません。'}
              </p>
            </div>
            <ProviderStatusBadge status={kmoni?.status ?? 'UNAVAILABLE'} />
          </div>
          <div className="strong-motion-source-row">
            <div>
              <p className="strong-motion-source-name">{knet?.name ?? 'NIED K-NET / KiK-net'}</p>
              <p className="strong-motion-source-note">
                {knet?.notes ?? '登録・利用条件があります。'}
              </p>
            </div>
            <ProviderStatusBadge status={knet?.status ?? 'RESTRICTED'} />
          </div>
        </div>
      </div>

      <section
        className="strong-motion-intensity"
        aria-labelledby="jma-intensity-heading"
      >
        <div className="panel-heading">
          <h3 id="jma-intensity-heading">気象庁の震度情報</h3>
          <span>強震モニタではありません</span>
        </div>
        {providerId !== 'jma' ? (
          <p className="empty-message">
            気象庁 地震情報を選択すると、最近の震度情報を表示できます。
          </p>
        ) : intensityEvents.length === 0 ? (
          <p className="empty-message">
            現在の表示範囲に震度情報のあるイベントはありません。
          </p>
        ) : (
          <ul className="strong-motion-intensity-list">
            {intensityEvents.map((event) => (
              <li key={event.id}>
                <span className="strong-motion-time">
                  {formatUtcTimestamp(event.time.originTime)}
                </span>
                <span className="strong-motion-place">
                  {event.place ?? '場所未取得'}
                </span>
                <span>{formatMagnitude(event.magnitude)}</span>
                <span className="strong-motion-intensity-value">
                  最大震度 {event.intensity?.display}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
