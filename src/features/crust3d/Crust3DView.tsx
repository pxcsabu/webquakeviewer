import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { JAPAN_REGION_BOUNDS } from '../../domain/geography/japanRegion';
import type { Earthquake } from '../../domain/earthquake/types';
import {
  buildEarthquakePointData,
  extractPlateLines,
  extractSlabLines,
} from './crust3dData';
import { lonLatDepthToPosition } from './crust3dMath';
import {
  CRUST3D_GSI_ATTRIBUTION,
  createGsiCanvas,
  createLandCanvas,
} from './crust3dTexture';
import {
  CRUST3D_BOTTOM_Y,
  CRUST3D_DEPTH,
  CRUST3D_HEIGHT,
  CRUST3D_TOP_Y,
  CRUST3D_WIDTH,
  depthColorHex,
  depthToY,
  isInCrust3DRegion,
  latToZ,
  lonToX,
} from './crust3dStyle';

interface Crust3DViewProps {
  events: Earthquake[];
  showPlateBoundaries: boolean;
  showSlab2: boolean;
  resetToken: number;
  selectedId: string | null;
  onSelectEvent: (id: string) => void;
}

const CAMERA_POSITION = new THREE.Vector3(3.8, 3.2, 4.7);
const CAMERA_TARGET = new THREE.Vector3(0, -0.42, 0);
const PLATE_COLOR = '#7d3c98';
const REGION_COLOR = '#165a8a';

const POINT_VERTEX_SHADER = `
  attribute float size;
  attribute vec3 color;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (8.0 / max(1.0, -mvPosition.z));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const POINT_FRAGMENT_SHADER = `
  varying vec3 vColor;
  void main() {
    vec2 centered = gl_PointCoord - vec2(0.5);
    if (dot(centered, centered) > 0.25) {
      discard;
    }
    gl_FragColor = vec4(vColor, 0.96);
  }
`;

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url}`);
  }
  return (await response.json()) as unknown;
}

function disposeMaterial(material: THREE.Material): void {
  const maybeMapped = material as THREE.Material & {
    map?: THREE.Texture | null;
  };
  maybeMapped.map?.dispose();
  material.dispose();
}

function disposeGroup(group: THREE.Group): void {
  group.traverse((object) => {
    if (
      object instanceof THREE.Mesh ||
      object instanceof THREE.Points ||
      object instanceof THREE.Line ||
      object instanceof THREE.Sprite
    ) {
      if ('geometry' in object && object.geometry instanceof THREE.BufferGeometry) {
        object.geometry.dispose();
      }
      const material = object.material;
      if (Array.isArray(material)) {
        material.forEach(disposeMaterial);
      } else if (material instanceof THREE.Material) {
        disposeMaterial(material);
      }
    }
  });
  group.clear();
}

function addEarthquakePoints(
  group: THREE.Group,
  events: readonly Earthquake[],
): THREE.Points | null {
  disposeGroup(group);
  const data = buildEarthquakePointData(events);
  if (data.count === 0) {
    return null;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(data.sizes, 1));
  const material = new THREE.ShaderMaterial({
    vertexShader: POINT_VERTEX_SHADER,
    fragmentShader: POINT_FRAGMENT_SHADER,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  points.renderOrder = 10;
  points.frustumCulled = false;
  points.userData.eventIds = data.eventIds;
  group.add(points);
  return points;
}

function createSelectionSprite(): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (context !== null) {
    context.clearRect(0, 0, 128, 128);
    context.beginPath();
    context.arc(64, 64, 46, 0, Math.PI * 2);
    context.strokeStyle = 'rgba(255, 255, 255, 0.98)';
    context.lineWidth = 12;
    context.stroke();
    context.beginPath();
    context.arc(64, 64, 46, 0, Math.PI * 2);
    context.strokeStyle = '#111827';
    context.lineWidth = 4;
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.24, 0.24, 0.24);
  sprite.renderOrder = 30;
  return sprite;
}

function updateSelection(
  group: THREE.Group,
  events: readonly Earthquake[],
  selectedId: string | null,
): void {
  disposeGroup(group);
  if (selectedId === null) {
    return;
  }
  const event = events.find((candidate) => candidate.id === selectedId);
  if (event === undefined || !isInCrust3DRegion(event.location)) {
    return;
  }
  const sprite = createSelectionSprite();
  sprite.position.copy(
    lonLatDepthToPosition(
      event.location.latitude,
      event.location.longitude,
      event.location.depthKm,
    ),
  );
  group.add(sprite);
}

function addPlateLines(group: THREE.Group, data: unknown): void {
  disposeGroup(group);
  const lines = extractPlateLines(data, JAPAN_REGION_BOUNDS);
  lines.forEach((line) => {
    const positions = new Float32Array(line.coordinates.length * 3);
    line.coordinates.forEach((coordinate, index) => {
      const offset = index * 3;
      positions[offset] = lonToX(coordinate.longitude);
      positions[offset + 1] = CRUST3D_TOP_Y + 0.012;
      positions[offset + 2] = latToZ(coordinate.latitude);
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({
      color: PLATE_COLOR,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const object = new THREE.Line(geometry, material);
    object.renderOrder = 4;
    group.add(object);
  });
}

function addSlabLines(group: THREE.Group, data: unknown): void {
  disposeGroup(group);
  const lines = extractSlabLines(data, JAPAN_REGION_BOUNDS);
  lines.forEach((line) => {
    const positions = new Float32Array(line.coordinates.length * 3);
    line.coordinates.forEach((coordinate, index) => {
      const offset = index * 3;
      positions[offset] = lonToX(coordinate.longitude);
      positions[offset + 1] = depthToY(line.depthKm);
      positions[offset + 2] = latToZ(coordinate.latitude);
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({
      color: depthColorHex(line.depthKm),
      transparent: true,
      opacity: 0.6,
      depthTest: false,
      depthWrite: false,
    });
    const object = new THREE.Line(geometry, material);
    object.renderOrder = 5;
    group.add(object);
  });
}

function createLabelSprite(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (context !== null) {
    context.clearRect(0, 0, 128, 128);
    context.font = 'bold 72px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.lineWidth = 8;
    context.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    context.strokeText(text, 64, 66);
    context.fillStyle = '#165a8a';
    context.fillText(text, 64, 66);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.22, 0.22, 0.22);
  sprite.renderOrder = 20;
  return sprite;
}

function addNorthIndicator(scene: THREE.Scene): void {
  const origin = new THREE.Vector3(
    CRUST3D_WIDTH / 2 + 0.2,
    CRUST3D_TOP_Y + 0.03,
    CRUST3D_DEPTH / 2 - 0.25,
  );
  const arrow = new THREE.ArrowHelper(
    new THREE.Vector3(0, 0, -1),
    origin,
    0.55,
    0x165a8a,
    0.12,
    0.08,
  );
  scene.add(arrow);
  const label = createLabelSprite('N');
  label.position.set(origin.x, origin.y + 0.08, origin.z - 0.62);
  scene.add(label);
}

function addRegionBorder(scene: THREE.Scene): void {
  const halfWidth = CRUST3D_WIDTH / 2;
  const halfDepth = CRUST3D_DEPTH / 2;
  const y = CRUST3D_TOP_Y + 0.016;
  const points = [
    new THREE.Vector3(-halfWidth, y, -halfDepth),
    new THREE.Vector3(halfWidth, y, -halfDepth),
    new THREE.Vector3(halfWidth, y, halfDepth),
    new THREE.Vector3(-halfWidth, y, halfDepth),
    new THREE.Vector3(-halfWidth, y, -halfDepth),
  ];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: REGION_COLOR,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  scene.add(new THREE.Line(geometry, material));
}

function addDepthTicks(scene: THREE.Scene): void {
  const x = CRUST3D_WIDTH / 2 + 0.08;
  const z = CRUST3D_DEPTH / 2;
  const depths = [0, 100, 300, 700];
  depths.forEach((depth) => {
    const y = depthToY(depth);
    const tickLength = depth === 0 || depth === 700 ? 0.22 : 0.12;
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, y, z),
      new THREE.Vector3(x + tickLength, y, z),
    ]);
    const material = new THREE.LineBasicMaterial({
      color: '#5c6872',
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    scene.add(new THREE.Line(geometry, material));
  });
  const lineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(x, CRUST3D_TOP_Y, z),
    new THREE.Vector3(x, CRUST3D_BOTTOM_Y, z),
  ]);
  const lineMaterial = new THREE.LineBasicMaterial({
    color: '#5c6872',
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  scene.add(new THREE.Line(lineGeometry, lineMaterial));
}

export function Crust3DView({
  events,
  showPlateBoundaries,
  showSlab2,
  resetToken,
  selectedId,
  onSelectEvent,
}: Crust3DViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const quakeGroupRef = useRef<THREE.Group | null>(null);
  const selectionGroupRef = useRef<THREE.Group | null>(null);
  const quakePointsRef = useRef<THREE.Points | null>(null);
  const plateGroupRef = useRef<THREE.Group | null>(null);
  const slabGroupRef = useRef<THREE.Group | null>(null);
  const showPlateRef = useRef(showPlateBoundaries);
  const showSlabRef = useRef(showSlab2);
  const onSelectEventRef = useRef(onSelectEvent);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [contextLost, setContextLost] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    showPlateRef.current = showPlateBoundaries;
    if (plateGroupRef.current !== null) {
      plateGroupRef.current.visible = showPlateBoundaries;
    }
  }, [showPlateBoundaries]);

  useEffect(() => {
    showSlabRef.current = showSlab2;
    if (slabGroupRef.current !== null) {
      slabGroupRef.current.visible = showSlab2;
    }
  }, [showSlab2]);

  useEffect(() => {
    onSelectEventRef.current = onSelectEvent;
  }, [onSelectEvent]);

  useEffect(() => {
    if (quakeGroupRef.current !== null) {
      quakePointsRef.current = addEarthquakePoints(
        quakeGroupRef.current,
        events,
      );
    }
    if (selectionGroupRef.current !== null) {
      updateSelection(selectionGroupRef.current, events, selectedId);
    }
  }, [events, selectedId]);

  useEffect(() => {
    if (resetToken === 0 || cameraRef.current === null || controlsRef.current === null) {
      return;
    }
    cameraRef.current.position.copy(CAMERA_POSITION);
    controlsRef.current.target.copy(CAMERA_TARGET);
    controlsRef.current.update();
  }, [resetToken]);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }

    let cancelled = false;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch (error) {
      console.error('WebGL renderer initialization failed', error);
      setStatus('error');
      return;
    }

    setStatus('loading');
    setWarning(null);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = 'crust3d-canvas';
    renderer.domElement.setAttribute(
      'aria-label',
      '日本周辺の3D地殻ブロック。右ドラッグで回転、中ドラッグで移動、ホイールでズーム。',
    );
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#eef2f5');
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.copy(CAMERA_POSITION);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(CAMERA_TARGET);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.zoomToCursor = true;
    controls.minDistance = 2.2;
    controls.maxDistance = 20;
    controls.minPolarAngle = 0.05;
    controls.maxPolarAngle = Math.PI * 0.92;
    controls.rotateSpeed = 0.8;
    controls.panSpeed = 0.8;
    controls.zoomSpeed = 0.9;
    controls.mouseButtons = {
      LEFT: null,
      MIDDLE: THREE.MOUSE.PAN,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    controls.update();

    sceneRef.current = scene;
    cameraRef.current = camera;
    controlsRef.current = controls;

    const ambient = new THREE.AmbientLight(0xffffff, 1.7);
    const directional = new THREE.DirectionalLight(0xffffff, 1.8);
    directional.position.set(5, 8, 4);
    scene.add(ambient, directional);

    const blockGeometry = new THREE.BoxGeometry(
      CRUST3D_WIDTH,
      CRUST3D_HEIGHT,
      CRUST3D_DEPTH,
    );
    const blockMaterial = new THREE.MeshStandardMaterial({
      color: '#89939b',
      roughness: 0.95,
      metalness: 0,
    });
    const block = new THREE.Mesh(blockGeometry, blockMaterial);
    block.position.y = -CRUST3D_HEIGHT / 2;
    scene.add(block);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(blockGeometry),
      new THREE.LineBasicMaterial({ color: '#4f5b63' }),
    );
    edges.position.y = -CRUST3D_HEIGHT / 2;
    scene.add(edges);

    const topGeometry = new THREE.PlaneGeometry(
      CRUST3D_WIDTH,
      CRUST3D_DEPTH,
    );
    const topMaterial = new THREE.MeshStandardMaterial({
      color: '#dbe7ef',
      roughness: 0.92,
      metalness: 0,
    });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.rotation.x = -Math.PI / 2;
    top.position.y = CRUST3D_TOP_Y + 0.006;
    scene.add(top);

    const quakeGroup = new THREE.Group();
    const selectionGroup = new THREE.Group();
    const plateGroup = new THREE.Group();
    const slabGroup = new THREE.Group();
    plateGroup.visible = showPlateRef.current;
    slabGroup.visible = showSlabRef.current;
    scene.add(quakeGroup, selectionGroup, plateGroup, slabGroup);
    quakeGroupRef.current = quakeGroup;
    selectionGroupRef.current = selectionGroup;
    plateGroupRef.current = plateGroup;
    slabGroupRef.current = slabGroup;
    quakePointsRef.current = addEarthquakePoints(quakeGroup, events);
    updateSelection(selectionGroup, events, selectedId);

    addRegionBorder(scene);
    addDepthTicks(scene);
    addNorthIndicator(scene);

    const resize = (): void => {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const preventMiddleButtonDefault = (
      event: PointerEvent | MouseEvent,
    ): void => {
      if (event.button === 1) {
        event.preventDefault();
      }
    };

    const raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 0.12;
    const pointer = new THREE.Vector2();
    const handleClick = (event: MouseEvent): void => {
      if (event.button !== 0) {
        return;
      }
      const points = quakePointsRef.current;
      if (points === null) {
        return;
      }
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return;
      }
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObject(points, false);
      const hit = hits[0];
      if (hit === undefined || hit.index === undefined) {
        return;
      }
      const eventIds = points.userData.eventIds;
      if (!Array.isArray(eventIds)) {
        return;
      }
      const id = eventIds[hit.index];
      if (typeof id === 'string') {
        onSelectEventRef.current(id);
      }
    };

    const preventContextMenu = (event: Event): void => {
      event.preventDefault();
    };
    const preventWheelScroll = (event: WheelEvent): void => {
      event.preventDefault();
    };
    const resetView = (): void => {
      camera.position.copy(CAMERA_POSITION);
      controls.target.copy(CAMERA_TARGET);
      controls.update();
    };
    const handleDoubleClick = (): void => {
      resetView();
    };
    const animate = (): void => {
      controls.update();
      renderer.render(scene, camera);
    };
    const handleContextLost = (event: Event): void => {
      event.preventDefault();
      setContextLost(true);
      renderer.setAnimationLoop(null);
    };
    const handleContextRestored = (): void => {
      setContextLost(false);
      renderer.setAnimationLoop(animate);
    };
    renderer.domElement.addEventListener('click', handleClick);
    renderer.domElement.addEventListener(
      'pointerdown',
      preventMiddleButtonDefault,
      true,
    );
    renderer.domElement.addEventListener(
      'mousedown',
      preventMiddleButtonDefault,
      true,
    );
    renderer.domElement.addEventListener(
      'auxclick',
      preventMiddleButtonDefault,
      true,
    );
    renderer.domElement.addEventListener('contextmenu', preventContextMenu);
    renderer.domElement.addEventListener('wheel', preventWheelScroll, {
      passive: false,
    });
    renderer.domElement.addEventListener('dblclick', handleDoubleClick);
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener(
      'webglcontextrestored',
      handleContextRestored,
    );

    renderer.setAnimationLoop(animate);
    setStatus('ready');

    const loadOverlays = async (): Promise<void> => {
      const base = import.meta.env.BASE_URL;
      const [gsiResult, landResult, plateResult, slabResult] =
        await Promise.allSettled([
          createGsiCanvas(),
          fetchJson(`${base}geo/ne_110m_land.geojson`),
          fetchJson(`${base}geo/PB2002_boundaries.json`),
          fetchJson(`${base}geo/slab2_japan_depth_contours.geojson`),
        ]);
      if (cancelled) {
        return;
      }
      const warnings: string[] = [];
      let textureCanvas: HTMLCanvasElement | null = null;
      if (gsiResult.status === 'fulfilled') {
        textureCanvas = gsiResult.value;
      } else {
        console.error('GSI tiles failed', gsiResult.reason);
        warnings.push(
          `地理院タイルを取得できなかったため、Natural Earth を表示しています。${CRUST3D_GSI_ATTRIBUTION}`,
        );
        if (landResult.status === 'fulfilled') {
          textureCanvas = createLandCanvas(landResult.value);
        } else {
          console.error('Natural Earth land texture failed', landResult.reason);
          warnings.push('Natural Earth の陸地テクスチャも取得できませんでした。');
        }
      }
      if (textureCanvas !== null) {
        const texture = new THREE.CanvasTexture(textureCanvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        topMaterial.map = texture;
        topMaterial.color.set('#ffffff');
        topMaterial.needsUpdate = true;
      }
      if (plateResult.status === 'fulfilled') {
        addPlateLines(plateGroup, plateResult.value);
        plateGroup.visible = showPlateRef.current;
      } else {
        console.error('PB2002 overlay failed', plateResult.reason);
        warnings.push('PB2002 プレート境界を取得できませんでした。');
      }
      if (slabResult.status === 'fulfilled') {
        addSlabLines(slabGroup, slabResult.value);
        slabGroup.visible = showSlabRef.current;
      } else {
        console.error('Slab2 overlay failed', slabResult.reason);
        warnings.push('Slab2 等深線を取得できませんでした。');
      }
      if (warnings.length > 0) {
        setWarning(warnings.join(' '));
      }
    };
    void loadOverlays();

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.domElement.removeEventListener(
        'pointerdown',
        preventMiddleButtonDefault,
        true,
      );
      renderer.domElement.removeEventListener(
        'mousedown',
        preventMiddleButtonDefault,
        true,
      );
      renderer.domElement.removeEventListener(
        'auxclick',
        preventMiddleButtonDefault,
        true,
      );
      renderer.domElement.removeEventListener('contextmenu', preventContextMenu);
      renderer.domElement.removeEventListener('wheel', preventWheelScroll);
      renderer.domElement.removeEventListener('dblclick', handleDoubleClick);
      renderer.domElement.removeEventListener(
        'webglcontextlost',
        handleContextLost,
      );
      renderer.domElement.removeEventListener(
        'webglcontextrestored',
        handleContextRestored,
      );
      controls.dispose();
      renderer.setAnimationLoop(null);
      scene.traverse((object) => {
        if (
          object instanceof THREE.Mesh ||
          object instanceof THREE.Points ||
          object instanceof THREE.Line ||
          object instanceof THREE.Sprite ||
          object instanceof THREE.ArrowHelper
        ) {
          if (
            'geometry' in object &&
            object.geometry instanceof THREE.BufferGeometry
          ) {
            object.geometry.dispose();
          }
          const material = (object as THREE.Mesh).material;
          if (Array.isArray(material)) {
            material.forEach(disposeMaterial);
          } else if (material instanceof THREE.Material) {
            disposeMaterial(material);
          }
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      quakeGroupRef.current = null;
      quakePointsRef.current = null;
      selectionGroupRef.current = null;
      plateGroupRef.current = null;
      slabGroupRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="crust3d-container"
      role="application"
      aria-label="日本周辺3D地殻ブロック"
    >
      {status === 'loading' ? (
        <div className="crust3d-overlay">3D表示を準備中…</div>
      ) : null}
      {status === 'error' ? (
        <div className="crust3d-overlay crust3d-overlay-error">
          WebGL を初期化できませんでした。2D地図は引き続き利用できます。
        </div>
      ) : null}
      {contextLost ? (
        <div className="crust3d-overlay crust3d-overlay-error">
          WebGL コンテキストが失われました。タブを切り替えて再読み込みしてください。
        </div>
      ) : null}
      {warning !== null ? (
        <div className="crust3d-data-warning">{warning}</div>
      ) : null}
    </div>
  );
}
