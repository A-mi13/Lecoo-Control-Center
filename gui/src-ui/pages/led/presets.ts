// Mirrors the named presets in ipc::BreathConfig (daemon/src/ipc/structs.rs).

export type Brightness = 'Max25Percent' | 'Max50Percent' | 'Max75Percent' | 'Max100Percent';
export type Step = 'Slow' | 'Medium' | 'Fast' | 'Instant';
export type Delay = 'Ms15' | 'Ms125' | 'Ms250' | 'Sec0_5' | 'Sec1' | 'Sec2' | 'Sec4';

export interface BreathConfig {
  max_brightness: Brightness;
  step_up: Step;
  step_down: Step;
  delay_at_max: Delay;
  delay_at_min: Delay;
}

export type PresetName =
  | 'smooth'
  | 'sleep'
  | 'alert'
  | 'zen'
  | 'ping'
  | 'energetic'
  | 'warning'
  | 'vacuum'
  | 'panic'
  | 'sonar'
  | 'toxic';

export const PRESETS: Record<PresetName, BreathConfig> = {
  smooth: {
    max_brightness: 'Max75Percent',
    step_up: 'Medium',
    step_down: 'Medium',
    delay_at_max: 'Ms250',
    delay_at_min: 'Ms250',
  },
  sleep: {
    max_brightness: 'Max25Percent',
    step_up: 'Slow',
    step_down: 'Slow',
    delay_at_max: 'Sec0_5',
    delay_at_min: 'Sec1',
  },
  alert: {
    max_brightness: 'Max75Percent',
    step_up: 'Instant',
    step_down: 'Instant',
    delay_at_max: 'Ms125',
    delay_at_min: 'Ms125',
  },
  zen: {
    max_brightness: 'Max50Percent',
    step_up: 'Slow',
    step_down: 'Slow',
    delay_at_max: 'Sec1',
    delay_at_min: 'Sec1',
  },
  ping: {
    max_brightness: 'Max100Percent',
    step_up: 'Instant',
    step_down: 'Slow',
    delay_at_max: 'Ms15',
    delay_at_min: 'Sec0_5',
  },
  energetic: {
    max_brightness: 'Max100Percent',
    step_up: 'Fast',
    step_down: 'Medium',
    delay_at_max: 'Ms125',
    delay_at_min: 'Ms125',
  },
  warning: {
    max_brightness: 'Max100Percent',
    step_up: 'Fast',
    step_down: 'Fast',
    delay_at_max: 'Ms15',
    delay_at_min: 'Ms15',
  },
  vacuum: {
    max_brightness: 'Max75Percent',
    step_up: 'Slow',
    step_down: 'Instant',
    delay_at_max: 'Sec1',
    delay_at_min: 'Ms250',
  },
  panic: {
    max_brightness: 'Max100Percent',
    step_up: 'Instant',
    step_down: 'Instant',
    delay_at_max: 'Ms15',
    delay_at_min: 'Ms15',
  },
  sonar: {
    max_brightness: 'Max25Percent',
    step_up: 'Fast',
    step_down: 'Slow',
    delay_at_max: 'Sec0_5',
    delay_at_min: 'Sec2',
  },
  toxic: {
    max_brightness: 'Max50Percent',
    step_up: 'Fast',
    step_down: 'Slow',
    delay_at_max: 'Ms250',
    delay_at_min: 'Sec1',
  },
};

export const PRESET_ORDER: PresetName[] = [
  'smooth',
  'sleep',
  'zen',
  'sonar',
  'ping',
  'energetic',
  'alert',
  'warning',
  'panic',
  'vacuum',
  'toxic',
];

export const BRIGHTNESS_OPTIONS: { label: string; value: Brightness }[] = [
  { label: '25%', value: 'Max25Percent' },
  { label: '50%', value: 'Max50Percent' },
  { label: '75%', value: 'Max75Percent' },
  { label: '100%', value: 'Max100Percent' },
];

export const STEP_OPTIONS: { label: string; value: Step }[] = [
  { label: 'Slow', value: 'Slow' },
  { label: 'Medium', value: 'Medium' },
  { label: 'Fast', value: 'Fast' },
  { label: 'Instant', value: 'Instant' },
];

export const DELAY_OPTIONS: { label: string; value: Delay }[] = [
  { label: '15ms', value: 'Ms15' },
  { label: '125ms', value: 'Ms125' },
  { label: '250ms', value: 'Ms250' },
  { label: '0.5s', value: 'Sec0_5' },
  { label: '1s', value: 'Sec1' },
  { label: '2s', value: 'Sec2' },
  { label: '4s', value: 'Sec4' },
];

// Numeric values for the live preview only (the daemon doesn't expose timings;
// these are best-effort approximations to make the simulated breath feel close).
export const BRIGHTNESS_PCT: Record<Brightness, number> = {
  Max25Percent: 0.25,
  Max50Percent: 0.5,
  Max75Percent: 0.75,
  Max100Percent: 1,
};

// Step → seconds per full fade. Mirrors the qualitative ordering in the daemon.
export const STEP_SECONDS: Record<Step, number> = {
  Slow: 2.0,
  Medium: 1.0,
  Fast: 0.4,
  Instant: 0.05,
};

export const DELAY_MS: Record<Delay, number> = {
  Ms15: 15,
  Ms125: 125,
  Ms250: 250,
  Sec0_5: 500,
  Sec1: 1000,
  Sec2: 2000,
  Sec4: 4000,
};
