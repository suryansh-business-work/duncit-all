import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ColorModeProvider, useColorMode } from '@duncit/shell';
import { appConfig } from './config/app-config';

function Probe() {
  const { mode, toggle, set } = useColorMode();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <button onClick={toggle}>toggle</button>
      <button onClick={() => set('light')}>set-light</button>
    </div>
  );
}

afterEach(() => localStorage.clear());

describe('ColorModeProvider', () => {
  it('defaults to dark when nothing is stored', () => {
    render(<ColorModeProvider><Probe /></ColorModeProvider>);
    expect(screen.getByTestId('mode').textContent).toBe('dark');
  });

  it('reads a saved mode from localStorage', () => {
    localStorage.setItem(appConfig.colorModeKey, 'light');
    render(<ColorModeProvider><Probe /></ColorModeProvider>);
    expect(screen.getByTestId('mode').textContent).toBe('light');
  });

  it('toggles and persists, and set() applies a specific mode', () => {
    localStorage.setItem(appConfig.colorModeKey, 'light');
    render(<ColorModeProvider><Probe /></ColorModeProvider>);
    fireEvent.click(screen.getByText('toggle'));
    expect(screen.getByTestId('mode').textContent).toBe('dark');
    expect(localStorage.getItem(appConfig.colorModeKey)).toBe('dark');
    fireEvent.click(screen.getByText('toggle')); // dark → light (other branch)
    expect(screen.getByTestId('mode').textContent).toBe('light');
    fireEvent.click(screen.getByText('set-light'));
    expect(screen.getByTestId('mode').textContent).toBe('light');
    expect(localStorage.getItem(appConfig.colorModeKey)).toBe('light');
  });

  it('exposes no-op defaults outside a provider', () => {
    render(<Probe />);
    expect(screen.getByTestId('mode').textContent).toBe('light');
    // toggle/set are no-ops here — clicking must not throw or change mode.
    fireEvent.click(screen.getByText('toggle'));
    fireEvent.click(screen.getByText('set-light'));
    expect(screen.getByTestId('mode').textContent).toBe('light');
  });
});
