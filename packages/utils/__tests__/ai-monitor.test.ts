import { describe, expect, it } from 'vitest';
import { AI_MONITOR_GRADIENT, AI_MONITOR_GRADIENT_CSS } from '../src/ai-monitor';

/** Every `#rrggbb` stop in a CSS gradient string, in the order it is painted. */
const cssStops = (css: string): string[] => css.match(/#[\dA-Fa-f]{6}/g) ?? [];

describe('AI_MONITOR_GRADIENT', () => {
  // The exact stops ARE the rule: the chip on every Create Pod step and the
  // overlay behind the Create Pod button have to read as the same feature, so
  // the brand look is pinned here rather than re-typed in four components.
  it('runs violet → pink → amber, in gradient order', () => {
    expect(AI_MONITOR_GRADIENT).toEqual(['#7C3AED', '#EC4899', '#F59E0B']);
  });

  // Native hands the tuple straight to expo-linear-gradient, which needs at
  // least two parseable colours — a stop it cannot parse renders transparent.
  it('is a tuple of three six-digit hex colours expo-linear-gradient can parse', () => {
    expect(AI_MONITOR_GRADIENT).toHaveLength(3);
    for (const stop of AI_MONITOR_GRADIENT) {
      expect(stop).toMatch(/^#[\dA-F]{6}$/);
    }
  });

  // Three DISTINCT stops, pinned as a count rather than `size === length` —
  // that form is satisfied by an empty or single-stop tuple, which is exactly
  // the degenerate gradient (one flat band) this rule is meant to rule out.
  it('paints three distinct bands — no stop repeats another', () => {
    expect(new Set(AI_MONITOR_GRADIENT).size).toBe(3);
  });
});

describe('AI_MONITOR_GRADIENT_CSS', () => {
  it('is the value MUI surfaces drop into `background` unchanged', () => {
    expect(AI_MONITOR_GRADIENT_CSS).toBe('linear-gradient(120deg, #7C3AED, #EC4899, #F59E0B)');
  });

  // Rule 40: the mWeb chip/backdrop and the native chip/overlay are four
  // renders of ONE gradient. The CSS value must carry exactly the tuple's
  // stops, in the tuple's order, with nothing extra — otherwise mWeb and
  // native drift apart on the look that is supposed to identify the feature.
  it('paints exactly the same stops as the native tuple, in the same order', () => {
    expect(cssStops(AI_MONITOR_GRADIENT_CSS)).toEqual([...AI_MONITOR_GRADIENT]);
  });

  it('is a linear gradient, not a radial or conic one', () => {
    expect(AI_MONITOR_GRADIENT_CSS.startsWith('linear-gradient(')).toBe(true);
    expect(AI_MONITOR_GRADIENT_CSS.endsWith(')')).toBe(true);
  });
});
