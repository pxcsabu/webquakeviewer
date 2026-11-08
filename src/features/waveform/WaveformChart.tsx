import { useEffect, useRef, useState } from 'react';
import type { WaveformSample } from '../../domain/waveform/types';
import { downsampleForDisplay } from './processing';

interface WaveformChartProps {
  samples: readonly WaveformSample[];
  units: string;
  startTimeMs: number;
}

interface ChartSize {
  width: number;
  height: number;
}

function formatAxisValue(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  const absolute = Math.abs(value);
  if (absolute >= 1000) {
    return value.toExponential(1);
  }
  if (absolute >= 10) {
    return value.toFixed(1);
  }
  return value.toFixed(3);
}

export function WaveformChart({
  samples,
  units,
  startTimeMs,
}: WaveformChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<ChartSize>({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry === undefined) {
        return;
      }
      setSize({
        width: Math.max(1, Math.floor(entry.contentRect.width)),
        height: Math.max(1, Math.floor(entry.contentRect.height)),
      });
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
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

    const padding = { top: 26, right: 14, bottom: 26, left: 58 };
    const plotWidth = Math.max(1, size.width - padding.left - padding.right);
    const plotHeight = Math.max(1, size.height - padding.top - padding.bottom);

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, size.width, size.height);

    if (samples.length === 0) {
      context.fillStyle = '#5c6872';
      context.font = '12px sans-serif';
      context.textAlign = 'center';
      context.fillText('波形データがありません。', size.width / 2, size.height / 2);
      return;
    }

    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    samples.forEach((sample) => {
      min = Math.min(min, sample.amplitude);
      max = Math.max(max, sample.amplitude);
    });
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      min = -1;
      max = 1;
    }
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const range = max - min;
    const paddedMin = min - range * 0.08;
    const paddedMax = max + range * 0.08;

    const start = samples[0]?.timeMs ?? startTimeMs;
    const end = samples[samples.length - 1]?.timeMs ?? startTimeMs;
    const duration = Math.max(0, end - start);

    const xForTime = (timeMs: number): number =>
      padding.left + (duration === 0 ? 0 : ((timeMs - start) / duration) * plotWidth);
    const yForAmplitude = (amplitude: number): number =>
      padding.top + ((paddedMax - amplitude) / (paddedMax - paddedMin)) * plotHeight;

    context.strokeStyle = '#e1e6ea';
    context.lineWidth = 1;
    context.font = '10px sans-serif';
    context.fillStyle = '#5c6872';
    context.textAlign = 'right';
    context.textBaseline = 'middle';
    for (let index = 0; index <= 4; index += 1) {
      const value = paddedMax - ((paddedMax - paddedMin) * index) / 4;
      const y = padding.top + (plotHeight * index) / 4;
      context.beginPath();
      context.moveTo(padding.left, y);
      context.lineTo(padding.left + plotWidth, y);
      context.stroke();
      context.fillText(formatAxisValue(value), padding.left - 7, y);
    }

    const zeroY = yForAmplitude(0);
    if (zeroY >= padding.top && zeroY <= padding.top + plotHeight) {
      context.strokeStyle = '#9aa5ad';
      context.beginPath();
      context.moveTo(padding.left, zeroY);
      context.lineTo(padding.left + plotWidth, zeroY);
      context.stroke();
    }

    const buckets = downsampleForDisplay(samples, Math.max(2, Math.floor(plotWidth)));
    context.strokeStyle = '#165a8a';
    context.lineWidth = 1.2;
    buckets.forEach((bucket) => {
      const x = xForTime(bucket.timeMs);
      context.beginPath();
      context.moveTo(x, yForAmplitude(bucket.max));
      context.lineTo(x, yForAmplitude(bucket.min));
      context.stroke();
    });

    context.strokeStyle = '#cfd7de';
    context.beginPath();
    context.moveTo(padding.left, padding.top);
    context.lineTo(padding.left, padding.top + plotHeight);
    context.lineTo(padding.left + plotWidth, padding.top + plotHeight);
    context.stroke();

    context.fillStyle = '#5c6872';
    context.font = '10px sans-serif';
    context.textBaseline = 'top';
    context.textAlign = 'left';
    context.fillText(`0 s`, padding.left, padding.top + plotHeight + 7);
    context.textAlign = 'right';
    context.fillText(
      `${(duration / 1000).toFixed(2)} s`,
      padding.left + plotWidth,
      padding.top + plotHeight + 7,
    );
    context.textAlign = 'left';
    context.fillStyle = '#1d242b';
    context.font = '11px sans-serif';
    context.fillText(units, padding.left, 8);
    context.fillStyle = '#5c6872';
    context.textAlign = 'right';
    context.fillText(
      `${samples.length.toLocaleString('ja-JP')} samples`,
      padding.left + plotWidth,
      8,
    );
  }, [samples, size, startTimeMs, units]);

  return (
    <div ref={containerRef} className="waveform-chart">
      <canvas ref={canvasRef} aria-label="波形時系列グラフ" />
    </div>
  );
}
