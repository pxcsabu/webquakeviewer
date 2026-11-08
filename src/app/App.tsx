import { useEffect, useMemo, useState } from 'react';
import {
  CATALOG_PROVIDER_OPTIONS,
  DEFAULT_CATALOG_PROVIDER,
  type CatalogProviderId,
} from '../data/providers/catalogProviders';
import { AppHeader } from '../components/AppHeader';
import { SourceStatusPanel } from '../components/SourceStatusPanel';
import { StatusBar } from '../components/StatusBar';
import { CatalogAnalysisPanel } from '../features/analysis/CatalogAnalysisPanel';
import { EarthquakeDetail } from '../features/earthquakes/EarthquakeDetail';
import { EarthquakeFilters } from '../features/earthquakes/EarthquakeFilters';
import { EarthquakeList } from '../features/earthquakes/EarthquakeList';
import { GlobePanel } from '../features/globe/GlobePanel';
import { MapPanel } from '../features/map/MapPanel';
import { StrongMotionPanel } from '../features/strong-motion/StrongMotionPanel';
import {
  DEFAULT_EARTHQUAKE_FILTERS,
  filterEarthquakes,
  type EarthquakeFilterState,
} from '../features/earthquakes/filters';
import { useCatalog } from './state/useCatalog';

type MainTab = 'map' | 'strong-motion' | 'globe';

export function App() {
  const [activeTab, setActiveTab] = useState<MainTab>('map');
  const [providerId, setProviderId] = useState<CatalogProviderId>(
    DEFAULT_CATALOG_PROVIDER,
  );
  const catalog = useCatalog(providerId);
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

  useEffect(() => {
    setSelectedId(null);
  }, [providerId]);

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

      <nav className="main-tabs" role="tablist" aria-label="表示切り替え">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'map'}
          onClick={() => setActiveTab('map')}
        >
          地震分布図
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'strong-motion'}
          onClick={() => setActiveTab('strong-motion')}
        >
          強震モニタ
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'globe'}
          onClick={() => setActiveTab('globe')}
        >
          3D地球
        </button>
      </nav>

      {activeTab === 'map' ? (
        <main className="app-main">
        <div className="app-column app-column-left">
          <EarthquakeFilters
            filters={filters}
            providerId={providerId}
            providerOptions={CATALOG_PROVIDER_OPTIONS}
            totalCount={catalog.events.length}
            visibleCount={visibleEvents.length}
            onChange={setFilters}
            onProviderChange={setProviderId}
          />
          <EarthquakeList
            events={visibleEvents}
            status={catalog.status}
            selectedId={selectedEvent?.id ?? null}
            onSelect={setSelectedId}
          />
          <CatalogAnalysisPanel
            key={providerId}
            events={visibleEvents}
          />
        </div>

        <div className="app-column app-column-center">
          <MapPanel
            events={visibleEvents}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>

        <div className="app-column app-column-right">
          <EarthquakeDetail event={selectedEvent} />
          <SourceStatusPanel
            providerLabel={catalog.providerLabel}
            providerState={catalog.providerState}
            warnings={catalog.warnings}
          />
        </div>
        </main>
      ) : activeTab === 'strong-motion' ? (
        <main className="app-main app-main-single">
          <StrongMotionPanel events={visibleEvents} providerId={providerId} />
        </main>
      ) : (
        <main className="app-main app-main-single">
          <GlobePanel events={visibleEvents} />
        </main>
      )}

      <StatusBar catalog={catalog} visibleCount={visibleEvents.length} />
    </div>
  );
}
