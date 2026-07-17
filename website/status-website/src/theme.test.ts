import { describe, expect, it } from 'vitest';
import { DEFAULT_PRIMARY, buildTheme } from './theme';

describe('buildTheme', () => {
  it('applies the requested colour mode', () => {
    expect(buildTheme('light').palette.mode).toBe('light');
    expect(buildTheme('dark').palette.mode).toBe('dark');
  });

  it('falls back to the Duncit brand red when no primary is given', () => {
    expect(buildTheme('light').palette.primary.main).toBe(DEFAULT_PRIMARY);
    expect(buildTheme('light', null).palette.primary.main).toBe(DEFAULT_PRIMARY);
  });

  it('uses an admin-configured primary colour when provided', () => {
    expect(buildTheme('dark', '#123456').palette.primary.main).toBe('#123456');
  });

  it('sets the shared shape and typography', () => {
    const theme = buildTheme('light');
    expect(theme.shape.borderRadius).toBe(12);
    expect(theme.typography.button.textTransform).toBe('none');
  });
});
