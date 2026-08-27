import { describe, it, expect } from 'vitest';
import type { CSSObject } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { pressColorsOf, pressFor, restStatesCss } from '../src/state-css';
import { pressCss, pressTransition } from '../src/press-css';

// Hex ink/accent so the state layers resolve to concrete rgba values.
const theme = createTheme({
  palette: { text: { primary: '#111827' }, primary: { main: '#E11D48' } },
});

describe('pressColorsOf', () => {
  it('reads ink from text.primary and accent from primary.main', () => {
    expect(pressColorsOf(theme)).toEqual({ ink: '#111827', accent: '#E11D48' });
  });
});

describe('restStatesCss', () => {
  it('carries the accent focus ring for the mounted theme', () => {
    const css = restStatesCss(theme);
    expect(css['&.Mui-focusVisible, &:focus-visible']).toEqual({
      outline: '2px solid #E11D48',
      outlineOffset: 2,
    });
  });

  it('keeps a loading button at full colour with a progress cursor', () => {
    const css = restStatesCss(theme);
    expect(css['&.MuiButton-loading, &.MuiIconButton-loading']).toEqual({
      opacity: 1,
      cursor: 'progress',
    });
  });
});

describe('pressFor', () => {
  it('is pressCss for the theme colours when no options are given', () => {
    expect(pressFor(theme, 'solid')).toEqual(
      pressCss('solid', { ink: '#111827', accent: '#E11D48' })
    );
  });

  it('threads the tint option through to the state layer', () => {
    const css = pressFor(theme, 'ghost', { tint: 'ink' });
    const activeBlock = css['&:active'] as CSSObject;
    expect(activeBlock.backgroundColor).toBe('rgba(17, 24, 39, 0.12)');
    expect(css.transition).toBe(pressTransition);
  });
});
