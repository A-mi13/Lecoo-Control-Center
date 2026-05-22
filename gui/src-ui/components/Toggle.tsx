interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export function Toggle({ checked, onChange, disabled, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={
        'relative h-[22px] w-[38px] rounded-full border transition-colors ' +
        (checked
          ? 'bg-accent border-accent shadow-[0_0_8px_var(--color-accent)]'
          : 'bg-bg border-border') +
        ' disabled:opacity-50'
      }
    >
      <span
        className={
          'absolute top-[2px] h-[16px] w-[16px] rounded-full bg-white shadow transition-all ' +
          (checked ? 'left-[18px]' : 'left-[2px]')
        }
      />
    </button>
  );
}
