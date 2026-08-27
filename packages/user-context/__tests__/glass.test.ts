import { describe, expect, it } from 'vitest';
import { createTheme } from '@mui/material/styles';
import { glass } from '../src/login-screen/glass';

describe('glass', () => {
  it('returns a light frosted surface derived from the palette', () => {
    const s = glass(createTheme({ palette: { mode: 'light' } }));
    expect(s.background).toBe('rgba(255, 255, 255, 0.55)');
    expect(s.backdropFilter).toBe('blur(16px)');
    expect(s.border).toBe('1px solid rgba(255, 255, 255, 0.6)');
    expect(s.boxShadow).toBe('0 20px 60px rgba(0, 0, 0, 0.18)');
  });

  it('returns a dark frosted surface derived from the palette', () => {
    const s = glass(createTheme({ palette: { mode: 'dark' } }));
    expect(s.background).toBe('rgba(0, 0, 0, 0.55)');
    expect(s.border).toBe('1px solid rgba(255, 255, 255, 0.12)');
    expect(s.boxShadow).toBe('0 20px 60px rgba(0, 0, 0, 0.55)');
  });
});
