import { describe, expect, it } from 'vitest';
import { SOFT_ALPHA, pressThemeKeys, type BrandColorsInput } from '../src/theme';
import { withAlpha } from '../src/color';

// The palette in the shape `@duncit/auth-tokens` ships it.
const brand: BrandColorsInput = {
  primary: '#FF5757',
  primaryActive: '#E04848',
  danger: '#D32F2F',
  success: '#2E7D32',
};

describe('pressThemeKeys', () => {
  it('builds every soft fill as the tone at the shared low alpha', () => {
    const keys = pressThemeKeys(brand);
    expect(SOFT_ALPHA).toBe(0.12);
    expect(keys.primarySoft).toBe('rgba(255, 87, 87, 0.12)');
    expect(keys.dangerSoft).toBe('rgba(211, 47, 47, 0.12)');
    expect(keys.successSoft).toBe('rgba(46, 125, 50, 0.12)');
    expect(keys.primarySoft).toBe(withAlpha(brand.primary, SOFT_ALPHA));
  });

  it('darkens the tones that ship no darker step into their pressed fills', () => {
    const keys = pressThemeKeys(brand);
    // 0.86 × each channel, rounded: 211→181, 47→40 / 46→40, 125→108, 50→43.
    expect(keys.dangerPress).toBe('rgb(181, 40, 40)');
    expect(keys.successPress).toBe('rgb(40, 108, 43)');
  });

  it('hands a colour it cannot parse back untouched instead of guessing', () => {
    const keys = pressThemeKeys({
      primary: '$primary',
      primaryActive: '$primaryPress',
      danger: '$danger',
      success: '$success',
    });
    expect(keys.primarySoft).toBe('$primary');
    expect(keys.dangerSoft).toBe('$danger');
    expect(keys.successSoft).toBe('$success');
    expect(keys.dangerPress).toBe('$danger');
    expect(keys.successPress).toBe('$success');
  });
});
