import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';
import maplibregl, {
  type FilterSpecification,
  type GeoJSONSource,
  type MapLayerMouseEvent,
  type MapLibreMap,
} from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import type { GeoPoint } from '../../analysis/geodesy/distance';
import type { Earthquake } from '../../domain/earthquake/types';
import {
  BASE_MAP_STYLE,
  EARTHQUAKE_POINT_COLOR,
  EARTHQUAKE_POINT_RADIUS,
  GSI_ATTRIBUTION,
  GSI_TILE_URLS,
  JAPAN_REGION_POLYGON,
  JSHIS_HAZARD_COORDINATES,
  JSHIS_HAZARD_IMAGE_URL,
  MAP_BOUNDARY_COLOR,
  MAP_LAND_COLOR,
  MAP_REGION_COLOR,
  PB2002_ATTRIBUTION,
  PLATE_BOUNDARY_COLOR,
  SELECTED_POINT_RADIUS,
  toEarthquakeFeatureCollection,
  toProfileFeatureCollection,
  type BasemapId,
} from './mapStyle';

interface EarthquakeMapProps {
  events: Earthquake[];
  selectedId: string | null;
  basemap: BasemapId;
  profileStart: GeoPoint | null;
  profileEnd: GeoPoint | null;
  profileMode: boolean;
  showPlateBoundaries: boolean;
  showHazard: boolean;
  onProfilePoint: (point: GeoPoint) => void;
  onSelect: (id: string) => void;
}

async function fetchFeatureCollection(
  url: string,
): Promise<FeatureCollection> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`静的 GeoJSON を取得できませんでした（HTTP ${response.status}）: ${url}`);
  }
  return (await response.json()) as FeatureCollection;
}

export function EarthquakeMap({
  events,
  selectedId,
  basemap,
  profileStart,
  profileEnd,
  profileMode,
  showPlateBoundaries,
  showHazard,
  onProfilePoint,
  onSelect,
}: EarthquakeMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const eventsRef = useRef(events);
  const onSelectRef = useRef(onSelect);
  const profileModeRef = useRef(profileMode);
  const onProfilePointRef = useRef(onProfilePoint);
  const lastFlownIdRef = useRef<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [basemapWarning, setBasemapWarning] = useState<string | null>(null);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    profileModeRef.current = profileMode;
  }, [profileMode]);

  useEffect(() => {
    onProfilePointRef.current = onProfilePoint;
  }, [onProfilePoint]);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }

    let cancelled = false;
    setStatus('loading');
    setErrorMessage(null);
    setBasemapWarning(null);
    setMapReady(false);
    setContextLost(false);

    const map = new maplibregl.Map({
      container,
      style: BASE_MAP_STYLE,
      bounds: [
        [130, 30],
        [145, 45],
      ],
      fitBoundsOptions: { padding: 24 },
      minZoom: 5,
      maxZoom: 14,
      maxBounds: [
        [110, 5],
        [170, 60],
      ],
      dragRotate: false,
    });
    mapRef.current = map;
    map.touchZoomRotate.disableRotation();
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'top-right',
    );
    map.addControl(
      new maplibregl.ScaleControl({ unit: 'metric', maxWidth: 120 }),
      'bottom-left',
    );

    const canvas = map.getCanvas();
    const handleContextLost = (event: Event): void => {
      event.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = (): void => {
      setContextLost(false);
    };
    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    const resizeObserver = new ResizeObserver(() => {
      if (!cancelled) {
        map.resize();
      }
    });
    resizeObserver.observe(container);

    map.on('error', (event) => {
      console.error('MapLibre error', event.error);
      if (cancelled) {
        return;
      }

      const sourceId = 'sourceId' in event ? event.sourceId : undefined;
      if (typeof sourceId === 'string' && sourceId.startsWith('gsi-')) {
        setBasemapWarning(
          '地理院タイルの一部を読み込めませんでした。Natural Earth を表示しています。',
        );
        return;
      }

      setErrorMessage('地図の描画中にエラーが発生しました。');
      setStatus('error');
    });

    map.on('load', () => {
      void (async () => {
        try {
          const [land, boundaries, plateBoundaries] = await Promise.all([
            fetchFeatureCollection(
              `${import.meta.env.BASE_URL}geo/ne_110m_land.geojson`,
            ),
            fetchFeatureCollection(
              `${import.meta.env.BASE_URL}geo/ne_110m_admin_0_boundary_lines_land.geojson`,
            ),
            fetchFeatureCollection(
              `${import.meta.env.BASE_URL}geo/PB2002_boundaries.json`,
            ),
          ]);
          if (cancelled) {
            return;
          }

          map.addSource('land', {
            type: 'geojson',
            data: land,
            attribution: 'Natural Earth (public domain)',
          });
          map.addLayer({
            id: 'land-fill',
            type: 'fill',
            source: 'land',
            paint: {
              'fill-color': MAP_LAND_COLOR,
              'fill-outline-color': MAP_BOUNDARY_COLOR,
            },
          });

          map.addSource('boundaries', {
            type: 'geojson',
            data: boundaries,
            attribution: 'Natural Earth (public domain)',
          });
          map.addLayer({
            id: 'boundary-lines',
            type: 'line',
            source: 'boundaries',
            paint: {
              'line-color': MAP_BOUNDARY_COLOR,
              'line-width': 0.6,
            },
          });

          map.addSource('gsi-pale', {
            type: 'raster',
            tiles: [GSI_TILE_URLS['gsi-pale']],
            tileSize: 256,
            minzoom: 5,
            maxzoom: 18,
            attribution: GSI_ATTRIBUTION,
          });
          map.addLayer({
            id: 'basemap-gsi-pale',
            type: 'raster',
            source: 'gsi-pale',
            layout: {
              visibility: basemap === 'gsi-pale' ? 'visible' : 'none',
            },
            paint: {
              'raster-opacity': 1,
            },
          });

          map.addSource('gsi-std', {
            type: 'raster',
            tiles: [GSI_TILE_URLS['gsi-std']],
            tileSize: 256,
            minzoom: 5,
            maxzoom: 18,
            attribution: GSI_ATTRIBUTION,
          });
          map.addLayer({
            id: 'basemap-gsi-std',
            type: 'raster',
            source: 'gsi-std',
            layout: {
              visibility: basemap === 'gsi-std' ? 'visible' : 'none',
            },
            paint: {
              'raster-opacity': 1,
            },
          });

          map.addSource('jshis-hazard', {
            type: 'image',
            url: JSHIS_HAZARD_IMAGE_URL,
            coordinates: JSHIS_HAZARD_COORDINATES,
          });
          map.addLayer({
            id: 'jshis-hazard-raster',
            type: 'raster',
            source: 'jshis-hazard',
            layout: {
              visibility: showHazard ? 'visible' : 'none',
            },
            paint: {
              'raster-opacity': 0.5,
            },
          });

          map.addSource('pb2002-boundaries', {
            type: 'geojson',
            data: plateBoundaries,
            attribution: PB2002_ATTRIBUTION,
          });
          map.addLayer({
            id: 'pb2002-boundaries-line',
            type: 'line',
            source: 'pb2002-boundaries',
            layout: {
              visibility: showPlateBoundaries ? 'visible' : 'none',
            },
            paint: {
              'line-color': PLATE_BOUNDARY_COLOR,
              'line-width': 1.3,
              'line-opacity': 0.9,
            },
          });

          map.addSource('japan-region', {
            type: 'geojson',
            data: JAPAN_REGION_POLYGON,
          });
          map.addLayer({
            id: 'japan-region-line',
            type: 'line',
            source: 'japan-region',
            paint: {
              'line-color': MAP_REGION_COLOR,
              'line-width': 1.2,
              'line-dasharray': [4, 3],
            },
          });

          map.addSource('earthquakes', {
            type: 'geojson',
            data: toEarthquakeFeatureCollection(eventsRef.current),
            attribution: 'Earthquake data: JMA / USGS',
          });
          map.addLayer({
            id: 'earthquakes-circles',
            type: 'circle',
            source: 'earthquakes',
            paint: {
              'circle-radius': EARTHQUAKE_POINT_RADIUS,
              'circle-color': EARTHQUAKE_POINT_COLOR,
              'circle-opacity': 0.9,
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 1,
            },
          });

          const selectedFilter: FilterSpecification = [
            '==',
            ['get', 'id'],
            '',
          ];
          map.addLayer({
            id: 'earthquakes-selected',
            type: 'circle',
            source: 'earthquakes',
            filter: selectedFilter,
            paint: {
              'circle-radius': SELECTED_POINT_RADIUS,
              'circle-color': 'rgba(0, 0, 0, 0)',
              'circle-stroke-color': '#111827',
              'circle-stroke-width': 2,
            },
          });

          map.on('click', 'earthquakes-circles', (event: MapLayerMouseEvent) => {
            if (profileModeRef.current) {
              return;
            }
            event.preventDefault();
            const feature = event.features?.[0];
            const id = feature?.properties?.id;
            if (typeof id === 'string') {
              onSelectRef.current(id);
            }
          });
          map.on('click', (event) => {
            if (!profileModeRef.current) {
              return;
            }
            onProfilePointRef.current({
              latitude: event.lngLat.lat,
              longitude: event.lngLat.lng,
            });
          });
          map.on('mouseenter', 'earthquakes-circles', () => {
            if (!profileModeRef.current) {
              map.getCanvas().style.cursor = 'pointer';
            }
          });
          map.on('mouseleave', 'earthquakes-circles', () => {
            map.getCanvas().style.cursor = profileModeRef.current
              ? 'crosshair'
              : '';
          });

          map.addSource('profile', {
            type: 'geojson',
            data: toProfileFeatureCollection(profileStart, profileEnd),
          });
          map.addLayer({
            id: 'profile-line',
            type: 'line',
            source: 'profile',
            filter: ['==', ['geometry-type'], 'LineString'],
            paint: {
              'line-color': '#111827',
              'line-width': 2,
              'line-dasharray': [4, 2],
            },
          });
          map.addLayer({
            id: 'profile-points',
            type: 'circle',
            source: 'profile',
            filter: ['==', ['geometry-type'], 'Point'],
            paint: {
              'circle-radius': 5,
              'circle-color': '#111827',
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 1.5,
            },
          });

          if (!cancelled) {
            setStatus('ready');
            setMapReady(true);
          }
        } catch (error) {
          console.error('Map basemap load failed', error);
          if (!cancelled) {
            setErrorMessage(
              'ベースマップを読み込めませんでした。静的 GeoJSON の配信を確認してください。',
            );
            setStatus('error');
          }
        }
      })();
    });

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener(
        'webglcontextrestored',
        handleContextRestored,
      );
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || map === null) {
      return;
    }
    const source = map.getSource('earthquakes') as GeoJSONSource | undefined;
    source?.setData(toEarthquakeFeatureCollection(events));
  }, [events, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || map === null) {
      return;
    }
    const source = map.getSource('profile') as GeoJSONSource | undefined;
    source?.setData(toProfileFeatureCollection(profileStart, profileEnd));
  }, [profileStart, profileEnd, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || map === null) {
      return;
    }
    map.getCanvas().style.cursor = profileMode ? 'crosshair' : '';
  }, [profileMode, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || map === null) {
      return;
    }
    if (map.getLayer('pb2002-boundaries-line')) {
      map.setLayoutProperty(
        'pb2002-boundaries-line',
        'visibility',
        showPlateBoundaries ? 'visible' : 'none',
      );
    }
    if (map.getLayer('jshis-hazard-raster')) {
      map.setLayoutProperty(
        'jshis-hazard-raster',
        'visibility',
        showHazard ? 'visible' : 'none',
      );
    }
  }, [showPlateBoundaries, showHazard, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || map === null) {
      return;
    }
    const selectedFilter: FilterSpecification = [
      '==',
      ['get', 'id'],
      selectedId ?? '',
    ];
    if (map.getLayer('earthquakes-selected')) {
      map.setFilter('earthquakes-selected', selectedFilter);
    }
  }, [selectedId, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || map === null) {
      return;
    }
    if (selectedId === null) {
      lastFlownIdRef.current = null;
      return;
    }
    if (lastFlownIdRef.current === selectedId) {
      return;
    }
    const selected = events.find((event) => event.id === selectedId);
    if (selected === undefined) {
      return;
    }
    lastFlownIdRef.current = selectedId;
    map.easeTo({
      center: [selected.location.longitude, selected.location.latitude],
      zoom: Math.max(map.getZoom(), 5),
      duration: 500,
    });
  }, [events, selectedId, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || map === null) {
      return;
    }

    if (map.getLayer('basemap-gsi-pale')) {
      map.setLayoutProperty(
        'basemap-gsi-pale',
        'visibility',
        basemap === 'gsi-pale' ? 'visible' : 'none',
      );
    }
    if (map.getLayer('basemap-gsi-std')) {
      map.setLayoutProperty(
        'basemap-gsi-std',
        'visibility',
        basemap === 'gsi-std' ? 'visible' : 'none',
      );
    }
    if (basemap === 'natural-earth') {
      setBasemapWarning(null);
    }
  }, [basemap, mapReady]);

  return (
    <div
      className="map-container"
      ref={containerRef}
      role="application"
      aria-label="日本周辺の地震分布図"
    >
      {status === 'loading' ? (
        <div className="map-overlay">地図を読み込み中…</div>
      ) : null}
      {status === 'error' ? (
        <div className="map-overlay map-overlay-error">{errorMessage}</div>
      ) : null}
      {basemapWarning ? (
        <div className="map-basemap-warning">{basemapWarning}</div>
      ) : null}
      {contextLost ? (
        <div className="map-overlay">
          WebGL コンテキストが失われました。復元を待っています。
        </div>
      ) : null}
    </div>
  );
}
