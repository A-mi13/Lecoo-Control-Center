type SegmentValue = string | number;

interface Option<T extends SegmentValue> {
  label: string;
  value: T;
}

interface Props<T extends SegmentValue> {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function Segment<T extends SegmentValue>({
  options,
  value,
  onChange,
  disabled,
  size = 'md',
}: Props<T>) {
  const px = size === 'sm' ? 'px-3 py-1' : 'px-3.5 py-1.5';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-[11px]';

  return (
    <div className="inline-flex gap-0.5 bg-bg border border-border p-0.5 rounded-lg">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            disabled={disabled}
            className={
              `${px} ${textSize} font-medium rounded-md font-mono tracking-wide uppercase transition ` +
              (active
                ? 'bg-accent text-white shadow-md'
                : 'text-mute hover:text-text disabled:opacity-50')
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
