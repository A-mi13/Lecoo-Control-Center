import { describe, it, expect } from 'vitest';
import {
  sortPoints,
  clampPoint,
  svgToTemp,
  svgToPwm,
  tempToSvg,
  pwmToSvg,
  pwmAt,
} from './FanCurveEditor.helpers';

describe('sortPoints', () => {
  it('orders by temp ascending', () => {
    expect(
      sortPoints([
        { temp_c: 80, pwm: 1 },
        { temp_c: 30, pwm: 1 },
      ]),
    ).toEqual([
      { temp_c: 30, pwm: 1 },
      { temp_c: 80, pwm: 1 },
    ]);
  });

  it('returns a new array', () => {
    const input = [{ temp_c: 30, pwm: 1 }];
    const out = sortPoints(input);
    expect(out).not.toBe(input);
  });
});

describe('clampPoint', () => {
  it('clamps temp and pwm to 0..100', () => {
    expect(clampPoint({ temp_c: -5, pwm: 120 })).toEqual({ temp_c: 0, pwm: 100 });
    expect(clampPoint({ temp_c: 200, pwm: -10 })).toEqual({ temp_c: 100, pwm: 0 });
  });
});

describe('coordinate mapping', () => {
  it('svgToTemp maps half width to 50', () => {
    expect(svgToTemp(350, 700)).toBe(50);
  });
  it('svgToPwm inverts y axis', () => {
    expect(svgToPwm(0, 200)).toBe(100);
    expect(svgToPwm(200, 200)).toBe(0);
  });
  it('tempToSvg is the inverse of svgToTemp', () => {
    expect(tempToSvg(50, 700)).toBe(350);
  });
  it('pwmToSvg is the inverse of svgToPwm', () => {
    expect(pwmToSvg(100, 200)).toBe(0);
    expect(pwmToSvg(0, 200)).toBe(200);
  });
});

describe('pwmAt', () => {
  const curve = [
    { temp_c: 40, pwm: 30 },
    { temp_c: 80, pwm: 80 },
  ];

  it('returns first pwm below the first point', () => {
    expect(pwmAt(curve, 10)).toBe(30);
  });
  it('returns last pwm above the last point', () => {
    expect(pwmAt(curve, 90)).toBe(80);
  });
  it('interpolates at the midpoint', () => {
    expect(pwmAt(curve, 60)).toBe(55);
  });
  it('handles unsorted input', () => {
    expect(pwmAt([{ temp_c: 80, pwm: 80 }, { temp_c: 40, pwm: 30 }], 60)).toBe(55);
  });
});
