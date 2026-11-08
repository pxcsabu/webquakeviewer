import type { CatalogState } from '../app/state/useCatalog';
import { formatUtcTimestamp } from '../utils/format';

const STATUS_LABELS: Record<CatalogState['status'], string> = {
  idle: '待機',
  loading: '読み込み中',
  success: '正常',
  error: 'エラー',
};

interface StatusBarProps {
  catalog: CatalogState;
  visibleCount: number;
}

export function StatusBar({ catalog, visibleCount }: StatusBarProps) {
  const updatedLabel =
    catalog.source === 'sample'
      ? 'サンプル読込'
      : catalog.source === 'cache'
        ? 'キャッシュ更新'
        : catalog.source === 'network'
          ? '取得時刻'
          : '最終更新';

  const sourceLabel =
    catalog.source === 'none'
      ? '未接続'
      : catalog.source === 'sample'
        ? '開発用サンプル'
        : catalog.source === 'cache'
          ? `${catalog.providerLabel} キャッシュ`
          : `${catalog.providerLabel} ネットワーク`;

  return (
    <footer className="status-bar" aria-label="アプリケーション状態">
      <span>
        状態: <strong>{STATUS_LABELS[catalog.status]}</strong>
      </span>
      <span>
        データ: <strong>{sourceLabel}</strong>
      </span>
      <span>
        {updatedLabel}:{' '}
        <strong>
          {catalog.lastUpdated
            ? formatUtcTimestamp(catalog.lastUpdated)
            : '—'}
        </strong>
      </span>
      <span>
        表示件数: <strong>{visibleCount}</strong> / {catalog.events.length}
      </span>
      {catalog.notModified ? <span>前回取得から更新なし</span> : null}
      {catalog.warnings.length > 0 ? (
        <span className="warning-text">
          取得警告: {catalog.warnings.length} 件
        </span>
      ) : null}
      {catalog.cacheWarning ? (
        <span className="warning-text">{catalog.cacheWarning}</span>
      ) : null}
      {catalog.error ? (
        <span className="error-text">{catalog.error}</span>
      ) : null}
    </footer>
  );
}
