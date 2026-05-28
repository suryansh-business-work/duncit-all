import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ColorModeProvider, useColorMode } from '../../src/ColorModeContext';
import { appConfig } from '../../src/config/app-config';

const KEY = appConfig.colorModeKey;

function Probe() {
  const { mode, toggle, set } = useColorMode();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <button onClick={toggle}>toggle</button>
      <button onClick={() => set('dark')}>set-dark</button>
      <button onClick={() => set('light')}>set-light</button>
    </div>
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('ColorModeProvider', () => {
  it('defaults to light when nothing is saved and the OS prefers light', () => {
    render(
      <ColorModeProvider>
        <Probe />
      </ColorModeProvider>
    );
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
  });

  it('restores a saved dark preference', () => {
    localStorage.setItem(KEY, 'dark');
    render(
      <ColorModeProvider>
        <Probe />
      </ColorModeProvider>
    );
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
  });

  it('restores a saved light preference', () => {
    localStorage.setItem(KEY, 'light');
    render(
      <ColorModeProvider>
        <Probe />
      </ColorModeProvider>
    );
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
  });

  it('falls back to the OS dark preference when nothing is saved', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
    );
    render(
      <ColorModeProvider>
        <Probe />
      </ColorModeProvider>
    );
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
  });

  it('handles environments without matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    render(
      <ColorModeProvider>
        <Probe />
      </ColorModeProvider>
    );
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
  });

  it('toggles between modes and persists the choice', () => {
    render(
      <ColorModeProvider>
        <Probe />
      </ColorModeProvider>
    );
    fireEvent.click(screen.getByText('toggle'));
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    expect(localStorage.getItem(KEY)).toBe('dark');
    fireEvent.click(screen.getByText('toggle'));
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
    expect(localStorage.getItem(KEY)).toBe('light');
  });

  it('sets an explicit mode and persists it', () => {
    render(
      <ColorModeProvider>
        <Probe />
      </ColorModeProvider>
    );
    fireEvent.click(screen.getByText('set-dark'));
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    expect(localStorage.getItem(KEY)).toBe('dark');
  });

  it('provides safe no-op defaults outside a provider', () => {
    render(<Probe />);
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
    // toggle/set are no-ops here — clicking must not throw.
    fireEvent.click(screen.getByText('toggle'));
    fireEvent.click(screen.getByText('set-dark'));
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
  });
});
