import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { Card } from '@/components/Card';
import { Segment } from '@/components/Segment';

type Profile = 'Silent' | 'Default' | 'Performance';

const EC_VALUES: Record<Profile, string> = {
  Silent: '0x01',
  Default: '0x02',
  Performance: '0x03',
};

export default function Power() {
  const { t } = useTranslation();
  const [current, setCurrent] = useState<Profile>('Default');
  const [appliedAt, setAppliedAt] = useState<string>('—');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function apply(p: Profile) {
    if (busy || p === current) return;
    setBusy(true);
    setErr(null);
    try {
      await invoke('set_power_profile', { profile: p });
      setCurrent(p);
      setAppliedAt(new Date().toLocaleTimeString());
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  const options = (['Silent', 'Default', 'Performance'] as Profile[]).map((p) => ({
    label: t(`overview.profile.${p.toLowerCase()}`, p),
    value: p,
  }));

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold text-text-strong tracking-tight">
          {t('power.title')}
        </h1>
        <p className="text-xs text-mute font-mono mt-0.5">{t('power.subtitle')}</p>
      </header>

      <Card title={t('power.profile_label')}>
        <Segment options={options} value={current} onChange={apply} disabled={busy} />
        <p className="text-sm text-text mt-4">
          {t(`power.description.${current.toLowerCase()}`)}
        </p>
        {err ? <p className="text-xs text-warn font-mono mt-2">{err}</p> : null}
      </Card>

      <Card title={t('power.diagnostics')}>
        <div className="flex justify-between text-sm py-2 border-b border-border">
          <span className="text-mute font-mono text-xs">EC value</span>
          <span className="text-text-strong font-mono">{EC_VALUES[current]}</span>
        </div>
        <div className="flex justify-between text-sm py-2">
          <span className="text-mute font-mono text-xs">{t('power.applied_at')}</span>
          <span className="text-text-strong font-mono">{appliedAt}</span>
        </div>
      </Card>
    </div>
  );
}
