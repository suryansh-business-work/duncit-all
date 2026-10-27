import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { LiteEventThemeKey } from '../../../../shared/graphql/documents';
import { tint } from '../../../../shared/theme';
import { ACCENT_COLORS, BADGE_TINTS, EVENT_THEME_KEYS, LITE_SCHEMES, THEME_ACCENT_KEYS } from '../../../../shared/tokens';
import { EventThemeBackdrop, themeBackground } from '../../../components/theme/EventThemeBackdrop';
import { renderWithProviders } from '../../test-utils';

const RED = ACCENT_COLORS.RED;
const GLOW = LITE_SCHEMES.dark.glow;

/** How many CSS gradient layers a background paints. */
const layers = (background: string, kind: 'radial' | 'linear') => background.match(new RegExp(`${kind}-gradient\\(`, 'g'))?.length ?? 0;

describe('themeBackground', () => {
  it('MINIMAL is a single soft wash of the accent from the top', () => {
    expect(themeBackground('MINIMAL', 'RED')).toBe(`linear-gradient(180deg, ${tint(RED, 0.16)}, transparent 60%)`);
  });

  it('GRADIENT sweeps from the accent into the scheme’s glow', () => {
    const background = themeBackground('GRADIENT', 'RED');
    expect(background).toBe(`linear-gradient(160deg, ${tint(RED, 0.38)} 0%, ${tint(GLOW, 0.22)} 45%, transparent 85%)`);
  });

  it('AMBIENT scatters three accent glows and one glow-coloured one', () => {
    const background = themeBackground('AMBIENT', 'RED');
    expect(layers(background, 'radial')).toBe(4);
    expect(layers(background, 'linear')).toBe(0);
    expect(background).toContain(tint(RED, 0.32));
    expect(background).toContain(tint(GLOW, 0.22));
  });

  it('PATTERN is a 22px dot grid over a wash, both in the accent', () => {
    const background = themeBackground('PATTERN', 'RED');
    expect(background).toContain('0 0 / 22px 22px');
    expect(layers(background, 'radial')).toBe(1);
    expect(layers(background, 'linear')).toBe(1);
    expect(background).toContain(tint(RED, 0.28));
  });

  it('CONFETTI drops one dot per badge tint, over an accent wash', () => {
    const background = themeBackground('CONFETTI', 'RED');
    expect(layers(background, 'radial')).toBe(BADGE_TINTS.length);
    expect(layers(background, 'linear')).toBe(1);
    for (const color of BADGE_TINTS) expect(background).toContain(tint(color, 0.45));
    expect(background.endsWith(`linear-gradient(180deg, ${tint(RED, 0.16)}, transparent 75%)`)).toBe(true);
  });

  it('paints each theme differently for the same accent', () => {
    const backgrounds = EVENT_THEME_KEYS.map((key) => themeBackground(key, 'BLUE'));
    expect(new Set(backgrounds).size).toBe(EVENT_THEME_KEYS.length);
  });

  it('follows the accent: every accent gives a different MINIMAL wash', () => {
    const backgrounds = THEME_ACCENT_KEYS.map((accent) => themeBackground('MINIMAL', accent));
    expect(new Set(backgrounds).size).toBe(new Set(Object.values(ACCENT_COLORS)).size);
  });
});

describe('EventThemeBackdrop', () => {
  it.each<LiteEventThemeKey>(['MINIMAL', 'GRADIENT', 'AMBIENT', 'PATTERN', 'CONFETTI'])('draws the %s theme as decoration hidden from screen readers', (themeKey) => {
    renderWithProviders(<EventThemeBackdrop themeKey={themeKey} accent="TEAL" />);

    const backdrop = screen.getByTestId('event-theme-backdrop');
    expect(backdrop).toHaveAttribute('aria-hidden', 'true');
    expect(backdrop).toHaveAttribute('data-theme-key', themeKey);
    expect(backdrop).toHaveAttribute('data-lite-animate');
    expect(backdrop).toBeEmptyDOMElement();
  });
});
