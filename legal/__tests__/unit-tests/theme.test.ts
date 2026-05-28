import { describe, expect, it } from 'vitest';
import { buildTheme, tokens } from '../../src/theme';

describe('buildTheme', () => {
  it('builds a light theme with the default accent', () => {
    const theme = buildTheme();
    expect(theme.palette.mode).toBe('light');
    expect(theme.palette.primary.main).toBe('#ff5757');
    expect(theme.shape.borderRadius).toBe(6);
  });

  it('builds a dark theme honouring the supplied accent', () => {
    const theme = buildTheme('dark', { light: '#aaa', main: '#123456', hover: '#222', active: '#111' });
    expect(theme.palette.mode).toBe('dark');
    expect(theme.palette.primary.main).toBe('#123456');
    expect(theme.palette.primary.dark).toBe('#111');
  });

  it('exposes design tokens', () => {
    expect(tokens.semantic.error).toBe('#ef4444');
    expect(tokens.surface.paper).toBe('#ffffff');
  });
});
