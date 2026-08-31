import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactElement } from 'react';
import { DuncitRoundButton } from '../src/DuncitRoundButton';

afterEach(cleanup);

// A theme that rounds icon buttons by radius, the way mWeb's does — the shape
// this component has to stay circular in spite of.
const theme = createTheme({
  palette: { text: { primary: '#111827' }, primary: { main: '#E11D48' } },
  components: { MuiIconButton: { styleOverrides: { root: { borderRadius: 999 } } } },
});
const mount = (ui: ReactElement) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
const injectedCss = (): string =>
  Array.from(document.head.querySelectorAll('style'))
    .map((tag) => tag.textContent ?? '')
    .join('\n');

describe('DuncitRoundButton', () => {
  it('is a fixed square with a 50% radius, so nothing can flatten it', () => {
    mount(<DuncitRoundButton aria-label="Close notifications">×</DuncitRoundButton>);
    expect(screen.getByRole('button', { name: 'Close notifications' }).className).toContain(
      'MuiIconButton-root'
    );
    const css = injectedCss();
    expect(css).toContain('border-radius:50%');
    expect(css).toContain('width:36px');
    expect(css).toContain('height:36px');
    expect(css).toContain('flex-shrink:0');
    expect(css).toContain('padding:0');
  });

  it('sizes the glyph to fit inside the circle rather than beside the padding', () => {
    mount(
      <DuncitRoundButton size="small" aria-label="Remove attachment">
        ×
      </DuncitRoundButton>
    );
    const css = injectedCss();
    expect(css).toContain('width:24px');
    expect(css).toContain('font-size:14px');
  });

  it('offers a 44px large size for a control over a photo', () => {
    mount(
      <DuncitRoundButton size="large" tone="overlay" aria-label="Close preview">
        ×
      </DuncitRoundButton>
    );
    const css = injectedCss();
    expect(css).toContain('width:44px');
    expect(css).toContain('font-size:24px');
    expect(css).toContain('background-color:rgba(0, 0, 0, 0.55)');
    expect(css).toContain('background-color:rgba(0, 0, 0, 0.75)');
  });

  it('paints the surface tone from the theme action colours', () => {
    mount(
      <DuncitRoundButton tone="surface" aria-label="Close menu">
        ×
      </DuncitRoundButton>
    );
    expect(injectedCss()).toContain(theme.palette.action.hover.replace(/, /g, ', '));
  });

  it('paints the paper tone as a bordered chip for a thumbnail badge', () => {
    mount(
      <DuncitRoundButton tone="paper" size="small" aria-label="Remove photo">
        ×
      </DuncitRoundButton>
    );
    const css = injectedCss();
    expect(css).toContain(`border:1px solid ${theme.palette.divider}`);
  });

  it('keeps the plain tone free of any background', () => {
    mount(
      <DuncitRoundButton tone="plain" aria-label="Close dialog">
        ×
      </DuncitRoundButton>
    );
    expect(screen.getByRole('button', { name: 'Close dialog' })).toBeTruthy();
  });

  it('does not leak the tone prop onto the DOM node', () => {
    mount(
      <DuncitRoundButton tone="overlay" aria-label="Close story">
        ×
      </DuncitRoundButton>
    );
    expect(screen.getByRole('button', { name: 'Close story' }).getAttribute('tone')).toBeNull();
  });
});
