interface Props {
  title: string;
  subtitle?: string;
}

export function PagePlaceholder({ title, subtitle = 'placeholder · wired in later phases' }: Props) {
  return (
    <div className="text-text">
      <h1 className="text-2xl font-semibold text-text-strong tracking-tight">{title}</h1>
      <p className="text-xs text-mute font-mono mt-1">{subtitle}</p>
    </div>
  );
}
