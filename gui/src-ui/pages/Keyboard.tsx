import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { Card } from '@/components/Card';
import { Segment } from '@/components/Segment';
import { Slider } from '@/components/Slider';

type Preset = 'Off' | 'Low' | 'Medium' | 'High';

const PRESET_LEVELS: Record<Preset, number> = {
  Off: 0,
  Low: 85,
  Medium: 170,
  High: 255,
};

export default function Keyboard() {
  const { t } = useTranslation();
  const [preset, setPreset] = useState<Preset | null>('Medium');
  const [custom, setCustom] = useState<number>(170);
  const [err, setErr] = useState<string | null>(null);

  const previewOpacity = custom / 255;

  async function applyPreset(p: Preset) {
    setErr(null);
    setPreset(p);
    setCustom(PRESET_LEVELS[p]);
    try {
      await invoke('set_keyboard_backlight', {
        level: { kind: p.toLowerCase() },
      });
    } catch (e) {
      setErr(String(e));
    }
  }

  async function commitCustom(value: number) {
    setErr(null);
    setPreset(null);
    try {
      await invoke('set_keyboard_backlight', {
        level: { kind: 'custom', value },
      });
    } catch (e) {
      setErr(String(e));
    }
  }

  const presetOptions: { label: string; value: Preset }[] = (
    ['Off', 'Low', 'Medium', 'High'] as Preset[]
  ).map((p) => ({
    label: t(`keyboard.presets.${p.toLowerCase()}`),
    value: p,
  }));

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold text-text-strong tracking-tight">
          {t('keyboard.title')}
        </h1>
        <p className="text-xs text-mute font-mono mt-0.5">{t('keyboard.subtitle')}</p>
      </header>

      <Card title={t('keyboard.preset_label')}>
        <Segment
          options={presetOptions}
          value={preset ?? 'Off'}
          onChange={(v) => applyPreset(v)}
        />
      </Card>

      <Card title={t('keyboard.custom_label')}>
        <Slider
          min={0}
          max={255}
          value={custom}
          onChange={setCustom}
          onCommit={commitCustom}
          unit="/255"
        />
        {err ? <p className="text-xs text-warn font-mono mt-3">{err}</p> : null}
      </Card>

      <Card title={t('keyboard.preview_label')}>
        <KeyboardPreview opacity={previewOpacity} />
      </Card>
    </div>
  );
}

function KeyboardPreview({ opacity }: { opacity: number }) {
  const rows = [12, 12, 11];
  return (
    <div className="flex flex-col gap-1.5 select-none">
      {rows.map((count, rIdx) => (
        <div key={rIdx} className="flex gap-1">
          {Array.from({ length: count }).map((_, kIdx) => (
            <div
              key={kIdx}
              className="h-6 flex-1 rounded-sm border border-border"
              style={{
                background: `rgba(88, 166, 255, ${opacity.toFixed(3)})`,
                boxShadow:
                  opacity > 0
                    ? `0 0 ${4 + opacity * 6}px rgba(88,166,255,${(opacity * 0.6).toFixed(3)})`
                    : 'none',
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
