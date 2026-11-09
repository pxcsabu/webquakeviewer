import { useEffect, useMemo, useRef, useState } from 'react';
import type { GeoPoint } from '../../analysis/geodesy/distance';
import {
  propertyLabel,
  propertyUnit,
  sampleVelocityProfile,
  type VelocityModel,
  type VelocityProperty,
} from '../../domain/geophysics/velocityModel';
import {
  colorForVelocity,
  formatVelocityValue,
} from './velocityColors';

interface VelocitySectionProps {
  model: VelocityModel;
  property: VelocityProperty;
  start: GeoPoint | null;
  end: GeoPoint | null;
}

interface Size {
  width: number;
  height: number;
}

const MARGIN = { left: 56, top: 18, right: 66, bottom: 42 };

export function VelocitySection({
  model,
  property,
  start,
  end,
}: VelocitySectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const profile = useMemo(() => {
    if (start === null || end === null) {
      return null;
    }
    return sampleVelocityProfile(model, start, end, property, 200);
  }, [model, property, start, end]);

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
          height: Math.max(260, Math.floor(entry.contentRect.height)),
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

    const plot = {
      left: MARGIN.left,
      top: MARGIN.top,
      width: Math.max(1, size.width - MARGIN.left - MARGIN.right),
      height: Math.max(1, size.height - MARGIN.top - MARGIN.bottom),
    };

    if (profile === null) {
      context.fillStyle = '#5c6872';
      context.font = '12px sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(
        '左の深さスライス上で断面線をドラッグしてください。',
        size.width / 2,
        size.height / 2,
      );
      return;
    }

    const { axes } = model;
    const image = context.createImageData(profile.sampleCount, profile.depthCount);
    for (let depthIndex = 0; depthIndex < profile.depthCount; depthIndex += 1) {
      for (let sampleIndex = 0; sampleIndex < profile.sampleCount; sampleIndex += 1) {
        const value = profile.values[depthIndex * profile.sampleCount + sampleIndex];
        const color = colorForVelocity(
          value ?? Number.NaN,
          { min: profile.min, max: profile.max },
        );
        const pixel = (depthIndex * profile.sampleCount + sampleIndex) * 4;
        image.data[pixel] = color[0];
        image.data[pixel + 1] = color[1];
        image.data[pixel + 2] = color[2];
        image.data[pixel + 3] = color[3];
      }
    }
    const offscreen = document.createElement('canvas');
    offscreen.width = profile.sampleCount;
    offscreen.height = profile.depthCount;
    const offscreenContext = offscreen.getContext('2d');
    if (offscreenContext === null) {
      return;
    }
    offscreenContext.putImageData(image, 0, 0);
    context.imageSmoothingEnabled = true;
    context.drawImage(offscreen, plot.left, plot.top, plot.width, plot.height);

    context.strokeStyle = '#cfd7de';
    context.strokeRect(plot.left, plot.top, plot.width, plot.height);

    const maxDistance = profile.distancesKm[profile.distancesKm.length - 1] ?? 0;
    const minDepth = axes.depths[0] ?? 0;
    const maxDepth = axes.depths[axes.depthCount - 1] ?? 400;
    context.fillStyle = '#5c6872';
    context.font = '10px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'top';
    for (let tick = 0; tick <= 5; tick += 1) {
      const ratio = tick / 5;
      const x = plot.left + ratio * plot.width;
      context.fillText(
        `${Math.round(maxDistance * ratio)} km`,
        x,
        plot.top + plot.height + 8,
      );
    }
    context.textAlign = 'right';
    context.textBaseline = 'middle';
    for (let tick = 0; tick <= 5; tick += 1) {
      const ratio = tick / 5;
      const y = plot.top + ratio * plot.height;
      const depth = minDepth + (maxDepth - minDepth) * ratio;
      context.fillText(`${Math.round(depth)} km`, plot.left - 7, y);
    }
    context.fillStyle = '#1d242b';
    context.textAlign = 'left';
    context.textBaseline = 'top';
    context.font = '11px sans-serif';
    context.fillText(
      `${propertyLabel(property)} [${propertyUnit(property)}]`,
      plot.left,
      2,
    );

    const legendX = size.width - MARGIN.right + 16;
    const legendTop = plot.top + 8;
    const legendHeight = Math.max(60, plot.height - 28);
    for (let pixel = 0; pixel < legendHeight; pixel += 1) {
      const ratio = 1 - pixel / legendHeight;
      const value = profile.min + ratio * (profile.max - profile.min);
      const color = colorForVelocity(value, {
        min: profile.min,
        max: profile.max,
      });
      context.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
      context.fillRect(legendX, legendTop + pixel, 12, 1);
    }
    context.strokeStyle = '#9aa5ad';
    context.strokeRect(legendX, legendTop, 12, legendHeight);
    context.fillStyle = '#1d242b';
    context.textAlign = 'left';
    context.textBaseline = 'bottom';
    context.fillText(
      formatVelocityValue(profile.max),
      legendX + 17,
      legendTop + 4,
    );
    context.textBaseline = 'top';
    context.fillText(
      formatVelocityValue(profile.min),
      legendX + 17,
      legendTop + legendHeight - 4,
    );
  }, [model, profile, property, size]);

  return (
    <div className="velocity-section">
      <div ref={containerRef} className="velocity-section-frame">
        <canvas
          ref={canvasRef}
          aria-label={
            start !== null && end !== null
              ? '速度構造の断面図'
              : '速度構造の断面図（未選択）'
          }
        />
      </div>
      {start !== null && end !== null ? (
        <p className="velocity-canvas-note">
          断面: {start.latitude.toFixed(2)}°N, {start.longitude.toFixed(2)}
          °E → {end.latitude.toFixed(2)}°N, {end.longitude.toFixed(2)}°E
        </p>
      ) : null}
    </div>
  );
}
