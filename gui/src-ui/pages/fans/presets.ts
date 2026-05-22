import type { CurvePoint } from '@/components/FanCurveEditor.helpers';

export type PresetName = 'Silent' | 'Balanced' | 'Aggressive';

export const PRESETS: Record<PresetName, CurvePoint[]> = {
  Silent: [
    { temp_c: 0, pwm: 0 },
    { temp_c: 55, pwm: 25 },
    { temp_c: 75, pwm: 55 },
    { temp_c: 90, pwm: 100 },
  ],
  Balanced: [
    { temp_c: 0, pwm: 0 },
    { temp_c: 45, pwm: 30 },
    { temp_c: 65, pwm: 55 },
    { temp_c: 80, pwm: 85 },
    { temp_c: 90, pwm: 100 },
  ],
  Aggressive: [
    { temp_c: 0, pwm: 30 },
    { temp_c: 40, pwm: 50 },
    { temp_c: 60, pwm: 75 },
    { temp_c: 75, pwm: 100 },
  ],
};

export const PRESET_ORDER: PresetName[] = ['Silent', 'Balanced', 'Aggressive'];
