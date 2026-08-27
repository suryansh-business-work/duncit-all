import { describe, it, expect } from 'vitest';
import type { CSSObject } from '@mui/material/styles';
import { PRESS, PRESS_INTENTS, PRESS_RELEASE_MS } from '@duncit/buttons-native';
import {
  focusRingCss,
  pressCss,
  pressTransition,
  type PressColors,
} from '../src/press-css';

// Duncit brand-ish hex pair so withAlpha resolves to real rgba layers.
const COLORS: PressColors = { ink: '#1F2937', accent: '#E11D48' };
const active = (css: CSSObject): CSSObject => css['&:active'] as CSSObject;

describe('pressTransition', () => {
  it('eases every animatable channel over the shared release duration', () => {
    for (const channel of ['transform', 'opacity', 'background-color', 'filter', 'box-shadow']) {
      expect(pressTransition).toContain(
        `${channel} ${PRESS_RELEASE_MS}ms cubic-bezier(0.2, 0, 0, 1)`
      );
    }
  });
});

describe('pressCss', () => {
  it('carries the rest transition and an instant press-down for every intent', () => {
    for (const intent of PRESS_INTENTS) {
      const css = pressCss(intent, COLORS);
      expect(css.transition).toBe(pressTransition);
      expect(active(css).transition).toBe('none');
    }
  });

  it('solid darkens its own fill instead of dimming or tinting', () => {
    const css = pressCss('solid', COLORS);
    expect(active(css)).toEqual({
      transition: 'none',
      transform: `scale(${PRESS.solid.scale})`,
      filter: `brightness(${PRESS.solid.brightness})`,
    });
  });

  it('control with an ink layer compresses, dims and paints the state layer', () => {
    const css = pressCss('control', COLORS, { tint: 'ink' });
    expect(active(css)).toEqual({
      transition: 'none',
      transform: 'scale(0.96)',
      opacity: 0.85,
      backgroundColor: 'rgba(31, 41, 55, 0.12)',
    });
  });

  it('ghost with an accent layer tints with the accent colour', () => {
    const css = pressCss('ghost', COLORS, { tint: 'accent' });
    expect(active(css)).toEqual({
      transition: 'none',
      transform: 'scale(0.94)',
      opacity: 0.75,
      backgroundColor: 'rgba(225, 29, 72, 0.12)',
    });
  });

  it('row never compresses — no transform even with a layer', () => {
    const css = pressCss('row', COLORS, { tint: 'ink' });
    expect(active(css)).toEqual({
      transition: 'none',
      opacity: 0.7,
      backgroundColor: 'rgba(31, 41, 55, 0.1)',
    });
    expect(active(css).transform).toBeUndefined();
  });

  it('inline paints no layer even when a tint source is given (recipe tint is 0)', () => {
    const css = pressCss('inline', COLORS, { tint: 'ink' });
    expect(active(css)).toEqual({ transition: 'none', opacity: 0.6 });
  });

  it('surface without a tint option compresses and dims but paints no layer', () => {
    const css = pressCss('surface', COLORS);
    expect(active(css)).toEqual({
      transition: 'none',
      transform: 'scale(0.985)',
      opacity: 0.9,
    });
  });

  it('an explicit tint: "none" behaves exactly like the default', () => {
    expect(pressCss('control', COLORS, { tint: 'none' })).toEqual(pressCss('control', COLORS, {}));
  });

  it('pins a disabled control while held: no transform, no filter', () => {
    const css = pressCss('solid', COLORS);
    expect(css['&.Mui-disabled:active, &:disabled:active']).toEqual({
      transform: 'none',
      filter: 'none',
    });
  });

  it('hands a non-hex ink back untouched as the layer colour', () => {
    const css = pressCss('control', { ink: 'rgba(0, 0, 0, 0.87)', accent: '#E11D48' }, { tint: 'ink' });
    expect(active(css).backgroundColor).toBe('rgba(0, 0, 0, 0.87)');
  });
});

describe('focusRingCss', () => {
  it('draws the 2px accent ring on both focus-visible spellings', () => {
    const css = focusRingCss(COLORS);
    expect(css['&.Mui-focusVisible, &:focus-visible']).toEqual({
      outline: '2px solid #E11D48',
      outlineOffset: 2,
    });
  });
});
