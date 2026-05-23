import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open as openExternal } from '@tauri-apps/plugin-shell';
import { Card } from '@/components/Card';
import { Segment } from '@/components/Segment';
import { Toggle } from '@/components/Toggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAppVersion } from '@/hooks/useAppVersion';
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

const REPO_URL = 'https://github.com/A-mi13/Lecoo-Control-Center';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const guiVersion = useAppVersion();

  // Subscribe to each setting individually so unrelated changes don't
  // rerender the whole page. Pulling the whole store with useSettingsStore()
  // also gave us a non-stable `set` reference on every render which was a
  // foot-gun for any useEffect that mentioned it.
  const language = useSettingsStore((s) => s.language);
  const tempUnit = useSettingsStore((s) => s.tempUnit);
  const launchAtStartup = useSettingsStore((s) => s.launchAtStartup);
  const startMinimized = useSettingsStore((s) => s.startMinimized);
  const closeToTray = useSettingsStore((s) => s.closeToTray);
  const showTrayIcon = useSettingsStore((s) => s.showTrayIcon);
  const pollIntervalSec = useSettingsStore((s) => s.pollIntervalSec);
  const historyWindowMin = useSettingsStore((s) => s.historyWindowMin);
  const autoCheckUpdates = useSettingsStore((s) => s.autoCheckUpdates);
  const verboseLogging = useSettingsStore((s) => s.verboseLogging);
  const setSetting = useSettingsStore((s) => s.set);

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
        if (enabled !== useSettingsStore.getState().launchAtStartup) {
          useSettingsStore.getState().set('launchAtStartup', enabled);
        }
      })
      .catch(() => {});
  }, []);

  // Push the persisted poll interval into the Rust poller. The store
  // remembers the user's choice across runs; without this push, the
  // poller would always boot at its default until the user clicks the
  // segment manually.
  useEffect(() => {
    invoke('set_poll_interval', { seconds: pollIntervalSec }).catch((e) =>
      console.error('initial set_poll_interval failed', e),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync settings.language with whatever i18next actually resolved to.
  // Without this the UI can render Russian (because the browser detector
  // picked it) while the Settings segment still shows English from the
  // default-initialised store. Cheap, runs once per mount.
  useEffect(() => {
    const resolved = (i18n.resolvedLanguage ?? i18n.language ?? '').toLowerCase().split('-')[0];
    if ((resolved === 'en' || resolved === 'ru' || resolved === 'zh') && resolved !== language) {
      setSetting('language', resolved as Language);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.resolvedLanguage]);

  async function applyLanguage(lang: Language) {
    setSetting('language', lang);
    try {
      await i18n.changeLanguage(lang);
    } catch (e) {
      console.error('changeLanguage failed', e);
    }
  }

  function applyTempUnit(u: TempUnit) {
    setSetting('tempUnit', u);
  }

  async function applyPoll(p: PollInterval) {
    setSetting('pollIntervalSec', p);
    try {
      await invoke('set_poll_interval', { seconds: p });
    } catch (e) {
      console.error('set_poll_interval failed', e);
    }
  }

  function applyHistory(h: HistoryWindow) {
    setSetting('historyWindowMin', h);
    setMaxHistory(h * 60); // assumes 1 Hz poll, good enough until the rate is variable
  }

  async function applyAutostart(enable: boolean) {
    setSetting('launchAtStartup', enable);
    try {
      await invoke('set_autostart', { enable });
    } catch (e) {
      console.error('set_autostart failed', e);
    }
  }

  async function applyVerbose(enable: boolean) {
    setSetting('verboseLogging', enable);
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
      try {
        // navigator.clipboard works in Tauri 2 webview without a separate
        // plugin permission, but fall back to a hidden textarea selection
        // if the user's environment blocks it.
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(bundle);
        } else {
          legacyCopy(bundle);
        }
        flashToast(t('settings.diagnostics.copied'));
      } catch (e) {
        console.error('clipboard write failed, trying fallback', e);
        legacyCopy(bundle);
        flashToast(t('settings.diagnostics.copied'));
      }
    } catch (e) {
      console.error('copy diagnostics failed', e);
      flashToast(t('settings.diagnostics.copy_failed'));
    }
  }

  function legacyCopy(text: string) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(ta);
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
          <Segment options={LANGS} value={language} onChange={applyLanguage} size="sm" />
        </Row>
        <Row label={t('settings.field.temp_unit')}>
          <Segment
            options={[
              { value: 'celsius' as const, label: t('settings.temp.celsius') },
              { value: 'fahrenheit' as const, label: t('settings.temp.fahrenheit') },
            ]}
            value={tempUnit}
            onChange={applyTempUnit}
            size="sm"
          />
        </Row>
      </Card>

      <Card title={t('settings.behavior')}>
        <Row label={t('settings.field.launch_at_startup')}>
          <Toggle checked={launchAtStartup} onChange={applyAutostart} />
        </Row>
        <Row label={t('settings.field.start_minimized')}>
          <Toggle
            checked={startMinimized}
            onChange={(v) => setSetting('startMinimized', v)}
          />
        </Row>
        <Row label={t('settings.field.close_to_tray')}>
          <Toggle
            checked={closeToTray}
            onChange={(v) => setSetting('closeToTray', v)}
          />
        </Row>
        <Row label={t('settings.field.show_tray_icon')}>
          <Toggle
            checked={showTrayIcon}
            onChange={(v) => setSetting('showTrayIcon', v)}
          />
        </Row>
      </Card>

      <Card title={t('settings.telemetry_group')}>
        <Row label={t('settings.field.poll_interval')}>
          <Segment
            options={[
              { value: 3 as PollInterval, label: t('settings.poll.3') },
              { value: 5 as PollInterval, label: t('settings.poll.5') },
              { value: 10 as PollInterval, label: t('settings.poll.10') },
            ]}
            value={pollIntervalSec}
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
            value={historyWindowMin}
            onChange={applyHistory}
            size="sm"
          />
        </Row>
      </Card>

      <Card title={t('settings.updates_group')}>
        <Row label={t('settings.field.auto_check_updates')}>
          <Toggle
            checked={autoCheckUpdates}
            onChange={(v) => setSetting('autoCheckUpdates', v)}
          />
        </Row>
        <UpdateChecker t={t} />
      </Card>

      <Card title={t('settings.daemon_group')}>
        <DaemonRow label={t('settings.daemon.status')} value={daemonStatusLabel(status, t)} />
        <DaemonRow
          label={t('settings.daemon.version')}
          value={formatDaemonVersion(status)}
        />
        <DaemonRow label={t('settings.daemon.gui_version')} value={guiVersion} />
        <DaemonRow
          label={t('settings.daemon.pipe')}
          value={t('settings.daemon.endpoint_value')}
        />
      </Card>

      <Card title={t('settings.diagnostics_group')}>
        <Row label={t('settings.field.verbose_logging')}>
          <Toggle checked={verboseLogging} onChange={applyVerbose} />
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
              {guiVersion} · {t('settings.about.license')}
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

function formatDaemonVersion(status: ConnectionStatus): string {
  if (status.kind !== 'connected') return '—';
  const v = status.daemonVersion;
  if (!Array.isArray(v) || v.length < 2) return '—';
  return `${v[0]}.${v[1]}`;
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

interface UpdateCheck {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseUrl: string;
  releaseName: string | null;
  releaseNotes: string | null;
  prerelease: boolean;
}

function UpdateChecker({ t }: { t: (k: string) => string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<UpdateCheck | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function check() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      const r = await invoke<UpdateCheck>('check_for_updates');
      setResult(r);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={check}
          disabled={busy}
          className="px-3 py-1.5 text-[11px] font-mono uppercase tracking-wide rounded-md border border-border text-text hover:border-accent hover:text-accent transition disabled:opacity-50"
        >
          {busy
            ? t('settings.updates.checking')
            : t('settings.updates.check_button')}
        </button>
      </div>

      {result ? (
        <div className="text-xs font-mono text-text">
          {result.updateAvailable ? (
            <>
              <p className="text-ok">
                {t('settings.updates.new_available').replace('{{v}}', result.latestVersion)}
              </p>
              <p className="text-mute">
                {t('settings.updates.current').replace('{{v}}', result.currentVersion)}
              </p>
              <button
                type="button"
                onClick={() => {
                  openExternal(result.releaseUrl).catch((e) =>
                    console.error('openExternal failed', e),
                  );
                }}
                className="mt-1 text-accent hover:underline"
              >
                {t('settings.updates.open_release')} ↗
              </button>
            </>
          ) : (
            <p className="text-mute">
              {t('settings.updates.up_to_date').replace('{{v}}', result.currentVersion)}
            </p>
          )}
        </div>
      ) : null}

      {err ? <p className="text-xs font-mono text-warn">{err}</p> : null}
    </div>
  );
}
