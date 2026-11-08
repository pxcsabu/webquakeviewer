import {
  DEFAULT_EARTHQUAKE_FILTERS,
  TIME_RANGE_LABELS,
  type EarthquakeFilterState,
  type TimeRange,
} from './filters';

interface EarthquakeFiltersProps {
  filters: EarthquakeFilterState;
  totalCount: number;
  visibleCount: number;
  onChange: (filters: EarthquakeFilterState) => void;
}

const TIME_RANGES: TimeRange[] = ['all', '1h', '24h', '7d'];

const MAGNITUDE_OPTIONS = [
  { value: 'all', label: 'すべて' },
  { value: '1', label: 'M1.0 以上' },
  { value: '2.5', label: 'M2.5 以上' },
  { value: '4', label: 'M4.0 以上' },
  { value: '5', label: 'M5.0 以上' },
];

const DEPTH_OPTIONS = [
  { value: 'all', label: 'すべて' },
  { value: '30', label: '30 km 以浅' },
  { value: '100', label: '100 km 以浅' },
  { value: '300', label: '300 km 以浅' },
  { value: '700', label: '700 km 以浅' },
];

export function EarthquakeFilters({
  filters,
  totalCount,
  visibleCount,
  onChange,
}: EarthquakeFiltersProps) {
  const setNumberFilter = (
    key: 'minMagnitude' | 'maxDepthKm',
    rawValue: string,
  ): void => {
    onChange({
      ...filters,
      [key]: rawValue === 'all' ? null : Number(rawValue),
    });
  };

  return (
    <section className="panel filter-panel" aria-labelledby="filter-heading">
      <div className="panel-heading">
        <h2 id="filter-heading">フィルター</h2>
        <span>
          {visibleCount} / {totalCount} 件
        </span>
      </div>

      <div className="filter-grid">
        <label className="filter-field">
          <span>期間</span>
          <select
            value={filters.timeRange}
            onChange={(event) =>
              onChange({
                ...filters,
                timeRange: event.target.value as TimeRange,
              })
            }
          >
            {TIME_RANGES.map((range) => (
              <option key={range} value={range}>
                {TIME_RANGE_LABELS[range]}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span>最小マグニチュード</span>
          <select
            value={
              filters.minMagnitude === null
                ? 'all'
                : String(filters.minMagnitude)
            }
            onChange={(event) =>
              setNumberFilter('minMagnitude', event.target.value)
            }
          >
            {MAGNITUDE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span>最大深さ</span>
          <select
            value={
              filters.maxDepthKm === null ? 'all' : String(filters.maxDepthKm)
            }
            onChange={(event) =>
              setNumberFilter('maxDepthKm', event.target.value)
            }
          >
            {DEPTH_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="filter-footer">
        <p className="filter-note">
          深さ不明のイベントは深さ条件で除外されます。
        </p>
        <button
          type="button"
          onClick={() => onChange(DEFAULT_EARTHQUAKE_FILTERS)}
        >
          リセット
        </button>
      </div>
    </section>
  );
}
