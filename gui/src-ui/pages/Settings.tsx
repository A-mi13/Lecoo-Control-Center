import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open as openExternal } from '@tauri-apps/plugin-shell';
import { Card } from '@/components/Card';
import { Segment } from '@/components/Segment';
import { Toggle } from '@/components/Toggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  useSettingsStore,
  type HistoryWindow,
  type Language,
  type PollInterval,
  type TempUnit,
} from '@/stores/settings';
import { useTelemetryStore } from '@/stores/telemetry';

const LANGS: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
  { value: 'zh', label: '中文' },
];

type ConnectionStatus =
  | { kind: 'disconnected' }
  | { kind: 'connecting' }
  | { kind: 'connected'; daemonVersion: [number, number] }
  | { kind: 'error'; message: string };

const GUI_VERSION = '0.1.0';
const REPO_URL = 'https://github.com/A-mi13/Lecoo-Control-Center';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const s = useSettingsStore();
  const setMaxHistory = useTelemetryStore((x) => x.setMaxHistory);
  const [status, setStatus] = useState<ConnectionStatus>({ kind: 'disconnected' });
  const [toast, setToast] = useState<string | null>(null);

  // Connection status feed for the Daemon group.
  useEffect(() => {
    invoke<ConnectionStatus | null>('get_connection_status')
      .then((cs) => {
        if (cs) setStatus(cs);
      })
      .catch(() => {});
    const p = listen<ConnectionStatus>('connection-status', (e) => setStatus(e.payload));
    return () => {
      p.then((fn) => fn()).catch(() => {});
    };
  }, []);

  // Sync settings.launchAtStartup with the real OS state on mount.
  useEffect(() => {
    invoke<boolean>('get_autostart')
      .then((enabled) => {
        if (enabled !== s.launchAtStartup) s.set('launchAtStartup', enabled);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function applyLanguage(lang: Language) {
    s.set('language', lang);
    await i18n.changeLanguage(lang);
  }

  async function applyTempUnit(u: TempUnit) {
    s.set('tempUnit', u);
  }

  async function applyPoll(p: PollInterval) {
    s.set('pollIntervalSec', p);
    // Telemetry poll rate is owned by the Rust poller — wired in Phase 8.
  }

  async function applyHistory(h: HistoryWindow) {
    s.set('historyWindowMin', h);
    setMaxHistory(h * 60); // assumes 1 Hz poll, good enough until the rate is variable
  }

  async function applyAutostart(enable: boolean) {
    s.set('launchAtStartup', enable);
    try {
      await invoke('set_autostart', { enable });
    } catch (e) {
      console.error('set_autostart failed', e);
    }
  }

  async function applyVerbose(enable: boolean) {
    s.set('verboseLogging', enable);
    try {
      await invoke('set_log_level', { level: enable ? 'debug' : 'info' });
    } catch (e) {
      console.error('set_log_level failed', e);
    }
  }

  async function openLogs() {
    try {
      await invoke('open_logs_dir');
    } catch (e) {
      console.error('open_logs_dir failed', e);
    }
  }

  async function copyDiagnostics() {
    try {
      const bundle = await invoke<string>('get_diagnostics_bundle');
      await navigator.clipboard.writeText(bundle);
      flashToast(t('settings.diagnostics.copied'));
    } catch (e) {
      console.error('copy diagnostics failed', e);
      flashToast(t('settings.diagnostics.copy_failed'));
    }
  }

  function flashToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold text-text-strong tracking-tight">
          {t('nav.settings')}
        </h1>
      </header>

      <Card title={t('settings.appearance')}>
        <Row label={t('settings.field.theme')}>
          <ThemeToggle />
        </Row>
        <Row label={t('settings.field.language')}>
          <Segment options={LANGS} value={s.language} onChange={applyLanguage} size="sm" />
        </Row>
        <Row label={t('settings.field.temp_unit')}>
          <Segment
            options={[
              { value: 'celsius' as const, label: t('settings.temp.celsius') },
              { value: 'fahrenheit' as const, label: t('settings.temp.fahrenheit') },
            ]}
            value={s.tempUnit}
            onChange={applyTempUnit}
            size="sm"
          />
        </Row>
      </Card>

      <Card title={t('settings.behavior')}>
        <Row label={t('settings.field.launch_at_startup')}>
          <Toggle checked={s.launchAtStartup} onChange={applyAutostart} />
        </Row>
        <Row label={t('settings.field.start_minimized')}>
          <Toggle
            checked={s.startMinimized}
            onChange={(v) => s.set('startMinimized', v)}
          />
        </Row>
        <Row label={t('settings.field.close_to_tray')}>
          <Toggle
            checked={s.closeToTray}
            onChange={(v) => s.set('closeToTray', v)}
          />
        </Row>
        <Row label={t('settings.field.show_tray_icon')}>
          <Toggle
            checked={s.showTrayIcon}
            onChange={(v) => s.set('showTrayIcon', v)}
          />
        </Row>
      </Card>

      <Card title={t('settings.telemetry_group')}>
        <Row label={t('settings.field.poll_interval')}>
          <Segment
            options={[
              { value: 1 as PollInterval, label: t('settings.poll.1') },
              { value: 2 as PollInterval, label: t('settings.poll.2') },
              { value: 5 as PollInterval, label: t('settings.poll.5') },
            ]}
            value={s.pollIntervalSec}
            onChange={applyPoll}
            size="sm"
          />
        </Row>
        <Row label={t('settings.field.history_window')}>
          <Segment
            options={[
              { value: 5 as HistoryWindow, label: t('settings.history.5') },
              { value: 30 as HistoryWindow, label: t('settings.history.30') },
              { value: 120 as HistoryWindow, label: t('settings.history.120') },
            ]}
            value={s.historyWindowMin}
            onChange={applyHistory}
            size="sm"
          />
        </Row>
      </Card>

      <Card title={t('settings.updates_group')}>
        <Row label={t('settings.field.auto_check_updates')}>
          <Toggle
            checked={s.autoCheckUpdates}
            onChange={(v) => s.set('autoCheckUpdates', v)}
          />
        </Row>
      </Card>

      <Card title={t('settings.daemon_group')}>
        <DaemonRow label={t('settings.daemon.status')} value={daemonStatusLabel(status, t)} />
        <DaemonRow
          label={t('settings.daemon.version')}
          value={
            status.kind === 'connected'
              ? `${status.daemonVersion[0]}.${status.daemonVersion[1]}`
              : '—'
          }
        />
        <DaemonRow label={t('settings.daemon.gui_version')} value={GUI_VERSION} />
        <DaemonRow
          label={t('settings.daemon.pipe')}
          value={t('settings.daemon.endpoint_value')}
        />
      </Card>

      <Card title={t('settings.diagnostics_group')}>
        <Row label={t('settings.field.verbose_logging')}>
          <Toggle checked={s.verboseLogging} onChange={applyVerbose} />
        </Row>
        <p className="text-[11px] font-mono text-mute -mt-1">
          {t('settings.diagnostics.verbose_hint')}
        </p>
        <div className="flex gap-2 mt-3 flex-wrap">
          <button
            type="button"
            onClick={openLogs}
            className="px-3 py-1.5 text-[11px] font-mono uppercase tracking-wide rounded-md border border-border text-text hover:border-accent hover:text-accent transition"
          >
            {t('settings.diagnostics.open_logs')}
          </button>
          <button
            type="button"
            onClick={copyDiagnostics}
            className="px-3 py-1.5 text-[11px] font-mono uppercase tracking-wide rounded-md bg-accent text-white"
          >
            {t('settings.diagnostics.copy_bundle')}
          </button>
        </div>
      </Card>

      <Card title={t('settings.about_group')}>
        <div className="flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-lg shrink-0 flex items-center justify-center text-white font-semibold text-xl"
            style={{
              background:
                'linear-gradient(135deg, var(--color-accent), var(--color-purple))',
            }}
          >
            L
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-text-strong">
              {t('app.name')}
            </div>
            <div className="text-xs text-mute font-mono">
              {GUI_VERSION} · {t('settings.about.license')}
            </div>
            <p className="text-sm text-text mt-1.5">{t('settings.about.tagline')}</p>
            <button
              type="button"
              onClick={() => {
                openExternal(REPO_URL).catch((e) => console.error(e));
              }}
              className="mt-2 text-xs font-mono text-accent hover:underline"
            >
              {t('settings.about.github')} ↗
            </button>
          </div>
        </div>
      </Card>

      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 right-6 bg-bg-elev border border-border rounded-md px-3 py-2 text-xs font-mono text-text-strong shadow-lg z-50"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap py-1.5">
      <span className="text-[11px] font-mono uppercase tracking-widest text-mute">
        {label}
      </span>
      {children}
    </div>
  );
}

function DaemonRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-border last:border-b-0">
      <span className="text-[11px] font-mono uppercase tracking-widest text-mute">
        {label}
      </span>
      <span className="text-xs font-mono text-text-strong">{value}</span>
    </div>
  );
}

function daemonStatusLabel(status: ConnectionStatus, t: (k: string) => string): string {
  switch (status.kind) {
    case 'connected':
      return t('connection.connected');
    case 'connecting':
      return t('connection.connecting');
    case 'error':
      return t('connection.error');
    case 'disconnected':
    default:
      return t('connection.disconnected');
  }
}
