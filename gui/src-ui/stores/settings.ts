import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TempUnit = 'celsius' | 'fahrenheit';
export type Language = 'en' | 'ru' | 'zh';
export type PollInterval = 1 | 2 | 5;
export type HistoryWindow = 5 | 30 | 120;

export interface Settings {
  language: Language;
  tempUnit: TempUnit;
  launchAtStartup: boolean;
  startMinimized: boolean;
  closeToTray: boolean;
  showTrayIcon: boolean;
  pollIntervalSec: PollInterval;
  historyWindowMin: HistoryWindow;
  autoCheckUpdates: boolean;
  verboseLogging: boolean;
}

interface SettingsState extends Settings {
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const DEFAULTS: Settings = {
  language: 'en',
  tempUnit: 'celsius',
  launchAtStartup: false,
  startMinimized: false,
  closeToTray: true,
  showTrayIcon: true,
  pollIntervalSec: 2,
  historyWindowMin: 30,
  autoCheckUpdates: true,
  verboseLogging: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (key, value) => set({ [key]: value } as Partial<SettingsState>),
    }),
    { name: 'lecoo-settings' },
  ),
);
