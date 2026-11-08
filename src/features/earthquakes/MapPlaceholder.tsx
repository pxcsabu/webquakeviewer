export function MapPlaceholder() {
  return (
    <section className="panel map-placeholder" aria-labelledby="map-heading">
      <div className="panel-heading">
        <h2 id="map-heading">地図</h2>
        <span>Phase 1</span>
      </div>
      <div className="map-placeholder-body">
        <p>
          MapLibre GL JS による地震分布表示は Phase 1 で実装します。
        </p>
        <p className="muted">
          Phase 0 では地図を初期化せず、ダミーの震源分布も表示しません。
        </p>
      </div>
    </section>
  );
}
