interface StatTileProps {
  label: string;
  value: string | number;
  unit?: string;
  history?: number[];
  variant?: 'default' | 'warn' | 'ok';
  color?: string;
}

export function StatTile({
  label,
  value,
  unit,
  history,
  variant = 'default',
  color = 'var(--color-accent)',
}: StatTileProps) {
  const valueClass =
    variant === 'warn'
      ? 'text-warn'
      : variant === 'ok'
        ? 'text-ok'
        : 'text-text-strong';

  return (
    <div className="bg-bg-elev border border-border rounded-xl px-4 py-3 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="text-[10px] uppercase tracking-widest font-semibold font-mono text-mute">
        {label}
      </div>
      <div
        className={`text-[26px] font-semibold tracking-tight tabular-nums ${valueClass} mt-1 font-mono`}
      >
        {value}
        {unit ? (
          <span className="text-sm text-mute font-normal ml-0.5">{unit}</span>
        ) : null}
      </div>
      {history && history.length > 1 ? (
        <Sparkline values={history} color={color} />
      ) : null}
    </div>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 18 - ((v - min) / range) * 16;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <svg
      viewBox="0 0 100 20"
      preserveAspectRatio="none"
      className="w-full h-4 mt-1.5"
      aria-hidden
    >
      <polyline fill="none" stroke={color} strokeWidth={1.2} points={points} />
    </svg>
  );
}
