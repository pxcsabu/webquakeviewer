import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { GeoPoint } from '../../analysis/geodesy/distance';
import {
  propertyLabel,
  propertyUnit,
  velocityValueAt,
  type VelocityModel,
  type VelocityProperty,
} from '../../domain/geophysics/velocityModel';
import {
  colorForVelocity,
  formatVelocityValue,
  velocityRange,
} from './velocityColors';

interface VelocitySliceProps {
  model: VelocityModel;
  depthIndex: number;
  property: VelocityProperty;
  profileStart: GeoPoint | null;
  profileEnd: GeoPoint | null;
  onProfileChange: (start: GeoPoint, end: GeoPoint) => void;
}

interface PlotRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Size {
  width: number;
  height: number;
}

const MARGIN = { left: 56, top: 18, right: 68, bottom: 42 };

export function VelocitySlice({
  model,
  depthIndex,
  property,
  profileStart,
  profileEnd,
  onProfileChange,
}: VelocitySliceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [dragging, setDragging] = useState(false);
  const plotRef = useRef<PlotRect | null>(null);
  const dragStartRef = useRef<GeoPoint | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry !== undefined) {
        setSize({
          width: Math.max(320, Math.floor(entry.contentRect.width)),
          height: Math.max(320, Math.floor(entry.contentRect.height)),
        });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || size.width === 0 || size.height === 0) {
      return;
    }
    const ratio = Math.min(window.devicePixelRatio, 2);
    canvas.width = Math.floor(size.width * ratio);
    canvas.height = Math.floor(size.height * ratio);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    const context = canvas.getContext('2d');
    if (context === null) {
      return;
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, size.width, size.height);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, size.width, size.height);

    const plot: PlotRect = {
      left: MARGIN.left,
      top: MARGIN.top,
      width: Math.max(1, size.width - MARGIN.left - MARGIN.right),
      height: Math.max(1, size.height - MARGIN.top - MARGIN.bottom),
    };
    plotRef.current = plot;
    const { axes } = model;
    const count = axes.lonCount * axes.latCount;
    const offset = depthIndex * count;
    const slice = new Float32Array(count);
    for (let index = 0; index < count; index += 1) {
      slice[index] = velocityValueAt(model, property, offset + index);
    }
    const range = velocityRange(slice);
    const image = context.createImageData(axes.lonCount, axes.latCount);
    for (let latIndex = 0; latIndex < axes.latCount; latIndex += 1) {
      const imageRow = axes.latCount - 1 - latIndex;
      for (let lonIndex = 0; lonIndex < axes.lonCount; lonIndex += 1) {
        const value = slice[latIndex * axes.lonCount + lonIndex];
        const color = colorForVelocity(
          value ?? Number.NaN,
          range,
        );
        const pixel = (imageRow * axes.lonCount + lonIndex) * 4;
        image.data[pixel] = color[0];
        image.data[pixel + 1] = color[1];
        image.data[pixel + 2] = color[2];
        image.data[pixel + 3] = color[3];
      }
    }
    const offscreen = document.createElement('canvas');
    offscreen.width = axes.lonCount;
    offscreen.height = axes.latCount;
    const offscreenContext = offscreen.getContext('2d');
    if (offscreenContext === null) {
      return;
    }
    offscreenContext.putImageData(image, 0, 0);
    context.imageSmoothingEnabled = true;
    context.drawImage(
      offscreen,
      plot.left,
      plot.top,
      plot.width,
      plot.height,
    );

    context.strokeStyle = '#cfd7de';
    context.lineWidth = 1;
    context.strokeRect(plot.left, plot.top, plot.width, plot.height);

    context.fillStyle = '#5c6872';
    context.font = '10px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'top';
    const lonSpan = (axes.lons[axes.lonCount - 1] ?? 150) - (axes.lons[0] ?? 120);
    const latSpan = (axes.lats[axes.latCount - 1] ?? 48) - (axes.lats[0] ?? 20);
    const lonTicks = 7;
    for (let tick = 0; tick <= lonTicks; tick += 1) {
      const ratio = tick / lonTicks;
      const x = plot.left + ratio * plot.width;
      const value = (axes.lons[0] ?? 120) + ratio * lonSpan;
      context.fillText(`${value.toFixed(0)}°E`, x, plot.top + plot.height + 8);
    }
    const latTicks = 7;
    context.textAlign = 'right';
    context.textBaseline = 'middle';
    for (let tick = 0; tick <= latTicks; tick += 1) {
      const ratio = tick / latTicks;
      const y = plot.top + ratio * plot.height;
      const value = (axes.lats[axes.latCount - 1] ?? 48) - ratio * latSpan;
      context.fillText(`${value.toFixed(0)}°N`, plot.left - 7, y);
    }

    const legendWidth = 12;
    const legendX = size.width - MARGIN.right + 18;
    const legendTop = plot.top + 8;
    const legendHeight = Math.max(60, plot.height - 28);
    for (let pixel = 0; pixel < legendHeight; pixel += 1) {
      const ratio = 1 - pixel / legendHeight;
      const value = range.min + ratio * (range.max - range.min);
      const color = colorForVelocity(value, range);
      context.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
      context.fillRect(legendX, legendTop + pixel, legendWidth, 1);
    }
    context.strokeStyle = '#9aa5ad';
    context.strokeRect(legendX, legendTop, legendWidth, legendHeight);
    context.fillStyle = '#1d242b';
    context.font = '10px sans-serif';
    context.textAlign = 'left';
    context.textBaseline = 'bottom';
    context.fillText(
      formatVelocityValue(range.max),
      legendX + legendWidth + 5,
      legendTop + 4,
    );
    context.textBaseline = 'top';
    context.fillText(
      formatVelocityValue(range.min),
      legendX + legendWidth + 5,
      legendTop + legendHeight - 4,
    );
    context.fillStyle = '#5c6872';
    context.textAlign = 'left';
    context.textBaseline = 'top';
    context.fillText(
      `${propertyLabel(property)} [${propertyUnit(property)}]`,
      plot.left,
      2,
    );

    const toPixel = (point: GeoPoint): [number, number] => [
      plot.left +
        ((point.longitude - (axes.lons[0] ?? 120)) / lonSpan) * plot.width,
      plot.top +
        (1 -
          (point.latitude - (axes.lats[0] ?? 20)) / latSpan) *
          plot.height,
    ];
    if (profileStart !== null && profileEnd !== null) {
      const [x1, y1] = toPixel(profileStart);
      const [x2, y2] = toPixel(profileEnd);
      context.strokeStyle = '#111827';
      context.lineWidth = 2;
      context.setLineDash([5, 3]);
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.stroke();
      context.setLineDash([]);
      context.fillStyle = '#111827';
      context.beginPath();
      context.arc(x1, y1, 3, 0, Math.PI * 2);
      context.arc(x2, y2, 3, 0, Math.PI * 2);
      context.fill();
    }
  }, [model, depthIndex, property, profileStart, profileEnd, size]);

  const toGeoPoint = (event: PointerEvent<HTMLCanvasElement>): GeoPoint | null => {
    const plot = plotRef.current;
    const canvas = canvasRef.current;
    if (plot === null || canvas === null) {
      return null;
    }
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (
      x < plot.left ||
      x > plot.left + plot.width ||
      y < plot.top ||
      y > plot.top + plot.height
    ) {
      return null;
    }
    const { axes } = model;
    const lonSpan =
      (axes.lons[axes.lonCount - 1] ?? 150) - (axes.lons[0] ?? 120);
    const latSpan =
      (axes.lats[axes.latCount - 1] ?? 48) - (axes.lats[0] ?? 20);
    return {
      longitude: (axes.lons[0] ?? 120) + ((x - plot.left) / plot.width) * lonSpan,
      latitude:
        (axes.lats[axes.latCount - 1] ?? 48) -
        ((y - plot.top) / plot.height) * latSpan,
    };
  };

  const handlePointerDown = (
    event: PointerEvent<HTMLCanvasElement>,
  ): void => {
    const point = toGeoPoint(event);
    if (point === null) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = point;
    setDragging(true);
    onProfileChange(point, point);
  };

  const handlePointerMove = (
    event: PointerEvent<HTMLCanvasElement>,
  ): void => {
    if (!dragging || dragStartRef.current === null) {
      return;
    }
    const point = toGeoPoint(event);
    if (point !== null) {
      onProfileChange(dragStartRef.current, point);
    }
  };

  const finishDrag = (event: PointerEvent<HTMLCanvasElement>): void => {
    if (dragging) {
      const point = toGeoPoint(event);
      if (point !== null && dragStartRef.current !== null) {
        onProfileChange(dragStartRef.current, point);
      }
    }
    setDragging(false);
    dragStartRef.current = null;
  };

  return (
    <div className="velocity-slice">
      <div ref={containerRef} className="velocity-canvas-frame">
        <canvas
          ref={canvasRef}
          aria-label={`深さ ${model.axes.depths[depthIndex] ?? ''} km の${propertyLabel(property)}分布`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
        />
      </div>
      <p className="velocity-canvas-note">
        ドラッグで断面線を選択。線は指定した2点間の断面図に使われます。
      </p>
    </div>
  );
}
