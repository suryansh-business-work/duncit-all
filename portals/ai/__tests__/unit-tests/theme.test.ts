import { describe, expect, it } from 'vitest';
import { buildTheme, tokens } from '../../src/theme';
import { appConfig } from '../../src/config/app-config';

describe('theme re-export', () => {
  it('builds a light theme honouring the portal accent', () => {
    const theme = buildTheme('light', appConfig.accent);
    expect(theme.palette.mode).toBe('light');
    expect(theme.palette.primary.main).toBe(appConfig.accent.main);
  });

  it('builds a dark theme', () => {
    const theme = buildTheme('dark', appConfig.accent);
    expect(theme.palette.mode).toBe('dark');
  });

  it('exposes the shared design tokens', () => {
    expect(tokens).toBeTruthy();
  });
});
