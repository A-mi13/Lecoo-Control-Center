import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { Card } from '@/components/Card';
import { Segment } from '@/components/Segment';
import { FanCurveEditor } from '@/components/FanCurveEditor';
import { pwmAt, type CurvePoint } from '@/components/FanCurveEditor.helpers';
import { useTelemetryStore } from '@/stores/telemetry';
import { PRESETS, PRESET_ORDER, type PresetName } from './fans/presets';

type FanArg = 'Cpu' | 'Gpu';
type FanMode = 'Auto' | 'Curve' | 'Full';

interface FanCurveState {
  curve: { points: CurvePoint[] } | null;
  enabled: boolean;
}

export default function Fans() {
  const { t } = useTranslation();
  const [fan, setFan] = useState<FanArg>('Cpu');
  const [cpuPoints, setCpuPoints] = useState<CurvePoint[]>(PRESETS.Balanced);
  const [gpuPoints, setGpuPoints] = useState<CurvePoint[]>(PRESETS.Balanced);
  const [cpuMode, setCpuMode] = useState<FanMode>('Auto');
  const [gpuMode, setGpuMode] = useState<FanMode>('Auto');
  const [err, setErr] = useState<string | null>(null);

  const latest = useTelemetryStore((s) => s.latest);
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

  const points = fan === 'Cpu' ? cpuPoints : gpuPoints;
  const setPoints = fan === 'Cpu' ? setCpuPoints : setGpuPoints;
  const mode = fan === 'Cpu' ? cpuMode : gpuMode;
  const setMode = fan === 'Cpu' ? setCpuMode : setGpuMode;

  // Pull existing state on mount and whenever the active fan changes.
  useEffect(() => {
    invoke<FanCurveState>('get_fan_curve', { fan })
      .then((state) => {
        if (state.curve && state.curve.points.length >= 2) {
          if (fan === 'Cpu') setCpuPoints(state.curve.points);
          else setGpuPoints(state.curve.points);
        }
        if (state.enabled) setMode('Curve');
      })
      .catch(() => {});
  }, [fan, setMode]);

  const commitCurve = useCallback(
    async (next: CurvePoint[]) => {
      setErr(null);
      try {
        await invoke('set_fan_curve', { fan, curve: { points: next } });
      } catch (e) {
        setErr(String(e));
      }
    },
    [fan],
  );

  async function applyMode(m: FanMode) {
    setErr(null);
    setMode(m);
    try {
      if (m === 'Curve') {
        // Make sure the runner has the latest curve, then enable it.
        await invoke('set_fan_curve', { fan, curve: { points } });
        await invoke('set_fan_curve_enabled', { fan, enabled: true });
      } else {
        // Auto / Full hand control back to the EC. Disable the runner first
        // so it stops overwriting whatever the daemon sets next.
        await invoke('set_fan_curve_enabled', { fan, enabled: false });
        await invoke('set_fan_mode', {
          fan,
          mode: m === 'Full' ? { kind: 'full' } : { kind: 'auto' },
        });
      }
    } catch (e) {
      setErr(String(e));
    }
  }

  function applyPreset(name: PresetName) {
    const next = PRESETS[name];
    setPoints(next);
    commitCurve(next);
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
        <Card title={t('fans.predicted_pwm')}>
          <span className="text-2xl font-mono tabular-nums text-text-strong">
            {liveTempC != null ? pwmAt(points, liveTempC) : '—'}
            <span className="text-sm text-mute ml-1">%</span>
          </span>
        </Card>
      </div>

      <Card
        title={t('fans.curve_title')}
        action={
          <Segment
            options={[
              { label: t('fans.mode.auto'), value: 'Auto' },
              { label: t('fans.mode.curve'), value: 'Curve' },
              { label: t('fans.mode.full'), value: 'Full' },
            ]}
            value={mode}
            onChange={applyMode}
            size="sm"
          />
        }
      >
        <FanCurveEditor
          points={points}
          onChange={setPoints}
          onCommit={commitCurve}
          currentTempC={liveTempC}
          disabled={mode !== 'Curve'}
        />
        {err ? <p className="text-xs text-warn font-mono mt-3">{err}</p> : null}
      </Card>

      <Card title={t('fans.presets')}>
        <div className="flex gap-2 flex-wrap">
          {PRESET_ORDER.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => applyPreset(name)}
              disabled={mode !== 'Curve'}
              className={
                'px-3.5 py-1.5 text-[11px] font-mono uppercase tracking-wide rounded-md border ' +
                'border-border text-text hover:border-accent hover:text-accent transition ' +
                'disabled:opacity-50 disabled:hover:border-border disabled:hover:text-text'
              }
            >
              {t(`fans.preset.${name.toLowerCase()}`, name)}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
