import { create } from 'zustand';

export interface TelemetrySample {
  cpuTempC: number;
  sysTempC: number;
  cpuFanRpm: number;
  gpuFanRpm: number;
  timestampMs: number;
}

interface TelemetryState {
  latest: TelemetrySample | null;
  history: TelemetrySample[];
  maxHistory: number;
  push: (s: TelemetrySample) => void;
  setMaxHistory: (n: number) => void;
}

// 30 min @ 1 Hz is enough for the longest range pill on the Overview chart.
const DEFAULT_MAX_HISTORY = 1800;

export const useTelemetryStore = create<TelemetryState>((set) => ({
  latest: null,
  history: [],
  maxHistory: DEFAULT_MAX_HISTORY,
  push: (s) =>
    set((state) => {
      const next = state.history.length >= state.maxHistory
        ? [...state.history.slice(state.history.length - state.maxHistory + 1), s]
        : [...state.history, s];
      return { latest: s, history: next };
    }),
  setMaxHistory: (n) => set({ maxHistory: Math.max(60, n) }),
}));
