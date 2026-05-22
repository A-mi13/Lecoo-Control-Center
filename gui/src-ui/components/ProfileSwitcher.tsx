import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';

export type PowerProfile = 'Silent' | 'Default' | 'Performance';

const PROFILES: PowerProfile[] = ['Silent', 'Default', 'Performance'];

interface Props {
  current: PowerProfile;
  onChange: (p: PowerProfile) => void;
}

export function ProfileSwitcher({ current, onChange }: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  async function apply(p: PowerProfile) {
    if (busy || p === current) return;
    setBusy(true);
    try {
      await invoke('set_power_profile', { profile: p });
      onChange(p);
    } catch (e) {
      console.error('set_power_profile failed', e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex gap-0.5 bg-bg-elev border border-border p-0.5 rounded-lg">
      {PROFILES.map((p) => {
        const active = current === p;
        const key = `overview.profile.${p.toLowerCase()}`;
        return (
          <button
            key={p}
            type="button"
            onClick={() => apply(p)}
            disabled={busy}
            className={
              'px-3.5 py-1.5 text-[11px] font-medium rounded-md font-mono tracking-wide uppercase transition ' +
              (active
                ? 'bg-accent text-white shadow-md'
                : 'text-mute hover:text-text disabled:opacity-50')
            }
          >
            {t(key, p)}
          </button>
        );
      })}
    </div>
  );
}
