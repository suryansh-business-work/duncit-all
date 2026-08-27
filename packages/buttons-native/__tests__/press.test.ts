import { describe, expect, it } from 'vitest';
import {
  DISABLED_OPACITY,
  PRESS,
  PRESS_INTENTS,
  PRESS_RELEASE_MS,
  TOUCH_TARGET,
  type PressIntent,
} from '../src/intents';
import { PRESS_STYLE, pressStyle } from '../src/press';

describe('press recipe', () => {
  it('lists every intent exactly once, in weight order', () => {
    expect(PRESS_INTENTS).toEqual(['solid', 'control', 'ghost', 'surface', 'row', 'inline']);
    expect(new Set(PRESS_INTENTS).size).toBe(PRESS_INTENTS.length);
  });

  it('carries a full recipe for every intent', () => {
    for (const intent of PRESS_INTENTS) {
      const recipe = PRESS[intent];
      expect(recipe.opacity).toBeGreaterThan(0);
      expect(recipe.opacity).toBeLessThanOrEqual(1);
      expect(recipe.scale).toBeGreaterThan(0);
      expect(recipe.scale).toBeLessThanOrEqual(1);
      expect(recipe.tint).toBeGreaterThanOrEqual(0);
      expect(recipe.brightness).toBeGreaterThan(0);
      expect(recipe.brightness).toBeLessThanOrEqual(1);
    }
  });

  it('keeps the six hand-grown app opacities, named', () => {
    expect(PRESS.solid.opacity).toBe(1);
    expect(PRESS.control.opacity).toBe(0.85);
    expect(PRESS.ghost.opacity).toBe(0.75);
    expect(PRESS.surface.opacity).toBe(0.9);
    expect(PRESS.row.opacity).toBe(0.7);
    expect(PRESS.inline.opacity).toBe(0.6);
  });

  it('only solid darkens its own fill instead of dimming', () => {
    expect(PRESS.solid.brightness).toBeLessThan(1);
    for (const intent of PRESS_INTENTS.filter((i) => i !== 'solid')) {
      expect(PRESS[intent].brightness).toBe(1);
    }
  });

  it('never compresses rows or inline links', () => {
    expect(PRESS.row.scale).toBe(1);
    expect(PRESS.inline.scale).toBe(1);
  });

  it('is frozen — a call site cannot re-tune the system', () => {
    expect(Object.isFrozen(PRESS)).toBe(true);
    for (const intent of PRESS_INTENTS) {
      expect(Object.isFrozen(PRESS[intent])).toBe(true);
    }
  });

  it('publishes the shared timing, disabled and touch-target constants', () => {
    expect(PRESS_RELEASE_MS).toBe(160);
    expect(DISABLED_OPACITY).toBe(0.45);
    expect(TOUCH_TARGET).toBe(44);
  });
});

describe('PRESS_STYLE', () => {
  it('derives each style from the matching recipe', () => {
    expect(PRESS_STYLE.control).toEqual({
      opacity: PRESS.control.opacity,
      scale: PRESS.control.scale,
    });
    expect(PRESS_STYLE.ghost).toEqual({ opacity: PRESS.ghost.opacity, scale: PRESS.ghost.scale });
    expect(PRESS_STYLE.surface).toEqual({
      opacity: PRESS.surface.opacity,
      scale: PRESS.surface.scale,
    });
  });

  it('gives solid only a scale — its dim is a fill change, not an opacity', () => {
    expect(PRESS_STYLE.solid).toEqual({ scale: PRESS.solid.scale });
    expect('opacity' in PRESS_STYLE.solid).toBe(false);
  });

  it('gives row and inline only an opacity — they never compress', () => {
    expect(PRESS_STYLE.row).toEqual({ opacity: PRESS.row.opacity });
    expect(PRESS_STYLE.inline).toEqual({ opacity: PRESS.inline.opacity });
    expect('scale' in PRESS_STYLE.row).toBe(false);
    expect('scale' in PRESS_STYLE.inline).toBe(false);
  });

  it('is frozen so Tamagui diffs one shared object, never a fresh literal', () => {
    expect(Object.isFrozen(PRESS_STYLE)).toBe(true);
    for (const intent of PRESS_INTENTS) {
      expect(Object.isFrozen(PRESS_STYLE[intent])).toBe(true);
    }
  });
});

describe('pressStyle', () => {
  it('returns the shared style object for an enabled control', () => {
    for (const intent of PRESS_INTENTS) {
      expect(pressStyle(intent, false)).toBe(PRESS_STYLE[intent]);
    }
  });

  it('defaults to enabled when disabled is not passed', () => {
    expect(pressStyle('surface')).toBe(PRESS_STYLE.surface);
  });

  it('drops the style entirely for a disabled control', () => {
    const intents: PressIntent[] = ['solid', 'row'];
    for (const intent of intents) {
      expect(pressStyle(intent, true)).toBeUndefined();
    }
  });
});
