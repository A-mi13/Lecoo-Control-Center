import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { Card } from '@/components/Card';
import { Segment } from '@/components/Segment';
import { Slider } from '@/components/Slider';
import {
  BRIGHTNESS_OPTIONS,
  BRIGHTNESS_PCT,
  DELAY_MS,
  DELAY_OPTIONS,
  PRESETS,
  PRESET_ORDER,
  STEP_OPTIONS,
  STEP_SECONDS,
  type BreathConfig,
  type PresetName,
} from './led/presets';

type Mode = 'Auto' | 'Static' | 'Animation';

const MODE_OPTIONS: { label: string; value: Mode }[] = [
  { label: 'Auto', value: 'Auto' },
  { label: 'Static', value: 'Static' },
  { label: 'Animation', value: 'Animation' },
];

const DEFAULT_CONFIG: BreathConfig = PRESETS.smooth;

export default function LedRing() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('Auto');
  const [staticValue, setStaticValue] = useState(128);
  const [config, setConfig] = useState<BreathConfig>(DEFAULT_CONFIG);
  const [err, setErr] = useState<string | null>(null);

  async function applyMode(m: Mode) {
    setErr(null);
    setMode(m);
    try {
      if (m === 'Auto') {
        await invoke('set_led_mode', { mode: { kind: 'auto' } });
      } else if (m === 'Static') {
        await invoke('set_led_mode', {
          mode: { kind: 'custom', value: staticValue },
        });
      } else {
        await invoke('set_led_mode', {
          mode: { kind: 'animation', config },
        });
      }
    } catch (e) {
      setErr(String(e));
    }
  }

  async function commitStatic(value: number) {
    if (mode !== 'Static') return;
    setErr(null);
    try {
      await invoke('set_led_mode', { mode: { kind: 'custom', value } });
    } catch (e) {
      setErr(String(e));
    }
  }

  async function commitConfig(next: BreathConfig) {
    setConfig(next);
    if (mode !== 'Animation') return;
    setErr(null);
    try {
      await invoke('set_led_mode', { mode: { kind: 'animation', config: next } });
    } catch (e) {
      setErr(String(e));
    }
  }

  function applyPreset(name: PresetName) {
    const cfg = PRESETS[name];
    commitConfig(cfg);
    if (mode !== 'Animation') setMode('Animation');
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-strong tracking-tight">
            {t('led.title')}
          </h1>
          <p className="text-xs text-mute font-mono mt-0.5">{t('led.subtitle')}</p>
        </div>
        <Segment options={MODE_OPTIONS} value={mode} onChange={applyMode} />
      </header>

      {mode === 'Auto' ? <AutoCard t={t} /> : null}
      {mode === 'Static' ? (
        <StaticCard
          value={staticValue}
          onChange={setStaticValue}
          onCommit={commitStatic}
          t={t}
        />
      ) : null}
      {mode === 'Animation' ? (
        <>
          <PreviewCard config={config} t={t} />
          <BuilderCard config={config} onChange={commitConfig} t={t} />
          <PresetGallery onPick={applyPreset} t={t} />
        </>
      ) : null}

      {err ? <p className="text-xs text-warn font-mono">{err}</p> : null}
    </div>
  );
}

function AutoCard({ t }: { t: (key: string) => string }) {
  return (
    <Card title={t('led.auto.title')}>
      <p className="text-sm text-text">{t('led.auto.body')}</p>
    </Card>
  );
}

function StaticCard({
  value,
  onChange,
  onCommit,
  t,
}: {
  value: number;
  onChange: (v: number) => void;
  onCommit: (v: number) => void;
  t: (key: string) => string;
}) {
  const opacity = value / 255;
  return (
    <Card title={t('led.static.title')}>
      <div className="flex flex-col gap-4">
        <Slider min={0} max={255} value={value} onChange={onChange} onCommit={onCommit} unit="/255" />
        <Ring opacity={opacity} />
      </div>
    </Card>
  );
}

function PreviewCard({
  config,
  t,
}: {
  config: BreathConfig;
  t: (key: string) => string;
}) {
  const opacity = useBreathPreview(config);
  return (
    <Card title={t('led.animation.preview')}>
      <Ring opacity={opacity} />
    </Card>
  );
}

function BuilderCard({
  config,
  onChange,
  t,
}: {
  config: BreathConfig;
  onChange: (next: BreathConfig) => void;
  t: (key: string) => string;
}) {
  return (
    <Card title={t('led.animation.builder')}>
      <div className="flex flex-col gap-4">
        <Row label={t('led.field.max_brightness')}>
          <Segment
            options={BRIGHTNESS_OPTIONS}
            value={config.max_brightness}
            onChange={(v) => onChange({ ...config, max_brightness: v })}
            size="sm"
          />
        </Row>
        <Row label={t('led.field.step_up')}>
          <Segment
            options={STEP_OPTIONS}
            value={config.step_up}
            onChange={(v) => onChange({ ...config, step_up: v })}
            size="sm"
          />
        </Row>
        <Row label={t('led.field.step_down')}>
          <Segment
            options={STEP_OPTIONS}
            value={config.step_down}
            onChange={(v) => onChange({ ...config, step_down: v })}
            size="sm"
          />
        </Row>
        <Row label={t('led.field.delay_at_max')}>
          <Segment
            options={DELAY_OPTIONS}
            value={config.delay_at_max}
            onChange={(v) => onChange({ ...config, delay_at_max: v })}
            size="sm"
          />
        </Row>
        <Row label={t('led.field.delay_at_min')}>
          <Segment
            options={DELAY_OPTIONS}
            value={config.delay_at_min}
            onChange={(v) => onChange({ ...config, delay_at_min: v })}
            size="sm"
          />
        </Row>
      </div>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <span className="text-[11px] font-mono uppercase tracking-widest text-mute">
        {label}
      </span>
      {children}
    </div>
  );
}

function PresetGallery({
  onPick,
  t,
}: {
  onPick: (name: PresetName) => void;
  t: (key: string) => string;
}) {
  return (
    <Card title={t('led.animation.presets')}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {PRESET_ORDER.map((name) => {
          const cfg = PRESETS[name];
          return (
            <button
              key={name}
              type="button"
              onClick={() => onPick(name)}
              className="group flex flex-col items-start gap-1.5 px-3 py-2.5 rounded-md border border-border bg-bg hover:border-accent hover:text-accent transition text-left"
            >
              <PresetSpark config={cfg} />
              <span className="text-[11px] font-mono uppercase tracking-wide text-text group-hover:text-accent">
                {t(`led.preset.${name}`)}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function PresetSpark({ config }: { config: BreathConfig }) {
  // Sample the breath curve over ~3 seconds for a static thumbnail.
  const w = 100;
  const h = 16;
  const cycle = breathCycleSeconds(config);
  const samples = 40;
  const points = Array.from({ length: samples }, (_, i) => {
    const elapsed = (i / (samples - 1)) * Math.max(cycle, 0.1) * 1.5;
    const op = sampleBreath(config, elapsed);
    return `${((i / (samples - 1)) * w).toFixed(1)},${(h - op * h).toFixed(2)}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-4">
      <polyline points={points} fill="none" stroke="var(--color-accent)" strokeWidth={1.2} />
    </svg>
  );
}

function Ring({ opacity }: { opacity: number }) {
  const safe = Math.max(0, Math.min(1, opacity));
  return (
    <div className="flex items-center justify-center py-2">
      <div
        className="w-24 h-24 rounded-full border-[6px] transition-[box-shadow,background-color] duration-200"
        style={{
          borderColor: `rgba(88, 166, 255, ${(0.3 + safe * 0.7).toFixed(3)})`,
          boxShadow: safe > 0 ? `0 0 ${8 + safe * 24}px rgba(88,166,255,${(safe * 0.8).toFixed(3)})` : 'none',
          background: `rgba(88, 166, 255, ${(safe * 0.12).toFixed(3)})`,
        }}
      />
    </div>
  );
}

// ----- Breath simulation -----

function breathCycleSeconds(c: BreathConfig): number {
  return (
    STEP_SECONDS[c.step_up] +
    DELAY_MS[c.delay_at_max] / 1000 +
    STEP_SECONDS[c.step_down] +
    DELAY_MS[c.delay_at_min] / 1000
  );
}

function sampleBreath(c: BreathConfig, elapsedSec: number): number {
  const maxOp = BRIGHTNESS_PCT[c.max_brightness];
  const up = STEP_SECONDS[c.step_up];
  const holdMax = DELAY_MS[c.delay_at_max] / 1000;
  const down = STEP_SECONDS[c.step_down];
  const holdMin = DELAY_MS[c.delay_at_min] / 1000;
  const cycle = up + holdMax + down + holdMin || 0.0001;
  const t = elapsedSec % cycle;

  if (t < up) return maxOp * (t / up);
  if (t < up + holdMax) return maxOp;
  if (t < up + holdMax + down) {
    const td = t - (up + holdMax);
    return maxOp * (1 - td / down);
  }
  return 0;
}

function useBreathPreview(config: BreathConfig): number {
  const [op, setOp] = useState(0);
  const startRef = useRef(performance.now());

  useEffect(() => {
    startRef.current = performance.now();
  }, [config]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const elapsed = (performance.now() - startRef.current) / 1000;
      setOp(sampleBreath(config, elapsed));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [config]);

  return op;
}
