export interface CurvePoint {
  temp_c: number;
  pwm: number;
}

export function sortPoints(points: CurvePoint[]): CurvePoint[] {
  return [...points].sort((a, b) => a.temp_c - b.temp_c);
}

export function clampPoint(p: CurvePoint): CurvePoint {
  return {
    temp_c: Math.max(0, Math.min(100, p.temp_c)),
    pwm: Math.max(0, Math.min(100, p.pwm)),
  };
}

export function svgToTemp(x: number, width: number): number {
  return (x / width) * 100;
}

export function svgToPwm(y: number, height: number): number {
  return 100 - (y / height) * 100;
}

export function tempToSvg(temp: number, width: number): number {
  return (temp / 100) * width;
}

export function pwmToSvg(pwm: number, height: number): number {
  return height - (pwm / 100) * height;
}

/**
 * Linear interpolation along the curve. Mirrors the Rust pwm_at so the
 * web preview matches what the daemon will see.
 */
export function pwmAt(points: CurvePoint[], temp: number): number {
  if (points.length === 0) return 0;
  const sorted = sortPoints(points);
  if (temp <= sorted[0].temp_c) return sorted[0].pwm;
  const last = sorted[sorted.length - 1];
  if (temp >= last.temp_c) return last.pwm;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (temp >= a.temp_c && temp <= b.temp_c) {
      const span = b.temp_c - a.temp_c;
      const t = span > 0 ? (temp - a.temp_c) / span : 0;
      return Math.round(a.pwm + (b.pwm - a.pwm) * t);
    }
  }
  return last.pwm;
}
