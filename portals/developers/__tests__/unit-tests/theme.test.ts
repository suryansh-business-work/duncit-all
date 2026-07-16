import { describe, expect, it } from 'vitest';
import * as theme from '../../src/theme';

describe('theme re-exports', () => {
  it('re-exports buildTheme + tokens from @duncit/theme', () => {
    expect(typeof theme.buildTheme).toBe('function');
    expect(theme.tokens).toBeDefined();
  });
});
