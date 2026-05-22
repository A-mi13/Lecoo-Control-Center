import { useEffect, useMemo, useRef, useState } from 'react';
import UPlotReact from 'uplot-react';
import type uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import type { TelemetrySample } from '@/stores/telemetry';

interface Props {
  samples: TelemetrySample[];
  rangeSeconds: number;
  height?: number;
}

export function TempChart({ samples, rangeSeconds, height = 200 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWidth(Math.max(1, Math.floor(w)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const data = useMemo<uPlot.AlignedData>(() => {
    const nowSec = Date.now() / 1000;
    const cutoff = nowSec - rangeSeconds;
    const filtered = samples.filter((s) => s.timestampMs / 1000 >= cutoff);
    const x = filtered.map((s) => s.timestampMs / 1000);
    const cpu = filtered.map((s) => s.cpuTempC);
    const sys = filtered.map((s) => s.sysTempC);
    return [x, cpu, sys];
  }, [samples, rangeSeconds]);

  const options = useMemo<uPlot.Options>(
    () => ({
      width: width || 600,
      height,
      cursor: { drag: { x: false, y: false } },
      legend: { show: false },
      scales: { x: { time: true }, y: { auto: true } },
      axes: [
        {
          stroke: 'var(--color-mute)',
          grid: { stroke: 'var(--color-border)', width: 0.5 },
        },
        {
          stroke: 'var(--color-mute)',
          grid: { stroke: 'var(--color-border)', width: 0.5 },
        },
      ],
      series: [
        {},
        {
          label: 'CPU',
          stroke: 'var(--color-warn)',
          width: 2,
          fill: 'rgba(240,136,62,0.18)',
        },
        {
          label: 'System',
          stroke: 'var(--color-accent)',
          width: 2,
          fill: 'rgba(88,166,255,0.12)',
        },
      ],
    }),
    [width, height],
  );

  return (
    <div ref={containerRef} className="w-full">
      {width > 0 ? <UPlotReact options={options} data={data} /> : null}
    </div>
  );
}
