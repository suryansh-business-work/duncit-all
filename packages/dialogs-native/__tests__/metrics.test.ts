import { describe, expect, it } from 'vitest';

import {
  CARD_MAX_WIDTH,
  MIN_HEIGHT,
  dialogMetrics,
  keyboardLift,
  type DialogMetricsInput,
} from '../src/index';

/** A roomy portrait phone with the keyboard shut. */
const base: DialogMetricsInput = {
  variant: 'sheet',
  windowHeight: 900,
  windowWidth: 400,
  topInset: 40,
  keyboardInset: 0,
  maxHeightRatio: 0.88,
};

const at = (over: Partial<DialogMetricsInput> = {}) => dialogMetrics({ ...base, ...over });

describe('dialogMetrics — anchoring', () => {
  it('a sheet is full-bleed and only clears the top inset once', () => {
    const m = at();
    // (900 - 0 - 40) * 0.88 = 756.8 -> 757
    expect(m.maxHeight).toBe(757);
    expect(m.cardWidth).toBe('100%');
    expect(m.cardMaxWidth).toBe(400);
  });

  it('a centred card clears the notch at both ends and is width-capped', () => {
    const m = at({ variant: 'center' });
    // (900 - 0 - 80) * 0.88 = 721.6 -> 722
    expect(m.maxHeight).toBe(722);
    expect(m.cardWidth).toBe('88%');
    expect(m.cardMaxWidth).toBe(CARD_MAX_WIDTH);
  });

  it('a sheet on a zero-width window still reports a positive max width', () => {
    expect(at({ windowWidth: 0 }).cardMaxWidth).toBe(1);
  });
});

describe('dialogMetrics — the keyboard', () => {
  it('shrinks the available height as well as lifting the dialog', () => {
    const shut = at();
    const open = at({ keyboardInset: 320 });
    expect(open.bottomLift).toBe(320);
    // Lifting alone would keep maxHeight at 757 and push the header off-screen.
    expect(open.maxHeight).toBeLessThan(shut.maxHeight);
    // (900 - 320 - 40) * 0.88 = 475.2 -> 475
    expect(open.maxHeight).toBe(475);
  });

  it('never reports a negative lift', () => {
    expect(at({ keyboardInset: -50 }).bottomLift).toBe(0);
  });
});

describe('dialogMetrics — the floors', () => {
  it('keeps a usable height when the keyboard all but fills a short window', () => {
    const m = at({ windowHeight: 400, keyboardInset: 380 });
    // usable would be -20, so the MIN_HEIGHT floor takes over.
    expect(m.maxHeight).toBe(MIN_HEIGHT);
  });

  it('keeps a usable height when the ratio would round below the floor', () => {
    // usable 260 * 0.2 = 52, floored to MIN_HEIGHT.
    expect(at({ windowHeight: 300, maxHeightRatio: 0.2 }).maxHeight).toBe(MIN_HEIGHT);
  });
});

describe('dialogMetrics — the ratio is clamped', () => {
  it('clamps a too-small ratio up to 0.2', () => {
    // (2000 - 40) * 0.2 = 392
    expect(at({ windowHeight: 2000, maxHeightRatio: 0 }).maxHeight).toBe(392);
    expect(at({ windowHeight: 2000, maxHeightRatio: -3 }).maxHeight).toBe(392);
  });

  it('clamps a too-large ratio down to the full usable height', () => {
    // (2000 - 40) * 1 = 1960
    expect(at({ windowHeight: 2000, maxHeightRatio: 4 }).maxHeight).toBe(1960);
  });

  it('honours a ratio that is already in range', () => {
    // (2000 - 40) * 0.5 = 980
    expect(at({ windowHeight: 2000, maxHeightRatio: 0.5 }).maxHeight).toBe(980);
  });
});

describe('keyboardLift', () => {
  it('is zero while the keyboard is shut', () => {
    expect(keyboardLift(0, 24)).toBe(0);
    expect(keyboardLift(-10, 24)).toBe(0);
  });

  it('subtracts the inset an ancestor already reserved', () => {
    expect(keyboardLift(320, 24)).toBe(296);
  });

  it('never goes negative when the inset exceeds a small floating keyboard', () => {
    expect(keyboardLift(10, 24)).toBe(0);
  });
});
