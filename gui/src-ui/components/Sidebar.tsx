import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';

type IconKind =
  | 'overview'
  | 'fans'
  | 'power'
  | 'battery'
  | 'keyboard'
  | 'led'
  | 'settings';

interface NavItem {
  to: string;
  icon: IconKind;
  label: string;
}

export function Sidebar() {
  const { t } = useTranslation();

  const hardware: NavItem[] = [
    { to: '/fans', icon: 'fans', label: t('nav.fans') },
    { to: '/power', icon: 'power', label: t('nav.power') },
    { to: '/battery', icon: 'battery', label: t('nav.battery') },
  ];

  const lighting: NavItem[] = [
    { to: '/keyboard', icon: 'keyboard', label: t('nav.keyboard') },
    { to: '/led', icon: 'led', label: t('nav.led') },
  ];

  return (
    <aside className="w-[220px] shrink-0 bg-bg-sidebar border-r border-border flex flex-col">
      <div className="px-5 py-5 border-b border-border">
        <div className="text-[11px] font-mono uppercase tracking-widest text-mute">lecoo</div>
        <div className="text-sm font-semibold text-text-strong mt-0.5">{t('app.name')}</div>
      </div>

      <nav className="flex-1 px-2 py-3 flex flex-col gap-4">
        <NavItemRow to="/" icon="overview" label={t('nav.overview')} end />
        <NavGroup title={t('nav.hardware')} items={hardware} />
        <NavGroup title={t('nav.lighting')} items={lighting} />
      </nav>

      <div className="px-2 py-2 border-t border-border">
        <NavItemRow to="/settings" icon="settings" label={t('nav.settings')} />
      </div>
    </aside>
  );
}

function NavGroup({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <div className="flex flex-col">
      <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-mute">{title}</div>
      <div className="flex flex-col">
        {items.map((it) => (
          <NavItemRow key={it.to} to={it.to} icon={it.icon} label={it.label} />
        ))}
      </div>
    </div>
  );
}

function NavItemRow({
  to,
  icon,
  label,
  end,
}: {
  to: string;
  icon: IconKind;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        'group relative flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition ' +
        (isActive
          ? 'bg-accent-bg text-accent'
          : 'text-text hover:bg-bg-elev hover:text-text-strong')
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              aria-hidden
              className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r bg-accent shadow-[0_0_8px_var(--color-accent)]"
            />
          )}
          <Icon kind={icon} className="w-4 h-4 shrink-0" />
          <span className="truncate">{label}</span>
        </>
      )}
    </NavLink>
  );
}

function Icon({ kind, className }: { kind: IconKind; className?: string }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    viewBox: '0 0 24 24',
    className,
  };
  switch (kind) {
    case 'overview':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
      );
    case 'fans':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="2" />
          <path d="M12 10c0-3 0-7 3-7s3 4 0 7" />
          <path d="M14 12c3 0 7 0 7 3s-4 3-7 0" />
          <path d="M12 14c0 3 0 7-3 7s-3-4 0-7" />
          <path d="M10 12c-3 0-7 0-7-3s4-3 7 0" />
        </svg>
      );
    case 'power':
      return (
        <svg {...common}>
          <path d="M12 3v10" />
          <path d="M7 6a8 8 0 1 0 10 0" />
        </svg>
      );
    case 'battery':
      return (
        <svg {...common}>
          <rect x="3" y="7" width="16" height="10" rx="2" />
          <path d="M21 11v2" />
          <path d="M6 10v4M9 10v4M12 10v4" />
        </svg>
      );
    case 'keyboard':
      return (
        <svg {...common}>
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" />
        </svg>
      );
    case 'led':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      );
  }
}
