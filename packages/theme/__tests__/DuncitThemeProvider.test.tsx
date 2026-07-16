import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DuncitThemeProvider, useColorMode } from '../src/DuncitThemeProvider';
import type { AccentColors } from '../src/types';

const brand: AccentColors = {
  light: '#a5b4fc',
  main: '#4f46e5',
  hover: '#4338ca',
  active: '#3730a3',
};

function Consumer() {
  const { mode, toggle, set } = useColorMode();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <button type="button" onClick={toggle}>
        toggle
      </button>
      <button type="button" onClick={() => set('dark')}>
        set-dark
      </button>
      <button type="button" onClick={() => set('light')}>
        set-light
      </button>
    </div>
  );
}

const mode = () => screen.getByTestId('mode').textContent;

describe('DuncitThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to dark mode when nothing is stored and no defaultMode is given', () => {
    render(
      <DuncitThemeProvider>
        <Consumer />
      </DuncitThemeProvider>,
    );
    expect(mode()).toBe('dark');
  });

  it('honors an explicit defaultMode when storage is empty', () => {
    render(
      <DuncitThemeProvider defaultMode="light" accent={brand} storageKey="k1">
        <Consumer />
      </DuncitThemeProvider>,
    );
    expect(mode()).toBe('light');
  });

  it('restores a stored mode over the defaultMode', () => {
    localStorage.setItem('k2', 'dark');
    render(
      <DuncitThemeProvider defaultMode="light" storageKey="k2">
        <Consumer />
      </DuncitThemeProvider>,
    );
    expect(mode()).toBe('dark');
  });

  it('ignores an invalid stored value and falls back to defaultMode', () => {
    localStorage.setItem('k3', 'purple');
    render(
      <DuncitThemeProvider defaultMode="light" storageKey="k3">
        <Consumer />
      </DuncitThemeProvider>,
    );
    expect(mode()).toBe('light');
  });

  it('toggles between light and dark and persists the choice', async () => {
    render(
      <DuncitThemeProvider defaultMode="light" storageKey="k4">
        <Consumer />
      </DuncitThemeProvider>,
    );
    expect(mode()).toBe('light');

    await userEvent.click(screen.getByRole('button', { name: 'toggle' }));
    expect(mode()).toBe('dark');
    expect(localStorage.getItem('k4')).toBe('dark');

    await userEvent.click(screen.getByRole('button', { name: 'toggle' }));
    expect(mode()).toBe('light');
    expect(localStorage.getItem('k4')).toBe('light');
  });

  it('sets an explicit mode and persists it', async () => {
    render(
      <DuncitThemeProvider defaultMode="light" storageKey="k5">
        <Consumer />
      </DuncitThemeProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'set-dark' }));
    expect(mode()).toBe('dark');
    expect(localStorage.getItem('k5')).toBe('dark');

    await userEvent.click(screen.getByRole('button', { name: 'set-light' }));
    expect(mode()).toBe('light');
    expect(localStorage.getItem('k5')).toBe('light');
  });

  it('accepts a per-portal extend override without breaking', () => {
    render(
      <DuncitThemeProvider
        defaultMode="dark"
        storageKey="k6"
        extend={() => ({ MuiSvgIcon: { defaultProps: {} } })}
      >
        <Consumer />
      </DuncitThemeProvider>,
    );
    expect(mode()).toBe('dark');
  });

  it('provides a safe default context outside any provider', async () => {
    render(<Consumer />);
    expect(mode()).toBe('light');
    // The default no-op toggle/set must not throw.
    await userEvent.click(screen.getByRole('button', { name: 'toggle' }));
    await userEvent.click(screen.getByRole('button', { name: 'set-dark' }));
    expect(mode()).toBe('light');
  });
});
