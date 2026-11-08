import type { CatalogState } from '../app/state/useCatalog';
import { formatUtcTimestamp } from '../utils/format';

const STATUS_LABELS: Record<CatalogState['status'], string> = {
  idle: '待機',
  loading: '読み込み中',
  success: '正常',
  error: 'エラー',
};

const SOURCE_LABELS: Record<CatalogState['source'], string> = {
  none: '未接続',
  cache: 'IndexedDB キャッシュ',
  sample: '開発用サンプル',
};

interface StatusBarProps {
  catalog: CatalogState;
}

export function StatusBar({ catalog }: StatusBarProps) {
  const updatedLabel =
    catalog.source === 'sample'
      ? 'サンプル読込'
      : catalog.source === 'cache'
        ? 'キャッシュ更新'
        : '最終更新';

  return (
    <footer className="status-bar" aria-label="アプリケーション状態">
      <span>
        状態: <strong>{STATUS_LABELS[catalog.status]}</strong>
      </span>
      <span>
        データ: <strong>{SOURCE_LABELS[catalog.source]}</strong>
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
        表示件数: <strong>{catalog.events.length}</strong>
      </span>
      {catalog.cacheWarning ? (
        <span className="warning-text">{catalog.cacheWarning}</span>
      ) : null}
      {catalog.error ? (
        <span className="error-text">{catalog.error}</span>
      ) : null}
    </footer>
  );
}
