import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactElement } from 'react';
import { DuncitIconButton } from '../src/DuncitIconButton';

afterEach(cleanup);

const theme = createTheme({
  palette: { text: { primary: '#111827' }, primary: { main: '#E11D48' } },
});
const mount = (ui: ReactElement) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
const injectedCss = (): string =>
  Array.from(document.head.querySelectorAll('style'))
    .map((tag) => tag.textContent ?? '')
    .join('\n');

describe('DuncitIconButton', () => {
  it('renders a MUI icon button that presses as ghost with an ink layer', () => {
    mount(<DuncitIconButton aria-label="Scan attendance QR">×</DuncitIconButton>);
    const button = screen.getByRole('button', { name: 'Scan attendance QR' });
    expect(button.className).toContain('MuiIconButton-root');
    const css = injectedCss();
    expect(css).toContain('transform:scale(0.94)');
    expect(css).toContain('opacity:0.75');
    expect(css).toContain('background-color:rgba(17, 24, 39, 0.12)');
  });

  it('carries the accent focus ring and the loading cursor from the rest states', () => {
    mount(<DuncitIconButton aria-label="Close sheet">×</DuncitIconButton>);
    const css = injectedCss();
    expect(css).toContain('outline:2px solid #E11D48');
    expect(css).toContain('cursor:progress');
  });

  it('keeps the polymorphic component prop, so an icon link stays an anchor', () => {
    mount(
      <DuncitIconButton component="a" href="https://duncit.com/DUNPOD48" aria-label="Open pod">
        →
      </DuncitIconButton>
    );
    expect(screen.getByRole('link', { name: 'Open pod' }).tagName).toBe('A');
  });
});
