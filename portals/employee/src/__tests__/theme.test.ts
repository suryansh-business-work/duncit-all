import { describe, expect, it } from 'vitest';

import { buildTheme, tokens } from '../theme';

describe('theme', () => {
  it('re-exports the shared design system builder + tokens', () => {
    expect(typeof buildTheme).toBe('function');
    expect(tokens).toBeDefined();
  });
});
