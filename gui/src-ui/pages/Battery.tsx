import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { Card } from '@/components/Card';

type Limit =
  | 'FullCapacity'
  | 'HighCapacity'
  | 'Balanced'
  | 'MaximumLifespan'
  | 'DeskMode';

const LIMITS: { key: Limit; pctLabel: string }[] = [
  { key: 'FullCapacity', pctLabel: '100%' },
  { key: 'HighCapacity', pctLabel: '90–95%' },
  { key: 'Balanced', pctLabel: '70–80%' },
  { key: 'MaximumLifespan', pctLabel: '55–60%' },
  { key: 'DeskMode', pctLabel: '40–50%' },
];

export default function Battery() {
  const { t } = useTranslation();
  const [current, setCurrent] = useState<Limit>('Balanced');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
      <header>
        <h1 className="text-2xl font-semibold text-text-strong tracking-tight">
          {t('battery.title')}
        </h1>
        <p className="text-xs text-mute font-mono mt-0.5">{t('battery.subtitle')}</p>
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
