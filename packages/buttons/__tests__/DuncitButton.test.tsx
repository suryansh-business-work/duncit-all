import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactElement } from 'react';
import { DuncitButton } from '../src/DuncitButton';

afterEach(cleanup);

// Hex ink/accent so the injected state layers resolve to concrete rgba values.
const theme = createTheme({
  palette: { text: { primary: '#111827' }, primary: { main: '#E11D48' } },
});
const mount = (ui: ReactElement) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
const injectedCss = (): string =>
  Array.from(document.head.querySelectorAll('style'))
    .map((tag) => tag.textContent ?? '')
    .join('\n');

describe('DuncitButton', () => {
  it('renders a contained MUI button whose fill darkens while pressed', () => {
    mount(<DuncitButton variant="contained">Book DUN-POD-4821 · ₹499</DuncitButton>);
    const button = screen.getByRole('button', { name: 'Book DUN-POD-4821 · ₹499' });
    expect(button.className).toContain('MuiButton-contained');
    expect(injectedCss()).toContain('filter:brightness(0.92)');
    expect(injectedCss()).toContain('transform:scale(0.96)');
  });

  it('renders a text button with the ghost press: ink layer and deeper compression', () => {
    mount(<DuncitButton variant="text">View pod</DuncitButton>);
    expect(screen.getByRole('button', { name: 'View pod' }).className).toContain('MuiButton-text');
    const css = injectedCss();
    expect(css).toContain('transform:scale(0.94)');
    expect(css).toContain('background-color:rgba(17, 24, 39, 0.12)');
  });

  it('renders an outlined button and carries the control press dim', () => {
    mount(<DuncitButton variant="outlined">Cancel booking</DuncitButton>);
    expect(screen.getByRole('button', { name: 'Cancel booking' }).className).toContain(
      'MuiButton-outlined'
    );
    expect(injectedCss()).toContain('opacity:0.85');
  });

  it('draws the accent focus ring instead of the faint MUI shadow', () => {
    mount(<DuncitButton variant="contained">Pay ₹499</DuncitButton>);
    expect(injectedCss()).toContain('outline:2px solid #E11D48');
  });

  it('keeps a loading button at full colour with a progress cursor', () => {
    mount(<DuncitButton variant="contained">Submitting</DuncitButton>);
    expect(injectedCss()).toContain('cursor:progress');
  });

  it('eases the release, never the press-down', () => {
    mount(<DuncitButton variant="contained">Join pod</DuncitButton>);
    const css = injectedCss();
    expect(css).toContain('transform 160ms cubic-bezier(0.2, 0, 0, 1)');
    expect(css).toContain('transition:none');
  });

  it('keeps the polymorphic component prop, so a link button stays an anchor', () => {
    mount(
      <DuncitButton component="a" href="https://duncit.com/DUNPOD48" variant="text">
        Share pod
      </DuncitButton>
    );
    const link = screen.getByRole('link', { name: 'Share pod' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveProperty('href', 'https://duncit.com/DUNPOD48');
  });
});
