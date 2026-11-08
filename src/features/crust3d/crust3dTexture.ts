import { JAPAN_REGION_BOUNDS } from '../../domain/geography/japanRegion';
import {
  CRUST3D_DEPTH,
  CRUST3D_WIDTH,
} from './crust3dStyle';

const SEA_COLOR = '#dbe7ef';
const LAND_COLOR = '#e8e3d5';
const LAND_BORDER_COLOR = '#9aa5ad';
const GRATICULE_COLOR = 'rgba(92, 104, 114, 0.16)';
const REGION_COLOR = '#165a8a';

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
    ((longitude - JAPAN_REGION_BOUNDS.minLongitude) /
      (JAPAN_REGION_BOUNDS.maxLongitude - JAPAN_REGION_BOUNDS.minLongitude)) *
    options.width;
  const y =
    ((JAPAN_REGION_BOUNDS.maxLatitude - latitude) /
      (JAPAN_REGION_BOUNDS.maxLatitude - JAPAN_REGION_BOUNDS.minLatitude)) *
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
 * Build a map-like texture for the top of the crust block from Natural Earth
 * land polygons. This is an equirectangular display texture, not a geodetic
 * projection. It carries no political boundaries or labels.
 */
export function createLandCanvas(data: unknown, width = 1536): HTMLCanvasElement {
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
