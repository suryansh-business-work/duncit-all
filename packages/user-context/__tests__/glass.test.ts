import { describe, expect, it } from 'vitest';
import { glass } from '../src/login-screen/glass';

const themeWith = (mode: 'light' | 'dark') => ({ palette: { mode } }) as never;

describe('glass', () => {
  it('returns a light frosted surface', () => {
    const s = glass(themeWith('light'));
    expect(s.background).toBe('rgba(255,255,255,0.55)');
    expect(s.backdropFilter).toBe('blur(16px)');
    expect(s.boxShadow).toContain('rgba(15,23,42,0.18)');
  });

  it('returns a dark frosted surface', () => {
    const s = glass(themeWith('dark'));
    expect(s.background).toBe('rgba(18,18,22,0.55)');
    expect(s.border).toContain('rgba(255,255,255,0.12)');
    expect(s.boxShadow).toContain('rgba(0,0,0,0.55)');
  });
});
