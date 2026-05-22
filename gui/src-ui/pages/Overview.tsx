import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTelemetryStore } from '@/stores/telemetry';
import { StatTile } from '@/components/StatTile';
import { TempChart } from '@/components/TempChart';
import { ProfileSwitcher, type PowerProfile } from '@/components/ProfileSwitcher';

type RangeKey = '30s' | '60s' | '5m' | '30m';
const RANGE_SECONDS: Record<RangeKey, number> = {
  '30s': 30,
  '60s': 60,
  '5m': 300,
  '30m': 1800,
};
const RANGE_ORDER: RangeKey[] = ['30s', '60s', '5m', '30m'];

const SPARK_WINDOW = 60; // last 60 samples ≈ 1 minute @ 1 Hz

export default function Overview() {
  const { t } = useTranslation();
  const latest = useTelemetryStore((s) => s.latest);
  const history = useTelemetryStore((s) => s.history);
  const [profile, setProfile] = useState<PowerProfile>('Default');
  const [range, setRange] = useState<RangeKey>('60s');

  const spark = useMemo(() => history.slice(-SPARK_WINDOW), [history]);
  const cpuSpark = useMemo(() => spark.map((s) => s.cpuTempC), [spark]);
  const sysSpark = useMemo(() => spark.map((s) => s.sysTempC), [spark]);
  const cpuFanSpark = useMemo(() => spark.map((s) => s.cpuFanRpm), [spark]);
  const gpuFanSpark = useMemo(() => spark.map((s) => s.gpuFanRpm), [spark]);

  const ageSec = useMemo(() => {
    if (!latest) return null;
    return Math.max(0, Math.floor((Date.now() - latest.timestampMs) / 1000));
  }, [latest]);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-strong tracking-tight">
            {t('overview.title')}
          </h1>
          <p className="text-xs text-mute font-mono mt-0.5">
            {t('overview.subtitle')}
            {ageSec !== null ? ` · ${t('overview.updated', { secs: ageSec })}` : ''}
          </p>
        </div>
        <ProfileSwitcher current={profile} onChange={setProfile} />
      </header>

      {!latest ? (
        <div className="bg-bg-elev border border-border rounded-xl px-4 py-6 text-mute font-mono text-xs">
          {t('overview.no_data')}
        </div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile
          label={t('overview.stat.cpu')}
          value={latest ? Math.round(latest.cpuTempC) : '—'}
          unit="°C"
          history={cpuSpark}
          color="var(--color-warn)"
          variant={latest && latest.cpuTempC >= 85 ? 'warn' : 'default'}
        />
        <StatTile
          label={t('overview.stat.system')}
          value={latest ? Math.round(latest.sysTempC) : '—'}
          unit="°C"
          history={sysSpark}
          color="var(--color-accent)"
        />
        <StatTile
          label={t('overview.stat.cpu_fan')}
          value={latest ? latest.cpuFanRpm : '—'}
          unit="rpm"
          history={cpuFanSpark}
          color="var(--color-purple)"
        />
        <StatTile
          label={t('overview.stat.gpu_fan')}
          value={latest ? latest.gpuFanRpm : '—'}
          unit="rpm"
          history={gpuFanSpark}
          color="var(--color-purple)"
        />
      </div>

      <div className="bg-bg-elev border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-mono uppercase tracking-widest text-mute">
            {t('overview.chart.title')}
          </span>
          <RangePills value={range} onChange={setRange} t={t} />
        </div>
        <TempChart samples={history} rangeSeconds={RANGE_SECONDS[range]} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FansSummaryCard
          title={t('overview.fans.title')}
          cpu={latest?.cpuFanRpm ?? 0}
          gpu={latest?.gpuFanRpm ?? 0}
        />
        <BatteryCard title={t('overview.battery.title')} />
      </div>
    </div>
  );
}

function RangePills({
  value,
  onChange,
  t,
}: {
  value: RangeKey;
  onChange: (k: RangeKey) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="inline-flex gap-0.5 bg-bg border border-border p-0.5 rounded-md">
      {RANGE_ORDER.map((k) => {
        const active = k === value;
        return (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k)}
            className={
              'px-2.5 py-1 text-[10px] font-mono uppercase tracking-wide rounded ' +
              (active ? 'bg-accent text-white' : 'text-mute hover:text-text')
            }
          >
            {t(`overview.chart.range.${k}`)}
          </button>
        );
      })}
    </div>
  );
}

function FansSummaryCard({
  title,
  cpu,
  gpu,
}: {
  title: string;
  cpu: number;
  gpu: number;
}) {
  // The Lenovo Legion fans top out around 6000 rpm in our boards.
  const max = 6000;
  const cpuPct = Math.min(100, (cpu / max) * 100);
  const gpuPct = Math.min(100, (gpu / max) * 100);

  return (
    <div className="bg-bg-elev border border-border rounded-xl p-4 flex flex-col gap-3">
      <span className="text-[11px] font-mono uppercase tracking-widest text-mute">{title}</span>
      <FanBar label="CPU" rpm={cpu} pct={cpuPct} />
      <FanBar label="GPU" rpm={gpu} pct={gpuPct} />
    </div>
  );
}

function FanBar({ label, rpm, pct }: { label: string; rpm: number; pct: number }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] font-mono mb-1">
        <span className="text-mute">{label}</span>
        <span className="text-text-strong tabular-nums">{rpm} rpm</span>
      </div>
      <div className="h-1.5 bg-bg rounded-full overflow-hidden border border-border">
        <div
          className="h-full bg-gradient-to-r from-accent to-purple transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function BatteryCard({ title }: { title: string }) {
  // Wired to the daemon in Phase 4 (battery page).
  return (
    <div className="bg-bg-elev border border-border rounded-xl p-4 flex flex-col gap-3">
      <span className="text-[11px] font-mono uppercase tracking-widest text-mute">{title}</span>
      <div className="text-xs text-mute font-mono">wired in Phase 4</div>
    </div>
  );
}
