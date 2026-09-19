import { describe, expect, it } from 'vitest';
import * as designSystem from '@duncit/theme';
import { buildTheme, tokens } from '../../src/theme';
import { appConfig } from '../../src/config/app-config';

describe('theme', () => {
  it('is the shared design system, not a local copy', () => {
    expect(buildTheme).toBe(designSystem.buildTheme);
    expect(tokens).toBe(designSystem.tokens);
  });

  it('builds this console’s dark theme around its own accent', () => {
    const theme = buildTheme('dark', appConfig.accent);
    expect(theme.palette.mode).toBe('dark');
    expect(theme.palette.brand.main).toBe(appConfig.accent.main);
  });
});
