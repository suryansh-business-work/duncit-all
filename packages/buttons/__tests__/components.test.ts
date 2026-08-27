import { describe, it, expect } from 'vitest';
import type { Components, CSSObject, Theme } from '@mui/material/styles';
import { withPress } from '../src/components';
import { pressTransition, type PressColors } from '../src/press-css';

const COLORS: PressColors = { ink: '#1F2937', accent: '#E11D48' };
const INK_12 = 'rgba(31, 41, 55, 0.12)';
const FOCUS_KEY = '&.Mui-focusVisible, &:focus-visible';
const SOLID_ACTIVE = { transition: 'none', transform: 'scale(0.96)', filter: 'brightness(0.92)' };

type Bag = { styleOverrides?: Record<string, unknown> } & Record<string, unknown>;
const slotCss = (components: Components<Theme>, component: string, part: string): CSSObject =>
  (components as Record<string, Bag>)[component]?.styleOverrides?.[part] as CSSObject;
const active = (css: CSSObject): CSSObject => css['&:active'] as CSSObject;

describe('withPress', () => {
  const result = withPress({}, COLORS);

  it.each([
    ['MuiButton', 'text'],
    ['MuiButton', 'outlined'],
    ['MuiButton', 'contained'],
    ['MuiIconButton', 'root'],
    ['MuiToggleButton', 'root'],
    ['MuiListItemButton', 'root'],
    ['MuiMenuItem', 'root'],
    ['MuiTab', 'root'],
    ['MuiBottomNavigationAction', 'root'],
    ['MuiCardActionArea', 'root'],
    ['MuiFab', 'root'],
    ['MuiChip', 'clickable'],
  ])('gives %s.%s a press block, the shared transition and the focus ring', (component, part) => {
    const css = slotCss(result, component, part);
    expect(css.transition).toBe(pressTransition);
    expect(active(css).transition).toBe('none');
    expect(css[FOCUS_KEY]).toEqual({ outline: '2px solid #E11D48', outlineOffset: 2 });
  });

  it('contained buttons, Fabs and clickable chips darken their own fill (solid, no layer)', () => {
    for (const [component, part] of [
      ['MuiButton', 'contained'],
      ['MuiFab', 'root'],
      ['MuiChip', 'clickable'],
    ] as const) {
      expect(active(slotCss(result, component, part))).toEqual(SOLID_ACTIVE);
    }
  });

  it('text buttons press as ghost with an ink state layer', () => {
    expect(active(slotCss(result, 'MuiButton', 'text'))).toEqual({
      transition: 'none',
      transform: 'scale(0.94)',
      opacity: 0.75,
      backgroundColor: INK_12,
    });
  });

  it('outlined buttons press as control with an ink state layer', () => {
    expect(active(slotCss(result, 'MuiButton', 'outlined'))).toEqual({
      transition: 'none',
      transform: 'scale(0.96)',
      opacity: 0.85,
      backgroundColor: INK_12,
    });
  });

  it('rows (menu items, tabs, nav actions) dim without compressing', () => {
    for (const component of ['MuiMenuItem', 'MuiTab', 'MuiBottomNavigationAction']) {
      expect(active(slotCss(result, component, 'root'))).toEqual({
        transition: 'none',
        opacity: 0.7,
        backgroundColor: 'rgba(31, 41, 55, 0.1)',
      });
    }
  });

  it('card action areas press as surface with the faint 6% layer', () => {
    expect(active(slotCss(result, 'MuiCardActionArea', 'root'))).toEqual({
      transition: 'none',
      transform: 'scale(0.985)',
      opacity: 0.9,
      backgroundColor: 'rgba(31, 41, 55, 0.06)',
    });
  });

  it('toggle buttons and list item buttons darken their selected fill like a solid', () => {
    for (const component of ['MuiToggleButton', 'MuiListItemButton']) {
      expect(slotCss(result, component, 'root')['&.Mui-selected:active']).toEqual(SOLID_ACTIVE);
    }
  });

  it('icon buttons (root slot, but no selected fill) get no selected-state block', () => {
    expect(slotCss(result, 'MuiIconButton', 'root')['&.Mui-selected:active']).toBeUndefined();
  });

  it('gives every ButtonBase the release transition so checkboxes ease back too', () => {
    expect(slotCss(result, 'MuiButtonBase', 'root')).toEqual({ transition: pressTransition });
  });

  it('merges into an existing object slot, keeping its keys and its &:active siblings', () => {
    const themed = withPress(
      {
        MuiButton: {
          defaultProps: { disableElevation: true },
          styleOverrides: { text: { color: '#E11D48', '&:active': { outline: 'none' } } },
        },
      },
      COLORS
    );
    const text = slotCss(themed, 'MuiButton', 'text');
    expect(text.color).toBe('#E11D48');
    expect(active(text)).toMatchObject({ outline: 'none', opacity: 0.75, transition: 'none' });
    expect((themed as Record<string, Bag>).MuiButton.defaultProps).toEqual({
      disableElevation: true,
    });
  });

  it('wraps an existing function slot and merges its output when the theme resolves it', () => {
    const themed = withPress(
      { MuiButton: { styleOverrides: { contained: () => ({ letterSpacing: 1 }) } } },
      COLORS
    );
    const contained = (themed as Record<string, Bag>).MuiButton.styleOverrides?.contained as (
      props: never
    ) => CSSObject;
    const resolved = contained(undefined as never);
    expect(resolved.letterSpacing).toBe(1);
    expect(active(resolved)).toEqual(SOLID_ACTIVE);
  });

  it('merges an existing MuiButtonBase root instead of replacing it', () => {
    const themed = withPress(
      { MuiButtonBase: { styleOverrides: { root: { minWidth: 64 } } } },
      COLORS
    );
    expect(slotCss(themed, 'MuiButtonBase', 'root')).toEqual({
      minWidth: 64,
      transition: pressTransition,
    });
  });

  it('does not mutate the components object it was given', () => {
    const input: Components<Theme> = {
      MuiButton: { styleOverrides: { text: { color: '#E11D48' } } },
    };
    const before = JSON.stringify(input);
    withPress(input, COLORS);
    expect(JSON.stringify(input)).toBe(before);
  });
});
