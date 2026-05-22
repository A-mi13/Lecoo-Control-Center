import type { ReactNode } from 'react';

interface Props {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Card({ title, action, children, className }: Props) {
  return (
    <section
      className={
        'relative bg-bg-elev border border-border rounded-xl p-4 ' +
        'before:absolute before:inset-x-0 before:top-0 before:h-px ' +
        'before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent ' +
        'before:pointer-events-none ' +
        (className ?? '')
      }
    >
      {(title !== undefined || action !== undefined) && (
        <header className="flex items-center justify-between mb-3">
          {title !== undefined ? (
            <span className="text-[11px] font-mono uppercase tracking-widest text-mute">
              {title}
            </span>
          ) : (
            <span />
          )}
          {action ? <div>{action}</div> : null}
        </header>
      )}
      {children}
    </section>
  );
}
