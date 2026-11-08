import { SOURCE_REGISTRY } from '../data/providers/registry';
import type { ProviderStateRecord } from '../storage/indexeddb/database';
import { formatCount, formatUtcTimestamp } from '../utils/format';
import { ProviderStatusBadge } from './ProviderStatusBadge';

interface SourceStatusPanelProps {
  providerLabel: string;
  providerState: ProviderStateRecord | null;
  warnings: string[];
}

export function SourceStatusPanel({
  providerLabel,
  providerState,
  warnings,
}: SourceStatusPanelProps) {
  return (
    <section className="panel source-status" aria-labelledby="source-status-heading">
      <div className="panel-heading">
        <h2 id="source-status-heading">データソース</h2>
        <span>Data</span>
      </div>
      <p className="muted source-intro">
        選択中のデータソース（{providerLabel}）の取得状態を表示します。
        日本周辺の矩形範囲で抽出しています。
      </p>

      {providerState !== null ? (
        <section
          className="provider-runtime"
          aria-labelledby="provider-runtime-heading"
        >
          <h3 id="provider-runtime-heading">{providerLabel} 取得状態</h3>
          <dl className="runtime-grid">
            <div>
              <dt>最終試行</dt>
              <dd>
                {providerState.lastAttemptAt
                  ? formatUtcTimestamp(providerState.lastAttemptAt)
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>最終成功</dt>
              <dd>
                {providerState.lastSuccessAt
                  ? formatUtcTimestamp(providerState.lastSuccessAt)
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>フィード最新</dt>
              <dd>
                {providerState.lastFeedGeneratedAt
                  ? formatUtcTimestamp(providerState.lastFeedGeneratedAt)
                  : '不明'}
              </dd>
            </div>
            <div>
              <dt>取得件数</dt>
              <dd>
                {providerState.lastEventCount === null
                  ? '不明'
                  : `${formatCount(providerState.lastEventCount)} 件`}
              </dd>
            </div>
          </dl>
          {providerState.lastError ? (
            <p className="error-box">{providerState.lastError}</p>
          ) : null}
        </section>
      ) : null}

      {warnings.length > 0 ? (
        <details className="source-warnings">
          <summary>取得時の警告（{warnings.length} 件）</summary>
          <ul>
            {warnings.map((warning, index) => (
              <li key={`${index}-${warning}`}>{warning}</li>
            ))}
          </ul>
        </details>
      ) : null}

      <ul className="source-list">
        {SOURCE_REGISTRY.map((entry) => (
          <li key={entry.id}>
            <div className="source-row">
              <span className="source-name">{entry.name}</span>
              <ProviderStatusBadge status={entry.status} />
            </div>
            <p className="source-meta">{entry.provider}</p>
            <p className="source-meta">
              CORS: {entry.corsVerified ? '検証済み' : '未検証'} / 認証:{' '}
              {entry.requiresAuthentication ? '必要' : '不要'}
            </p>
            <p className="source-notes">{entry.notes}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
