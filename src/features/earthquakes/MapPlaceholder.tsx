export function MapPlaceholder() {
  return (
    <section className="panel map-placeholder" aria-labelledby="map-heading">
      <div className="panel-heading">
        <h2 id="map-heading">地図</h2>
        <span>後続</span>
      </div>
      <div className="map-placeholder-body">
        <p>
          地図表示は、データ取得とカタログ検証の完了後に実装します。
        </p>
        <p className="muted">
          現在は地図を初期化せず、ダミーの震源分布も表示しません。
        </p>
      </div>
    </section>
  );
}
