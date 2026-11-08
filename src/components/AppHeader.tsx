import type { CatalogSource } from '../app/state/useCatalog';

interface AppHeaderProps {
  source: CatalogSource;
  loading: boolean;
  onRefresh: () => void;
}

export function AppHeader({
  source,
  loading,
  onRefresh,
}: AppHeaderProps) {
  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">EarthScope / Foundation</p>
        <h1>EarthScope</h1>
        <p className="subtitle">地震観測・震源分布の基盤</p>
      </div>
      <div className="header-actions">
        {source === 'sample' ? (
          <span className="sample-banner" role="status">
            開発用サンプル — 実データではありません
          </span>
        ) : null}
        <button type="button" onClick={onRefresh} disabled={loading}>
          {loading ? '読み込み中…' : '再読み込み'}
        </button>
      </div>
    </header>
  );
}
