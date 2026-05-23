import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useAppVersion } from '@/hooks/useAppVersion';

type ConnectionStatus =
  | { kind: 'disconnected' }
  | { kind: 'connecting' }
  | { kind: 'connected'; daemonVersion: [number, number] }
  | { kind: 'error'; message: string };

export function Titlebar() {
  const { t } = useTranslation();
  const version = useAppVersion();
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
      className="h-9 shrink-0 bg-bg-sidebar border-b border-border flex items-stretch select-none"
    >
      <div
        data-tauri-drag-region
        className="flex-1 flex items-center px-3 gap-3 min-w-0"
      >
        <span className="text-[11px] font-mono text-mute shrink-0">
          lecoo-control-center · {version}
        </span>
        <div className="flex-1" />
        <ConnectionPill status={status} t={t} />
      </div>

      <div className="flex items-stretch shrink-0" aria-label="window controls">
        <WinButton onClick={() => w.minimize()} title="Minimize">
          <MinIcon />
        </WinButton>
        <WinButton onClick={() => w.toggleMaximize()} title="Maximize / Restore">
          <MaxIcon />
        </WinButton>
        <WinButton onClick={() => w.close()} title="Close" danger>
          <CloseIcon />
        </WinButton>
      </div>
    </div>
  );
}

function WinButton({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={
        'w-11 flex items-center justify-center text-text/70 transition-colors ' +
        (danger
          ? 'hover:bg-[#e81123] hover:text-white'
          : 'hover:bg-white/10 hover:text-text-strong')
      }
    >
      {children}
    </button>
  );
}

function MinIcon() {
  return (
    <svg
      width={10}
      height={10}
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      aria-hidden
    >
      <line x1={1} y1={5.5} x2={9} y2={5.5} />
    </svg>
  );
}

function MaxIcon() {
  return (
    <svg
      width={10}
      height={10}
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      aria-hidden
    >
      <rect x={1} y={1} width={8} height={8} />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width={10}
      height={10}
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      strokeLinecap="square"
      aria-hidden
    >
      <line x1={1} y1={1} x2={9} y2={9} />
      <line x1={9} y1={1} x2={1} y2={9} />
    </svg>
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
    <div className="flex items-center gap-1.5 text-[11px] font-mono text-mute shrink-0">
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
      />
      <span>{label}</span>
    </div>
  );
}
