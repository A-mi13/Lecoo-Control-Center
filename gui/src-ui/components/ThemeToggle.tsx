import { useThemeStore, type ThemeMode } from '@/stores/theme';

const OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'auto', label: 'Auto' },
];

export function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  return (
    <div className="inline-flex gap-0.5 bg-bg-elev border border-border p-0.5 rounded-md">
      {OPTIONS.map((opt) => {
        const active = mode === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setMode(opt.value)}
            className={
              'px-3 py-1 text-[11px] font-mono uppercase tracking-wide rounded ' +
              (active
                ? 'bg-accent text-white'
                : 'text-mute hover:text-text')
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
