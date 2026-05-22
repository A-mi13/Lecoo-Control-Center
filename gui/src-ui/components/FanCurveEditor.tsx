import { useEffect, useMemo, useRef, useState } from 'react';
import {
  clampPoint,
  pwmAt,
  pwmToSvg,
  sortPoints,
  svgToPwm,
  svgToTemp,
  tempToSvg,
  type CurvePoint,
} from './FanCurveEditor.helpers';

interface Props {
  points: CurvePoint[];
  onChange: (points: CurvePoint[]) => void;
  onCommit?: (points: CurvePoint[]) => void;
  currentTempC?: number | null;
  height?: number;
  disabled?: boolean;
}

const PAD = { top: 16, right: 16, bottom: 28, left: 36 };

const X_TICKS = [0, 20, 40, 60, 80, 100];
const Y_TICKS = [0, 25, 50, 75, 100];

export function FanCurveEditor({
  points,
  onChange,
  onCommit,
  currentTempC,
  height = 280,
  disabled,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [outerW, setOuterW] = useState(700);
  const [dragging, setDragging] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.max(360, Math.floor(entries[0]?.contentRect.width ?? 0));
      setOuterW(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const innerW = Math.max(1, outerW - PAD.left - PAD.right);
  const innerH = Math.max(1, height - PAD.top - PAD.bottom);

  const sorted = useMemo(() => sortPoints(points), [points]);

  // Build the area + line path.
  const polylinePoints = sorted
    .map((p) => `${tempToSvg(p.temp_c, innerW)},${pwmToSvg(p.pwm, innerH)}`)
    .join(' ');

  const areaPath = (() => {
    if (sorted.length === 0) return '';
    const segs = sorted
      .map(
        (p, i) =>
          `${i === 0 ? 'M' : 'L'} ${tempToSvg(p.temp_c, innerW).toFixed(2)} ${pwmToSvg(p.pwm, innerH).toFixed(2)}`,
      )
      .join(' ');
    const startX = tempToSvg(sorted[0].temp_c, innerW).toFixed(2);
    const endX = tempToSvg(sorted[sorted.length - 1].temp_c, innerW).toFixed(2);
    return `${segs} L ${endX} ${innerH} L ${startX} ${innerH} Z`;
  })();

  function svgEventToInner(evt: React.PointerEvent<SVGElement>) {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    const x = evt.clientX - rect.left - PAD.left;
    const y = evt.clientY - rect.top - PAD.top;
    return { x: Math.max(0, Math.min(innerW, x)), y: Math.max(0, Math.min(innerH, y)) };
  }

  function handleSurfaceDoubleClick(evt: React.MouseEvent<SVGRectElement>) {
    if (disabled) return;
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    const x = evt.clientX - rect.left - PAD.left;
    const y = evt.clientY - rect.top - PAD.top;
    const np: CurvePoint = clampPoint({
      temp_c: Math.round(svgToTemp(x, innerW)),
      pwm: Math.round(svgToPwm(y, innerH)),
    });
    const next = sortPoints([...points, np]);
    onChange(next);
    onCommit?.(next);
  }

  function handlePointDown(idx: number) {
    if (disabled) return;
    setDragging(idx);
  }

  function handleMove(evt: React.PointerEvent<SVGElement>) {
    if (dragging === null) return;
    const { x, y } = svgEventToInner(evt);
    const next = points.map((p, i) =>
      i === dragging
        ? clampPoint({
            temp_c: svgToTemp(x, innerW),
            pwm: svgToPwm(y, innerH),
          })
        : p,
    );
    onChange(next);
  }

  function handleUp() {
    if (dragging === null) return;
    setDragging(null);
    const next = sortPoints(points);
    onChange(next);
    onCommit?.(next);
  }

  function handlePointContext(evt: React.MouseEvent<SVGCircleElement>, idx: number) {
    evt.preventDefault();
    if (disabled) return;
    if (points.length <= 2) return;
    const next = points.filter((_, i) => i !== idx);
    onChange(next);
    onCommit?.(next);
  }

  const dangerY = pwmToSvg(0, innerH); // bottom
  const dangerStart = tempToSvg(80, innerW);

  const cursorX = currentTempC != null ? tempToSvg(Math.max(0, Math.min(100, currentTempC)), innerW) : null;
  const cursorPwm = currentTempC != null ? pwmAt(sorted, currentTempC) : null;
  const cursorY = cursorPwm != null ? pwmToSvg(cursorPwm, innerH) : null;

  return (
    <div ref={wrapRef} className="w-full select-none">
      <svg
        ref={svgRef}
        width={outerW}
        height={height}
        viewBox={`0 0 ${outerW} ${height}`}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerLeave={handleUp}
        className="block"
        aria-label="Fan curve editor"
      >
        <g transform={`translate(${PAD.left} ${PAD.top})`}>
          {/* Danger zone above 80°C */}
          <rect
            x={dangerStart}
            y={0}
            width={innerW - dangerStart}
            height={dangerY}
            fill="rgba(240,136,62,0.08)"
          />

          {/* Grid + ticks */}
          {Y_TICKS.map((p) => (
            <g key={`y-${p}`}>
              <line
                x1={0}
                x2={innerW}
                y1={pwmToSvg(p, innerH)}
                y2={pwmToSvg(p, innerH)}
                stroke="var(--color-border)"
                strokeWidth={0.6}
              />
              <text
                x={-8}
                y={pwmToSvg(p, innerH)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={10}
                fill="var(--color-mute)"
                fontFamily="JetBrains Mono, monospace"
              >
                {p}%
              </text>
            </g>
          ))}
          {X_TICKS.map((tp) => (
            <g key={`x-${tp}`}>
              <line
                x1={tempToSvg(tp, innerW)}
                x2={tempToSvg(tp, innerW)}
                y1={0}
                y2={innerH}
                stroke="var(--color-border)"
                strokeWidth={0.6}
              />
              <text
                x={tempToSvg(tp, innerW)}
                y={innerH + 16}
                textAnchor="middle"
                fontSize={10}
                fill="var(--color-mute)"
                fontFamily="JetBrains Mono, monospace"
              >
                {tp}°
              </text>
            </g>
          ))}

          {/* Curve area + line */}
          <path d={areaPath} fill="rgba(88,166,255,0.14)" stroke="none" />
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={2}
          />

          {/* Live temp cursor */}
          {cursorX != null && cursorY != null && (
            <g>
              <line
                x1={cursorX}
                x2={cursorX}
                y1={0}
                y2={innerH}
                stroke="var(--color-warn)"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <circle
                cx={cursorX}
                cy={cursorY}
                r={5}
                fill="var(--color-warn)"
                stroke="var(--color-bg-elev)"
                strokeWidth={2}
              />
            </g>
          )}

          {/* Capture surface for double-click add */}
          <rect
            x={0}
            y={0}
            width={innerW}
            height={innerH}
            fill="transparent"
            onDoubleClick={handleSurfaceDoubleClick}
            style={{ cursor: disabled ? 'not-allowed' : 'crosshair' }}
          />

          {/* Control points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={tempToSvg(p.temp_c, innerW)}
              cy={pwmToSvg(p.pwm, innerH)}
              r={6}
              fill="var(--color-bg-elev)"
              stroke="var(--color-accent)"
              strokeWidth={2}
              onPointerDown={() => handlePointDown(i)}
              onContextMenu={(e) => handlePointContext(e, i)}
              style={{ cursor: disabled ? 'not-allowed' : 'grab' }}
            />
          ))}
        </g>
      </svg>

      <div className="text-[10px] font-mono text-mute mt-1 px-2">
        double-click to add · right-click point to remove (min 2) · drag to move
      </div>
    </div>
  );
}
