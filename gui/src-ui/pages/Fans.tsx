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

  const [fan, setFan] = useState<FanArg>('Cpu');
  const [cpuMode, setCpuMode] = useState<FanMode>('Auto');
  const [gpuMode, setGpuMode] = useState<FanMode>('Auto');
  const [err, setErr] = useState<string | null>(null);

  const liveTempC =
    latest == null
      ? null
      : fan === 'Cpu'
        ? latest.cpuTempC
        : latest.sysTempC;
  const liveRpm =
    latest == null
      ? null
      : fan === 'Cpu'
        ? latest.cpuFanRpm
        : latest.gpuFanRpm;

  const mode = fan === 'Cpu' ? cpuMode : gpuMode;
  const setMode = fan === 'Cpu' ? setCpuMode : setGpuMode;

  async function applyMode(m: FanMode) {
    setErr(null);
    setMode(m);
    try {
      await invoke('set_fan_mode', {
        fan,
        mode: m === 'Full' ? { kind: 'full' } : { kind: 'auto' },
      });
    } catch (e) {
      setErr(String(e));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-strong tracking-tight">
            {t('fans.title')}
          </h1>
          <p className="text-xs text-mute font-mono mt-0.5">{t('fans.subtitle')}</p>
        </div>
        <Segment
          options={[
            { label: 'CPU', value: 'Cpu' },
            { label: 'GPU', value: 'Gpu' },
          ]}
          value={fan}
          onChange={setFan}
        />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card title={t('fans.live_temp')}>
          <span className="text-2xl font-mono tabular-nums text-text-strong">
            {liveTempC != null ? Math.round(liveTempC) : '—'}
            <span className="text-sm text-mute ml-1">°C</span>
          </span>
        </Card>
        <Card title={t('fans.live_rpm')}>
          <span className="text-2xl font-mono tabular-nums text-text-strong">
            {liveRpm != null ? liveRpm : '—'}
            <span className="text-sm text-mute ml-1">rpm</span>
          </span>
        </Card>
      </div>

      <Card title={t('fans.mode_title')}>
        <Segment
          options={[
            { label: t('fans.mode.auto'), value: 'Auto' },
            { label: t('fans.mode.full'), value: 'Full' },
          ]}
          value={mode}
          onChange={applyMode}
        />
        <p className="text-sm text-text mt-4">
          {t(`fans.description.${mode.toLowerCase()}`)}
        </p>
        {err ? <p className="text-xs text-warn font-mono mt-2">{err}</p> : null}
      </Card>

      <Card title={t('fans.curve_disabled_title')}>
        <p className="text-sm text-text">
          {t('fans.curve_disabled_body')}
        </p>
      </Card>
    </div>
  );
}
