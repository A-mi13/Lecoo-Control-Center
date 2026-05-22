import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

type ConnectionStatus =
  | { kind: 'disconnected' }
  | { kind: 'connecting' }
  | { kind: 'connected'; daemonVersion: [number, number] }
  | { kind: 'error'; message: string };

const APP_VERSION = '0.1.0';

export function Titlebar() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ConnectionStatus>({ kind: 'disconnected' });

  useEffect(() => {
    invoke<ConnectionStatus | null>('get_connection_status')
      .then((s) => {
        if (s) setStatus(s);
      })
      .catch(() => {});

    const unlistenPromise = listen<ConnectionStatus>('connection-status', (e) => {
      setStatus(e.payload);
    });

    return () => {
      unlistenPromise.then((fn) => fn()).catch(() => {});
    };
  }, []);

  const w = getCurrentWindow();

  return (
    <div
      data-tauri-drag-region
      className="h-9 shrink-0 bg-bg-sidebar border-b border-border flex items-center px-3 select-none"
    >
      <div className="flex items-center gap-2">
        <Dot color="#ff5f57" onClick={() => w.close()} title="close" />
        <Dot color="#febc2e" onClick={() => w.minimize()} title="minimize" />
        <Dot color="#28c840" onClick={() => w.toggleMaximize()} title="maximize" />
      </div>

      <div data-tauri-drag-region className="flex-1 text-center text-[11px] font-mono text-mute">
        lecoo-control-center · {APP_VERSION}
      </div>

      <ConnectionPill status={status} t={t} />
    </div>
  );
}

function Dot({
  color,
  onClick,
  title,
}: {
  color: string;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="w-3 h-3 rounded-full border border-black/20 hover:brightness-110"
      style={{ backgroundColor: color }}
    />
  );
}

function ConnectionPill({
  status,
  t,
}: {
  status: ConnectionStatus;
  t: (key: string) => string;
}) {
  const { color, label } = (() => {
    switch (status.kind) {
      case 'connected':
        return { color: 'var(--color-ok)', label: t('connection.connected') };
      case 'connecting':
        return { color: 'var(--color-warn)', label: t('connection.connecting') };
      case 'error':
        return { color: 'var(--color-warn)', label: t('connection.error') };
      case 'disconnected':
      default:
        return { color: 'var(--color-mute)', label: t('connection.disconnected') };
    }
  })();

  return (
    <div className="flex items-center gap-1.5 text-[11px] font-mono text-mute">
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
      />
      <span>{label}</span>
    </div>
  );
}
