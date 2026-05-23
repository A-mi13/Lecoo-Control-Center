import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { Card } from '@/components/Card';
import { Segment } from '@/components/Segment';
import { useTelemetryStore } from '@/stores/telemetry';

type FanArg = 'Cpu' | 'Gpu';
type FanMode = 'Auto' | 'Full';

export default function Fans() {
  const { t } = useTranslation();
  const latest = useTelemetryStore((s) => s.latest);

  const [cpuMode, setCpuMode] = useState<FanMode>('Auto');
  const [gpuMode, setGpuMode] = useState<FanMode>('Auto');
  const [err, setErr] = useState<{ fan: FanArg; msg: string } | null>(null);

  async function applyMode(fan: FanArg, m: FanMode) {
    setErr(null);
    if (fan === 'Cpu') setCpuMode(m);
    else setGpuMode(m);
    try {
      await invoke('set_fan_mode', {
        fan,
        mode: m === 'Full' ? { kind: 'full' } : { kind: 'auto' },
      });
    } catch (e) {
      setErr({ fan, msg: String(e) });
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold text-text-strong tracking-tight">
          {t('fans.title')}
        </h1>
        <p className="text-xs text-mute font-mono mt-0.5">{t('fans.subtitle')}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FanColumn
          name="CPU"
          temp={latest?.cpuTempC ?? null}
          rpm={latest?.cpuFanRpm ?? null}
          tempLabel={t('fans.cpu_temp')}
          mode={cpuMode}
          onMode={(m) => applyMode('Cpu', m)}
          err={err?.fan === 'Cpu' ? err.msg : null}
          t={t}
        />
        <FanColumn
          name="GPU"
          temp={latest?.sysTempC ?? null}
          rpm={latest?.gpuFanRpm ?? null}
          tempLabel={t('fans.sys_temp')}
          mode={gpuMode}
          onMode={(m) => applyMode('Gpu', m)}
          err={err?.fan === 'Gpu' ? err.msg : null}
          t={t}
        />
      </div>

      <Card title={t('fans.curve_disabled_title')}>
        <p className="text-sm text-text">{t('fans.curve_disabled_body')}</p>
      </Card>
    </div>
  );
}

interface ColumnProps {
  name: string;
  temp: number | null;
  rpm: number | null;
  tempLabel: string;
  mode: FanMode;
  onMode: (m: FanMode) => void;
  err: string | null;
  t: (key: string) => string;
}

function FanColumn({ name, temp, rpm, tempLabel, mode, onMode, err, t }: ColumnProps) {
  return (
    <Card title={`${name} · ${t('fans.mode_title')}`}>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest font-mono text-mute">
            {tempLabel}
          </div>
          <div className="text-2xl font-mono tabular-nums text-text-strong mt-1">
            {temp != null ? Math.round(temp) : '—'}
            <span className="text-sm text-mute ml-1">°C</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest font-mono text-mute">
            {t('fans.live_rpm')}
          </div>
          <div className="text-2xl font-mono tabular-nums text-text-strong mt-1">
            {rpm != null ? rpm : '—'}
            <span className="text-sm text-mute ml-1">rpm</span>
          </div>
        </div>
      </div>

      <Segment
        options={[
          { label: t('fans.mode.auto'), value: 'Auto' },
          { label: t('fans.mode.full'), value: 'Full' },
        ]}
        value={mode}
        onChange={onMode}
        size="sm"
      />
      <p className="text-xs text-text mt-3">
        {t(`fans.description.${mode.toLowerCase()}`)}
      </p>
      {err ? <p className="text-xs text-warn font-mono mt-2">{err}</p> : null}
    </Card>
  );
}
