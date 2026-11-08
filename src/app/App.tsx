import { useMemo, useState } from 'react';
import { AppHeader } from '../components/AppHeader';
import { SourceStatusPanel } from '../components/SourceStatusPanel';
import { StatusBar } from '../components/StatusBar';
import { EarthquakeDetail } from '../features/earthquakes/EarthquakeDetail';
import { EarthquakeList } from '../features/earthquakes/EarthquakeList';
import { MapPlaceholder } from '../features/earthquakes/MapPlaceholder';
import { useCatalog } from './state/useCatalog';

export function App() {
  const catalog = useCatalog();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedEvent = useMemo(() => {
    if (selectedId !== null) {
      const selected = catalog.events.find((event) => event.id === selectedId);
      if (selected !== undefined) {
        return selected;
      }
    }
    return catalog.events[0] ?? null;
  }, [catalog.events, selectedId]);

  return (
    <div className="app-shell">
      <AppHeader
        source={catalog.source}
        loading={catalog.status === 'loading'}
        onRefresh={catalog.refresh}
      />

      <main className="app-main">
        <div className="app-column app-column-left">
          <EarthquakeList
            events={catalog.events}
            status={catalog.status}
            selectedId={selectedEvent?.id ?? null}
            onSelect={setSelectedId}
          />
          <SourceStatusPanel />
        </div>

        <div className="app-column app-column-center">
          <MapPlaceholder />
        </div>

        <div className="app-column app-column-right">
          <EarthquakeDetail event={selectedEvent} />
        </div>
      </main>

      <StatusBar catalog={catalog} />
    </div>
  );
}
