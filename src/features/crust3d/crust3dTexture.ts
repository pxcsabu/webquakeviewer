import { JAPAN_REGION_BOUNDS } from '../../domain/geography/japanRegion';
import {
  CRUST3D_DEPTH,
  CRUST3D_WIDTH,
  latToZ,
  lonToX,
} from './crust3dStyle';

const SEA_COLOR = '#dbe7ef';
const LAND_COLOR = '#e8e3d5';
const LAND_BORDER_COLOR = '#9aa5ad';
const GRATICULE_COLOR = 'rgba(92, 104, 114, 0.16)';
const REGION_COLOR = '#165a8a';

export const CRUST3D_GSI_ATTRIBUTION = '国土地理院 (地理院タイル)';
export const CRUST3D_GSI_ZOOM = 6;
export const CRUST3D_TEXTURE_WIDTH = 1536;

interface Projection {
  width: number;
  height: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function project(
  longitude: number,
  latitude: number,
  options: Projection,
): [number, number] {
  const x =
    ((lonToX(longitude) + CRUST3D_WIDTH / 2) / CRUST3D_WIDTH) *
    options.width;
  const y =
    ((latToZ(latitude) + CRUST3D_DEPTH / 2) / CRUST3D_DEPTH) *
    options.height;
  return [x, y];
}

function drawRing(
  context: CanvasRenderingContext2D,
  ring: unknown,
  options: Projection,
): void {
  if (!Array.isArray(ring) || ring.length < 3) {
    return;
  }
  let started = false;
  ring.forEach((coordinate) => {
    if (!Array.isArray(coordinate) || coordinate.length < 2) {
      return;
    }
    const longitude = coordinate[0];
    const latitude = coordinate[1];
    if (
      typeof longitude !== 'number' ||
      typeof latitude !== 'number' ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude)
    ) {
      return;
    }
    const [x, y] = project(longitude, latitude, options);
    if (!started) {
      context.moveTo(x, y);
      started = true;
    } else {
      context.lineTo(x, y);
    }
  });
  if (started) {
    context.closePath();
  }
}

function drawPolygon(
  context: CanvasRenderingContext2D,
  rings: unknown,
  options: Projection,
): void {
  if (!Array.isArray(rings)) {
    return;
  }
  context.beginPath();
  rings.forEach((ring) => drawRing(context, ring, options));
  context.fillStyle = LAND_COLOR;
  context.fill('evenodd');
  context.strokeStyle = LAND_BORDER_COLOR;
  context.lineWidth = 1;
  context.stroke();
}

function drawGraticule(
  context: CanvasRenderingContext2D,
  options: Projection,
): void {
  context.strokeStyle = GRATICULE_COLOR;
  context.lineWidth = 1;
  const step = 5;
  for (
    let longitude = Math.ceil(JAPAN_REGION_BOUNDS.minLongitude / step) * step;
    longitude <= JAPAN_REGION_BOUNDS.maxLongitude;
    longitude += step
  ) {
    const [x] = project(longitude, JAPAN_REGION_BOUNDS.minLatitude, options);
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, options.height);
    context.stroke();
  }
  for (
    let latitude = Math.ceil(JAPAN_REGION_BOUNDS.minLatitude / step) * step;
    latitude <= JAPAN_REGION_BOUNDS.maxLatitude;
    latitude += step
  ) {
    const [, y] = project(JAPAN_REGION_BOUNDS.minLongitude, latitude, options);
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(options.width, y);
    context.stroke();
  }
}

/**
 * Natural Earth fallback texture for the top of the crust block. It uses the
 * same Web Mercator projection as the GSI tile path so the geographic overlays
 * remain aligned whether the primary tiles load or not.
 */
export function createLandCanvas(
  data: unknown,
  width = CRUST3D_TEXTURE_WIDTH,
): HTMLCanvasElement {
  const height = Math.max(
    1,
    Math.round((width * CRUST3D_DEPTH) / CRUST3D_WIDTH),
  );
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context === null) {
    throw new Error('2D canvas context is unavailable');
  }
  const options: Projection = { width, height };

  context.fillStyle = SEA_COLOR;
  context.fillRect(0, 0, width, height);
  drawGraticule(context, options);

  if (isRecord(data) && Array.isArray(data.features)) {
    data.features.forEach((feature) => {
      if (!isRecord(feature) || !isRecord(feature.geometry)) {
        return;
      }
      const geometry = feature.geometry;
      if (geometry.type === 'Polygon' && Array.isArray(geometry.coordinates)) {
        drawPolygon(context, geometry.coordinates, options);
        return;
      }
      if (
        geometry.type === 'MultiPolygon' &&
        Array.isArray(geometry.coordinates)
      ) {
        geometry.coordinates.forEach((polygon) => {
          drawPolygon(context, polygon, options);
        });
      }
    });
  }

  context.strokeStyle = REGION_COLOR;
  context.lineWidth = 2;
  context.strokeRect(0.5, 0.5, width - 1, height - 1);

  return canvas;
}

function tileX(longitude: number, zoom: number): number {
  return ((longitude + 180) / 360) * 2 ** zoom;
}

function tileY(latitude: number, zoom: number): number {
  const radians = latitude * (Math.PI / 180);
  return (
    (1 -
      Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) /
    2 *
    2 ** zoom
  );
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`画像を取得できませんでした: ${url}`));
    image.src = url;
  });
}

/**
 * Build a GSI pale-tile texture for the top of the crust block.
 *
 * The requested extent is cropped from the tile mosaic, so the texture covers
 * exactly the operational Japan region. If any tile fails, the promise rejects
 * and the caller can fall back to Natural Earth.
 */
export async function createGsiCanvas(
  width = CRUST3D_TEXTURE_WIDTH,
  zoom = CRUST3D_GSI_ZOOM,
): Promise<HTMLCanvasElement> {
  const minLon = JAPAN_REGION_BOUNDS.minLongitude;
  const maxLon = JAPAN_REGION_BOUNDS.maxLongitude;
  const minLat = JAPAN_REGION_BOUNDS.minLatitude;
  const maxLat = JAPAN_REGION_BOUNDS.maxLatitude;
  const xMinFloat = tileX(minLon, zoom);
  const xMaxFloat = tileX(maxLon, zoom);
  const yMinFloat = tileY(maxLat, zoom);
  const yMaxFloat = tileY(minLat, zoom);
  const xMin = Math.floor(xMinFloat);
  const xMax = Math.ceil(xMaxFloat) - 1;
  const yMin = Math.floor(yMinFloat);
  const yMax = Math.ceil(yMaxFloat) - 1;
  const columns = xMax - xMin + 1;
  const rows = yMax - yMin + 1;
  if (columns <= 0 || rows <= 0 || columns * rows > 120) {
    throw new Error('地理院タイルの範囲が不正です。');
  }

  const tiles: Array<{ x: number; y: number }> = [];
  for (let x = xMin; x <= xMax; x += 1) {
    for (let y = yMin; y <= yMax; y += 1) {
      tiles.push({ x, y });
    }
  }
  const images = await Promise.all(
    tiles.map(({ x, y }) =>
      loadImage(
        `https://cyberjapandata.gsi.go.jp/xyz/pale/${zoom}/${x}/${y}.png`,
      ),
    ),
  );

  const tileSize = 256;
  const mosaic = document.createElement('canvas');
  mosaic.width = columns * tileSize;
  mosaic.height = rows * tileSize;
  const mosaicContext = mosaic.getContext('2d');
  if (mosaicContext === null) {
    throw new Error('2D canvas context is unavailable');
  }
  images.forEach((image, index) => {
    const tile = tiles[index];
    if (tile === undefined) {
      return;
    }
    mosaicContext.drawImage(
      image,
      (tile.x - xMin) * tileSize,
      (tile.y - yMin) * tileSize,
      tileSize,
      tileSize,
    );
  });

  const sourceX = (xMinFloat - xMin) * tileSize;
  const sourceY = (yMinFloat - yMin) * tileSize;
  const sourceWidth = (xMaxFloat - xMinFloat) * tileSize;
  const sourceHeight = (yMaxFloat - yMinFloat) * tileSize;
  const outputHeight = Math.max(
    1,
    Math.round((width * sourceHeight) / sourceWidth),
  );
  const output = document.createElement('canvas');
  output.width = width;
  output.height = outputHeight;
  const outputContext = output.getContext('2d');
  if (outputContext === null) {
    throw new Error('2D canvas context is unavailable');
  }
  outputContext.drawImage(
    mosaic,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    width,
    outputHeight,
  );
  return output;
}
