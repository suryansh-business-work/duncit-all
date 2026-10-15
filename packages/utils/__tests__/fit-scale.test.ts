import { describe, expect, it } from 'vitest';
import { fitScale, fitSize } from '../src/fit-scale';

describe('fitScale', () => {
  it('shrinks the design to the available height when nothing is fixed', () => {
    expect(fitScale(600, 800, 0.5, 1)).toBe(0.75);
  });

  it('takes the ratio over the part that can scale, so fixed parts still fit', () => {
    // 200 of the 800 is fixed: 600 flexible must fit in 600 - 200 = 400.
    expect(fitScale(600, 800, 0.1, 1, 200)).toBeCloseTo(400 / 600);
    // The naive whole-design ratio would leave the screen too tall.
    const scale = fitScale(600, 800, 0.1, 1, 200);
    expect(200 + (800 - 200) * scale).toBeCloseTo(600);
  });

  it('never shrinks below the readable minimum — the screen scrolls instead', () => {
    expect(fitScale(100, 800, 0.6, 1)).toBe(0.6);
    expect(fitScale(150, 800, 0.6, 1, 200)).toBe(0.6);
  });

  it('never grows past the maximum', () => {
    expect(fitScale(2000, 800, 0.5, 1)).toBe(1);
    expect(fitScale(2000, 800, 0.5, 1.2)).toBe(1.2);
  });

  it('grows between the bounds when there is room and the maximum allows', () => {
    expect(fitScale(880, 800, 0.5, 1.5)).toBeCloseTo(1.1);
  });

  it('answers the maximum when there is nothing to scale or an input is not finite', () => {
    expect(fitScale(600, 200, 0.5, 1, 200)).toBe(1);
    expect(fitScale(600, 200, 0.5, 1, 300)).toBe(1);
    expect(fitScale(Number.NaN, 800, 0.5, 1)).toBe(1);
    expect(fitScale(Number.POSITIVE_INFINITY, 800, 0.5, 1)).toBe(1);
    expect(fitScale(600, Number.NaN, 0.5, 1)).toBe(1);
    expect(fitScale(600, 800, 0.5, 1, Number.NaN)).toBe(1);
  });
});

describe('fitSize', () => {
  it('scales a design size and rounds to a whole pixel', () => {
    expect(fitSize(24, 0.75)).toBe(18);
    expect(fitSize(15, 0.5)).toBe(8);
    expect(fitSize(10, 0.44)).toBe(4);
  });

  it('never goes under its floor', () => {
    expect(fitSize(32, 0.4, 20)).toBe(20);
    expect(fitSize(32, 1, 20)).toBe(32);
  });

  it('floors at 0 by default', () => {
    expect(fitSize(10, 0)).toBe(0);
    expect(fitSize(10, -1)).toBe(0);
  });
});
