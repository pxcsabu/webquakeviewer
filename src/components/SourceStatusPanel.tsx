import { SOURCE_REGISTRY } from '../data/providers/registry';
import { ProviderStatusBadge } from './ProviderStatusBadge';

export function SourceStatusPanel() {
  return (
    <section className="panel source-status" aria-labelledby="source-status-heading">
      <div className="panel-heading">
        <h2 id="source-status-heading">データソース</h2>
        <span>Phase 0</span>
      </div>
      <p className="muted source-intro">
        外部データはまだ取得していません。USGS はブラウザからの実取得を確認するまで
        UNVERIFIED として扱います。
      </p>
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
