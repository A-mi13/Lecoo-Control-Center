import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

type ConnectionStatus =
  | { kind: 'disconnected' }
  | { kind: 'connecting' }
  | { kind: 'connected'; daemonVersion: [number, number] }
  | { kind: 'error'; message: string };

export function DaemonOverlay() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ConnectionStatus>({ kind: 'disconnected' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    invoke<ConnectionStatus | null>('get_connection_status')
      .then((s) => {
        if (s) setStatus(s);
      })
      .catch(() => {});
    const p = listen<ConnectionStatus>('connection-status', (e) => setStatus(e.payload));
    return () => {
      p.then((fn) => fn()).catch(() => {});
    };
  }, []);

  if (status.kind === 'connected') return null;

  const title =
    status.kind === 'error'
      ? t('daemon_overlay.error_title')
      : status.kind === 'connecting'
        ? t('daemon_overlay.connecting_title')
        : t('daemon_overlay.disconnected_title');

  const detail = status.kind === 'error' ? status.message : null;

  async function retry() {
    if (busy) return;
    setBusy(true);
    try {
      await invoke('reconnect_now');
    } finally {
      // The poller will emit a new connection-status event shortly.
      setTimeout(() => setBusy(false), 500);
    }
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm"
    >
      <div className="max-w-md w-[90%] bg-bg-elev border border-border rounded-xl p-5 shadow-2xl">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-warn shadow-[0_0_8px_var(--color-warn)]" />
          <h2 className="text-base font-semibold text-text-strong">{title}</h2>
        </div>

        <p className="text-sm text-text mb-3">{t('daemon_overlay.body')}</p>

        {detail ? (
          <pre className="text-[11px] font-mono bg-bg border border-border rounded p-2 mb-3 whitespace-pre-wrap break-all max-h-24 overflow-auto">
            {detail}
          </pre>
        ) : null}

        <div className="text-[11px] font-mono text-mute space-y-1 mb-4">
          <Step label="1." command="sc query LecooControlDaemon" />
          <Step label="2." command="sc start LecooControlDaemon" />
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={retry}
            disabled={busy}
            className="px-3 py-1.5 text-[11px] font-mono uppercase tracking-wide rounded-md bg-accent text-white disabled:opacity-50"
          >
            {t('daemon_overlay.retry')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({ label, command }: { label: string; command: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span>{label}</span>
      <code className="text-text-strong">{command}</code>
    </div>
  );
}
