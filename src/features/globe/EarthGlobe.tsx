import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type {
  FeatureCollection,
  LineString,
  MultiLineString,
  MultiPolygon,
  Polygon,
} from 'geojson';
import type { Earthquake } from '../../domain/earthquake/types';
import {
  depthColorHex,
  depthToRadius,
  GLOBE_RADIUS,
  JAPAN_CENTER,
} from './globeStyle';
import { latLonToVector3 } from './globeMath';

interface EarthGlobeProps {
  events: Earthquake[];
  showPlateBoundaries: boolean;
  showSlab2: boolean;
  resetToken: number;
}

function fetchFeatureCollection(
  url: string,
  signal: AbortSignal,
): Promise<FeatureCollection> {
  return fetch(url, { signal }).then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${url}`);
    }
    return response.json() as Promise<FeatureCollection>;
  });
}

function lonToX(longitude: number, width: number): number {
  return ((longitude + 180) / 360) * width;
}

function latToY(latitude: number, height: number): number {
  return ((90 - latitude) / 180) * height;
}

function drawPolygon(
  context: CanvasRenderingContext2D,
  coordinates: number[][][],
  width: number,
  height: number,
): void {
  context.beginPath();
  for (const ring of coordinates) {
    ring.forEach(([longitude, latitude], index) => {
      if (longitude === undefined || latitude === undefined) {
        return;
      }
      const x = lonToX(longitude, width);
      const y = latToY(latitude, height);
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });
    context.closePath();
  }
  context.fill('evenodd');
  context.stroke();
}

function drawLineString(
  context: CanvasRenderingContext2D,
  coordinates: number[][],
  width: number,
  height: number,
): void {
  context.beginPath();
  coordinates.forEach(([longitude, latitude], index) => {
    if (longitude === undefined || latitude === undefined) {
      return;
    }
    const x = lonToX(longitude, width);
    const y = latToY(latitude, height);
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });
  context.stroke();
}

function drawLandOrBoundaries(
  context: CanvasRenderingContext2D,
  collection: FeatureCollection,
  width: number,
  height: number,
  fill: string | null,
  stroke: string,
  lineWidth: number,
): void {
  context.save();
  context.lineWidth = lineWidth;
  context.strokeStyle = stroke;
  if (fill !== null) {
    context.fillStyle = fill;
  }

  for (const feature of collection.features) {
    const geometry = feature.geometry;
    if (geometry === null) {
      continue;
    }

    if (geometry.type === 'Polygon') {
      drawPolygon(context, geometry.coordinates, width, height);
    } else if (geometry.type === 'MultiPolygon') {
      for (const polygon of geometry.coordinates) {
        drawPolygon(context, polygon, width, height);
      }
    } else if (geometry.type === 'LineString') {
      drawLineString(context, geometry.coordinates, width, height);
    } else if (geometry.type === 'MultiLineString') {
      for (const line of geometry.coordinates) {
        drawLineString(context, line, width, height);
      }
    }
  }
  context.restore();
}

function createEarthTexture(
  land: FeatureCollection<Polygon | MultiPolygon>,
  boundaries: FeatureCollection<LineString | MultiLineString>,
): THREE.CanvasTexture {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context === null) {
    throw new Error('2D canvas を初期化できませんでした。');
  }

  context.fillStyle = '#c7dceb';
  context.fillRect(0, 0, width, height);

  // 30-degree graticule for orientation.
  context.save();
  context.strokeStyle = '#a9c0d0';
  context.lineWidth = 1;
  for (let longitude = -180; longitude <= 180; longitude += 30) {
    const x = lonToX(longitude, width);
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let latitude = -60; latitude <= 60; latitude += 30) {
    const y = latToY(latitude, height);
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
  context.restore();

  drawLandOrBoundaries(
    context,
    land,
    width,
    height,
    '#f5f6f3',
    '#9aa7b2',
    1.2,
  );
  drawLandOrBoundaries(
    context,
    boundaries,
    width,
    height,
    null,
    '#7f8c8d',
    0.9,
  );

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function buildPlateLineGeometry(
  collection: FeatureCollection,
): THREE.BufferGeometry | null {
  const positions: number[] = [];
  const radius = GLOBE_RADIUS * 1.004;

  const addLine = (coordinates: number[][]): void => {
    const points = coordinates
      .filter(
        (position) =>
          position.length >= 2 &&
          Number.isFinite(position[0]) &&
          Number.isFinite(position[1]),
      )
      .map(([longitude, latitude]) =>
        latLonToVector3(latitude ?? 0, longitude ?? 0, radius),
      );
    for (let index = 0; index < points.length - 1; index += 1) {
      const start = points[index];
      const end = points[index + 1];
      if (start === undefined || end === undefined) {
        continue;
      }
      positions.push(start.x, start.y, start.z, end.x, end.y, end.z);
    }
  };

  for (const feature of collection.features) {
    const geometry = feature.geometry;
    if (geometry === null) {
      continue;
    }
    if (geometry.type === 'LineString') {
      addLine(geometry.coordinates);
    } else if (geometry.type === 'MultiLineString') {
      for (const line of geometry.coordinates) {
        addLine(line);
      }
    }
  }

  if (positions.length === 0) {
    return null;
  }
  const buffer = new THREE.BufferGeometry();
  buffer.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  );
  return buffer;
}

function buildSlabLineGeometry(
  collection: FeatureCollection,
): THREE.BufferGeometry | null {
  const positions: number[] = [];
  const colors: number[] = [];

  const addLine = (coordinates: number[][], depthKm: number): void => {
    const radius = depthToRadius(depthKm);
    const color = new THREE.Color(depthColorHex(depthKm));
    const points = coordinates
      .filter(
        (position) =>
          position.length >= 2 &&
          Number.isFinite(position[0]) &&
          Number.isFinite(position[1]),
      )
      .map(([longitude, latitude]) =>
        latLonToVector3(latitude ?? 0, longitude ?? 0, radius),
      );
    for (let index = 0; index < points.length - 1; index += 1) {
      const start = points[index];
      const end = points[index + 1];
      if (start === undefined || end === undefined) {
        continue;
      }
      positions.push(start.x, start.y, start.z, end.x, end.y, end.z);
      colors.push(
        color.r,
        color.g,
        color.b,
        color.r,
        color.g,
        color.b,
      );
    }
  };

  for (const feature of collection.features) {
    const depthKm = Number(feature.properties?.depth);
    if (!Number.isFinite(depthKm)) {
      continue;
    }
    const geometry = feature.geometry;
    if (geometry === null) {
      continue;
    }
    if (geometry.type === 'LineString') {
      addLine(geometry.coordinates, depthKm);
    } else if (geometry.type === 'MultiLineString') {
      for (const line of geometry.coordinates) {
        addLine(line, depthKm);
      }
    }
  }

  if (positions.length === 0) {
    return null;
  }
  const buffer = new THREE.BufferGeometry();
  buffer.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  );
  buffer.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(colors, 3),
  );
  return buffer;
}

function createEarthquakePoints(
  events: readonly Earthquake[],
): THREE.Points | null {
  const positions: number[] = [];
  const colors: number[] = [];
  const sizes: number[] = [];

  for (const event of events) {
    const depthKm = event.location.depthKm;
    const radius = depthToRadius(depthKm);
    const position = latLonToVector3(
      event.location.latitude,
      event.location.longitude,
      radius,
    );
    const color = new THREE.Color(depthColorHex(depthKm));
    const magnitude = event.magnitude?.value ?? 0;
    positions.push(position.x, position.y, position.z);
    colors.push(color.r, color.g, color.b);
    sizes.push(0.018 + Math.min(8, Math.max(0, magnitude)) * 0.006);
  }

  if (positions.length === 0) {
    return null;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute(
    'pointColor',
    new THREE.Float32BufferAttribute(colors, 3),
  );
  geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    vertexShader: `
      attribute float size;
      attribute vec3 pointColor;
      varying vec3 vColor;

      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vec3 normal = normalize(world.xyz);
        vec3 viewDirection = normalize(cameraPosition - world.xyz);
        if (dot(normal, viewDirection) < -0.05) {
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          return;
        }
        vColor = pointColor;
        vec4 mv = viewMatrix * world;
        gl_PointSize = size * (300.0 / max(1.0, -mv.z));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        vec2 coord = gl_PointCoord - vec2(0.5);
        if (dot(coord, coord) > 0.25) {
          discard;
        }
        gl_FragColor = vec4(vColor, 0.92);
      }
    `,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  return new THREE.Points(geometry, material);
}

export function EarthGlobe({
  events,
  showPlateBoundaries,
  showSlab2,
  resetToken,
}: EarthGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const pointsGroupRef = useRef<THREE.Group | null>(null);
  const plateGroupRef = useRef<THREE.Group | null>(null);
  const slabGroupRef = useRef<THREE.Group | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const resetCameraRef = useRef<(() => void) | null>(null);
  const contextLostRef = useRef(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    let renderer: THREE.WebGLRenderer;
    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let controls: OrbitControls;
    let globe: THREE.Mesh;
    let pointsGroup: THREE.Group;
    let plateGroup: THREE.Group;
    let slabGroup: THREE.Group;
    let plateGeometry: THREE.BufferGeometry | null = null;
    let plateMaterial: THREE.LineBasicMaterial | null = null;
    let slabGeometry: THREE.BufferGeometry | null = null;
    let slabMaterial: THREE.LineBasicMaterial | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const handleContextLost = (event: Event): void => {
      event.preventDefault();
      contextLostRef.current = true;
      setContextLost(true);
    };
    const handleContextRestored = (): void => {
      contextLostRef.current = false;
      setContextLost(false);
    };

    try {
      scene = new THREE.Scene();
      scene.background = new THREE.Color('#f4f6f8');
      camera = new THREE.PerspectiveCamera(
        40,
        Math.max(1, container.clientWidth) /
          Math.max(1, container.clientHeight),
        0.1,
        100,
      );
      camera.up.set(0, 1, 0);

      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(
        Math.max(1, container.clientWidth),
        Math.max(1, container.clientHeight),
      );
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      container.appendChild(renderer.domElement);

      renderer.domElement.addEventListener(
        'webglcontextlost',
        handleContextLost,
      );
      renderer.domElement.addEventListener(
        'webglcontextrestored',
        handleContextRestored,
      );

      scene.add(new THREE.AmbientLight(0xffffff, 1.25));
      const light = new THREE.DirectionalLight(0xffffff, 0.65);
      light.position.set(5, 3, 5);
      scene.add(light);

      globe = new THREE.Mesh(
        new THREE.SphereGeometry(GLOBE_RADIUS, 64, 48),
        new THREE.MeshPhongMaterial({
          color: '#dce8f0',
          transparent: true,
          opacity: 0.82,
          depthWrite: true,
          shininess: 0,
        }),
      );
      scene.add(globe);

      pointsGroup = new THREE.Group();
      scene.add(pointsGroup);
      plateGroup = new THREE.Group();
      scene.add(plateGroup);
      slabGroup = new THREE.Group();
      scene.add(slabGroup);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = false;
      controls.enablePan = false;
      controls.minDistance = 1.6;
      controls.maxDistance = 6;
      controls.rotateSpeed = 0.6;
      controls.zoomSpeed = 0.7;
      controls.target.set(0, 0, 0);

      const resetCamera = (): void => {
        camera.position.copy(
          latLonToVector3(
            JAPAN_CENTER.latitude,
            JAPAN_CENTER.longitude,
            3.2,
          ),
        );
        camera.lookAt(0, 0, 0);
        controls.target.set(0, 0, 0);
        controls.update();
      };
      resetCameraRef.current = resetCamera;
      resetCamera();

      resizeObserver = new ResizeObserver(() => {
        if (cancelled) {
          return;
        }
        const width = Math.max(1, container.clientWidth);
        const height = Math.max(1, container.clientHeight);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      });
      resizeObserver.observe(container);

      renderer.setAnimationLoop(() => {
        if (contextLostRef.current) {
          return;
        }
        controls.update();
        renderer.render(scene, camera);
      });

      sceneRef.current = scene;
      cameraRef.current = camera;
      rendererRef.current = renderer;
      controlsRef.current = controls;
      pointsGroupRef.current = pointsGroup;
      plateGroupRef.current = plateGroup;
      slabGroupRef.current = slabGroup;
      setStatus('ready');

      void (async () => {
        try {
          const [land, boundaries, plateBoundaries] = await Promise.all([
            fetchFeatureCollection(
              `${import.meta.env.BASE_URL}geo/ne_110m_land.geojson`,
              controller.signal,
            ),
            fetchFeatureCollection(
              `${import.meta.env.BASE_URL}geo/ne_110m_admin_0_boundary_lines_land.geojson`,
              controller.signal,
            ),
            fetchFeatureCollection(
              `${import.meta.env.BASE_URL}geo/PB2002_boundaries.json`,
              controller.signal,
            ),
          ]);
          if (cancelled) {
            return;
          }

          const texture = createEarthTexture(
            land as FeatureCollection<Polygon | MultiPolygon>,
            boundaries as FeatureCollection<LineString | MultiLineString>,
          );
          texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
          textureRef.current = texture;
          const material = globe.material as THREE.MeshPhongMaterial;
          material.map = texture;
          material.needsUpdate = true;

          plateGeometry = buildPlateLineGeometry(plateBoundaries);
          if (plateGeometry !== null) {
            plateMaterial = new THREE.LineBasicMaterial({
              color: '#7d3c98',
              transparent: true,
              opacity: 0.85,
              depthWrite: false,
            });
            plateGroup.add(new THREE.LineSegments(plateGeometry, plateMaterial));
          }

          void (async () => {
            try {
              const slabContours = await fetchFeatureCollection(
                `${import.meta.env.BASE_URL}geo/slab2_japan_depth_contours.geojson`,
                controller.signal,
              );
              if (cancelled) {
                return;
              }
              slabGeometry = buildSlabLineGeometry(slabContours);
              if (slabGeometry !== null) {
                slabMaterial = new THREE.LineBasicMaterial({
                  vertexColors: true,
                  transparent: true,
                  opacity: 0.9,
                  depthTest: false,
                  depthWrite: false,
                });
                slabGroup.add(new THREE.LineSegments(slabGeometry, slabMaterial));
              }
            } catch (error) {
              if (!cancelled && !controller.signal.aborted) {
                console.error('Slab2 3D load failed', error);
                setWarning('Slab2 等深線を3D表示できませんでした。');
              }
            }
          })();
        } catch (error) {
          if (!cancelled && !controller.signal.aborted) {
            console.error('Globe texture load failed', error);
            setWarning(
              '地球テクスチャまたはプレート境界を読み込めませんでした。単色の地球を表示しています。',
            );
          }
        }
      })();
    } catch (error) {
      console.error('Globe initialization failed', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '3D地球を初期化できませんでした。',
      );
      setStatus('error');
      return () => {
        cancelled = true;
        controller.abort();
      };
    }

    return () => {
      cancelled = true;
      controller.abort();
      setStatus('loading');
      resetCameraRef.current = null;
      if (resizeObserver !== null) {
        resizeObserver.disconnect();
      }
      const canvas = renderer.domElement;
      canvas.removeEventListener(
        'webglcontextlost',
        handleContextLost,
      );
      canvas.removeEventListener(
        'webglcontextrestored',
        handleContextRestored,
      );
      controls.dispose();
      renderer.setAnimationLoop(null);

      for (const child of [...pointsGroup.children]) {
        pointsGroup.remove(child);
        if (child instanceof THREE.Points) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            for (const material of child.material) {
              material.dispose();
            }
          } else {
            child.material.dispose();
          }
        }
      }
      for (const child of [...plateGroup.children]) {
        plateGroup.remove(child);
        if (child instanceof THREE.LineSegments) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      }
      for (const child of [...slabGroup.children]) {
        slabGroup.remove(child);
        if (child instanceof THREE.LineSegments) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      }
      plateGeometry?.dispose();
      plateMaterial?.dispose();
      slabGeometry?.dispose();
      slabMaterial?.dispose();
      const globeMaterial = globe.material as THREE.MeshPhongMaterial;
      globe.geometry.dispose();
      globeMaterial.map?.dispose();
      globeMaterial.dispose();
      textureRef.current?.dispose();
      textureRef.current = null;
      renderer.dispose();
      canvas.remove();

      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
      pointsGroupRef.current = null;
      plateGroupRef.current = null;
      slabGroupRef.current = null;
      scene.clear();
    };
  }, []);

  useEffect(() => {
    const group = pointsGroupRef.current;
    if (group === null) {
      return;
    }
    for (const child of [...group.children]) {
      group.remove(child);
      if (child instanceof THREE.Points) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          for (const material of child.material) {
            material.dispose();
          }
        } else {
          child.material.dispose();
        }
      }
    }
    const points = createEarthquakePoints(events);
    if (points !== null) {
      group.add(points);
    }
  }, [events]);

  useEffect(() => {
    const group = plateGroupRef.current;
    if (group !== null) {
      group.visible = showPlateBoundaries;
    }
  }, [showPlateBoundaries]);

  useEffect(() => {
    const group = slabGroupRef.current;
    if (group !== null) {
      group.visible = showSlab2;
    }
  }, [showSlab2]);

  useEffect(() => {
    if (resetToken > 0) {
      resetCameraRef.current?.();
    }
  }, [resetToken]);

  return (
    <div
      className="globe-container"
      ref={containerRef}
      role="application"
      aria-label="3D地球の震源分布"
    >
      {status === 'loading' ? (
        <div className="map-overlay">3D地球を読み込み中…</div>
      ) : null}
      {status === 'error' ? (
        <div className="map-overlay map-overlay-error">{errorMessage}</div>
      ) : null}
      {warning ? <div className="map-basemap-warning">{warning}</div> : null}
      {contextLost ? (
        <div className="map-overlay">
          WebGL コンテキストが失われました。復元を待っています。
        </div>
      ) : null}
    </div>
  );
}
