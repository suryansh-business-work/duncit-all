import { describe, expect, it } from 'vitest';
import tokens, { brand, neutral, semantic, surface, light, dark, auth } from '@duncit/auth-tokens';

// Regression guard for the Vite dev crash:
//   "module '/@fs/.../tokens.cjs?import' does not provide an export named 'default'"
// The shared package must import cleanly through Vite's ESM pipeline (same path
// the dev server uses) and expose every named export the apps consume.
describe('@duncit/auth-tokens', () => {
  it('imports through Vite with a default + all named exports', () => {
    expect(tokens).toBeDefined();
    expect(brand[500]).toBe('#ff5757');
    expect(neutral[900]).toBe('#111827');
    expect(semantic.error).toBe('#ef4444');
    expect(surface.paper).toBe('#ffffff');
    expect(light.primary).toBe('#ff5757');
    expect(dark.bg).toBe('#0b1220');
  });

  it('exposes the auth/login visual tokens (gradients, accent, avatars, legal)', () => {
    expect(auth.accent).toBe('#ff5b72');
    expect(auth.avatars).toHaveLength(3);
    expect(auth.bgGradient.light).toHaveLength(3);
    expect(auth.cardGradient.dark).toHaveLength(3);
    expect(auth.legal.termsUrl).toMatch(/^https:\/\//);
  });
});
