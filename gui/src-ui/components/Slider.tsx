interface Props {
  label?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
  onCommit?: (v: number) => void;
  unit?: string;
  disabled?: boolean;
}

export function Slider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  onCommit,
  unit,
  disabled,
}: Props) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return (
    <div className="flex items-center gap-3">
      {label ? (
        <span className="text-[11px] font-mono uppercase tracking-widest text-mute w-16 shrink-0">
          {label}
        </span>
      ) : null}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={() => onCommit?.(value)}
        onKeyUp={() => onCommit?.(value)}
        className="lc-slider flex-1 disabled:opacity-50"
        style={{ ['--lc-slider-pct' as const]: pct } as React.CSSProperties}
        aria-label={label}
      />
      <span className="text-xs font-mono text-text-strong tabular-nums w-14 text-right">
        {value}
        {unit ? <span className="text-mute ml-0.5">{unit}</span> : null}
      </span>
    </div>
  );
}
