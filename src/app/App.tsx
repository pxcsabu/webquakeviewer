import { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '../components/AppHeader';
import { SourceStatusPanel } from '../components/SourceStatusPanel';
import { StatusBar } from '../components/StatusBar';
import { EarthquakeDetail } from '../features/earthquakes/EarthquakeDetail';
import { EarthquakeFilters } from '../features/earthquakes/EarthquakeFilters';
import { EarthquakeList } from '../features/earthquakes/EarthquakeList';
import { MapPlaceholder } from '../features/earthquakes/MapPlaceholder';
import {
  DEFAULT_EARTHQUAKE_FILTERS,
  filterEarthquakes,
  type EarthquakeFilterState,
} from '../features/earthquakes/filters';
import { useCatalog } from './state/useCatalog';

export function App() {
  const catalog = useCatalog();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<EarthquakeFilterState>(
    DEFAULT_EARTHQUAKE_FILTERS,
  );
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const visibleEvents = useMemo(
    () => filterEarthquakes(catalog.events, filters, now),
    [catalog.events, filters, now],
  );

  const selectedEvent = useMemo(() => {
    if (selectedId !== null) {
      const selected = visibleEvents.find((event) => event.id === selectedId);
      if (selected !== undefined) {
        return selected;
      }
    }
    return visibleEvents[0] ?? null;
  }, [visibleEvents, selectedId]);

  return (
    <div className="app-shell">
      <AppHeader
        source={catalog.source}
        loading={catalog.status === 'loading'}
        onRefresh={catalog.refresh}
      />

      <main className="app-main">
        <div className="app-column app-column-left">
          <EarthquakeFilters
            filters={filters}
            totalCount={catalog.events.length}
            visibleCount={visibleEvents.length}
            onChange={setFilters}
          />
          <EarthquakeList
            events={visibleEvents}
            status={catalog.status}
            selectedId={selectedEvent?.id ?? null}
            onSelect={setSelectedId}
          />
          <SourceStatusPanel
            providerState={catalog.providerState}
            warnings={catalog.warnings}
          />
        </div>

        <div className="app-column app-column-center">
          <MapPlaceholder />
        </div>

        <div className="app-column app-column-right">
          <EarthquakeDetail event={selectedEvent} />
        </div>
      </main>

      <StatusBar catalog={catalog} visibleCount={visibleEvents.length} />
    </div>
  );
}
