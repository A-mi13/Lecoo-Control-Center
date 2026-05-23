import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { Card } from '@/components/Card';
import { useTelemetryStore } from '@/stores/telemetry';

type Limit =
  | 'FullCapacity'
  | 'HighCapacity'
  | 'Balanced'
  | 'MaximumLifespan'
  | 'DeskMode';

const LIMITS: { key: Limit; pctLabel: string; min: number; max: number }[] = [
  { key: 'FullCapacity', pctLabel: '100%', min: 0, max: 0 },
  { key: 'HighCapacity', pctLabel: '90–95%', min: 90, max: 95 },
  { key: 'Balanced', pctLabel: '70–80%', min: 70, max: 80 },
  { key: 'MaximumLifespan', pctLabel: '55–60%', min: 55, max: 60 },
  { key: 'DeskMode', pctLabel: '40–50%', min: 40, max: 50 },
];

function limitFromPercents(min: number, max: number): Limit | null {
  return LIMITS.find((l) => l.min === min && l.max === max)?.key ?? null;
}

export default function Battery() {
  const { t } = useTranslation();
  const latest = useTelemetryStore((s) => s.latest);
  const [current, setCurrent] = useState<Limit | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Sync the selected limit with whatever the daemon actually has set.
  // We only adopt the daemon's value while no apply is in flight — otherwise
  // an in-flight click would flicker back.
  useEffect(() => {
    if (busy || !latest) return;
    const decoded = limitFromPercents(latest.chargeLimitMin, latest.chargeLimitMax);
    if (decoded && decoded !== current) {
      setCurrent(decoded);
    }
  }, [latest, busy, current]);

  async function apply(limit: Limit) {
    if (busy || limit === current) return;
    setBusy(true);
    setErr(null);
    try {
      await invoke('set_charge_limit', { limit });
      setCurrent(limit);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-strong tracking-tight">
            {t('battery.title')}
          </h1>
          <p className="text-xs text-mute font-mono mt-0.5">{t('battery.subtitle')}</p>
        </div>
        {latest ? (
          <div className="text-right">
            <div className="text-2xl font-mono tabular-nums text-text-strong">
              {latest.batteryPercent}
              <span className="text-sm text-mute ml-0.5">%</span>
            </div>
            <div className="text-[10px] font-mono text-mute uppercase tracking-widest">
              {t(
                latest.acConnected === true
                  ? 'overview.battery.plugged'
                  : latest.acConnected === false
                    ? 'overview.battery.on_battery'
                    : 'overview.battery.unknown',
              )}
            </div>
          </div>
        ) : null}
      </header>

      <Card title={t('battery.limit_label')}>
        <div className="flex flex-col gap-1.5">
          {LIMITS.map(({ key, pctLabel }) => {
            const active = current === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => apply(key)}
                disabled={busy}
                className={
                  'flex justify-between items-center px-3 py-2.5 rounded-md border text-sm transition disabled:opacity-50 ' +
                  (active
                    ? 'bg-accent-bg border-accent text-accent'
                    : 'bg-bg border-border text-text hover:border-mute')
                }
              >
                <div className="flex flex-col items-start text-left">
                  <span className="font-mono text-xs">{t(`battery.limit.${key}`)}</span>
                  <span className="text-[10px] text-mute font-sans mt-0.5">
                    {t(`battery.limit_desc.${key}`)}
                  </span>
                </div>
                <span className="font-mono text-xs shrink-0 ml-2">{pctLabel}</span>
              </button>
            );
          })}
        </div>
        {err ? <p className="text-xs text-warn font-mono mt-3">{err}</p> : null}
      </Card>
    </div>
  );
}
