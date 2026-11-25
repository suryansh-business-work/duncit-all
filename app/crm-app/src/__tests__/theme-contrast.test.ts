import accent from '../../crm-accent.json';
import { crmTheme } from '../../tamagui.config';
import { activeTabInk } from '@/navigation/chrome';

/**
 * WCAG 2.2 AA for the Duncit CRM red (#D8102D) in light AND dark mode: every
 * text/background pair the app paints clears 4.5:1, icons 3:1. Translucent
 * washes (the selected tab pill, chips) are composited over the surface they
 * sit on before measuring, because that is what the eye sees.
 */

type Rgb = [number, number, number];

function parse(color: string): { rgb: Rgb; alpha: number } {
  const rgba = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(color);
  if (rgba) {
    const [, r = '0', g = '0', b = '0', a] = rgba;
    return { rgb: [Number(r), Number(g), Number(b)], alpha: a ? Number(a) : 1 };
  }
  const hex = color.replace('#', '');
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex.slice(0, 6);
  const channel = (i: number) => parseInt(full.slice(i, i + 2), 16);
  return { rgb: [channel(0), channel(2), channel(4)], alpha: 1 };
}

/** A colour as seen over an opaque ground. */
function over(color: string, ground: string): Rgb {
  const { rgb, alpha } = parse(color);
  const [br, bg, bb] = parse(ground).rgb;
  const mix = (c: number, base: number) => Math.round(c * alpha + base * (1 - alpha));
  return [mix(rgb[0], br), mix(rgb[1], bg), mix(rgb[2], bb)];
}

function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(fg: Rgb, bg: Rgb): number {
  const [lf, lb] = [luminance(fg), luminance(bg)];
  return (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05);
}

const TEXT = 4.5;
const ICON = 3;

it('uses #D8102D as the CRM accent', () => {
  expect(accent.main.toLowerCase()).toBe('#d8102d');
});

describe.each(['light', 'dark'] as const)('%s mode', (mode) => {
  const t = crmTheme(mode);
  const solid = (c: string) => parse(c).rgb;

  it('white on the red fill (buttons, the app bar, the call button) clears 4.5:1, pressed states too', () => {
    for (const fill of [t.primary, t.primaryHover, t.primaryPress])
      expect(contrast(solid(t.onPrimary), solid(fill))).toBeGreaterThanOrEqual(TEXT);
  });

  it('red text and icons read on every ground of the mode', () => {
    for (const ground of [t.background, t.surface, t.soft])
      expect(contrast(solid(t.accentText), solid(ground))).toBeGreaterThanOrEqual(TEXT);
  });

  it('the current tab reads on its soft red pill', () => {
    const pill = over(t.primarySoft, t.surface);
    expect(contrast(solid(activeTabInk(mode)), pill)).toBeGreaterThanOrEqual(TEXT);
  });

  it('initials on the avatar wash and the "CRM Contact" chip read', () => {
    expect(contrast(solid(t.onPrimarySoft), over(t.primarySoft, t.surface))).toBeGreaterThanOrEqual(
      TEXT,
    );
    expect(contrast(solid(t.success), over(t.successSoft, t.surface))).toBeGreaterThanOrEqual(TEXT);
  });

  it('body and muted text read on the surface and the keypad keys', () => {
    for (const ground of [t.surface, t.background, t.soft]) {
      expect(contrast(solid(t.color), solid(ground))).toBeGreaterThanOrEqual(TEXT);
      expect(contrast(solid(t.muted), solid(ground))).toBeGreaterThanOrEqual(TEXT);
    }
  });

  it('a missed call (danger) stands out as text on the surface', () => {
    expect(contrast(solid(t.danger), solid(t.surface))).toBeGreaterThanOrEqual(TEXT);
  });

  it('the red app bar is told apart from the page under it', () => {
    expect(contrast(solid(t.primary), solid(t.background))).toBeGreaterThanOrEqual(ICON);
  });
});
