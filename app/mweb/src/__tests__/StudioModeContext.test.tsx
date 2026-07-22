import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StudioModeProvider, useStudioMode } from '../StudioModeContext';
import type { StudioMode } from '../studio-mode';

const STORAGE_KEY = 'mweb_studio_mode';

function Consumer() {
  const { mode, setMode } = useStudioMode();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <button type="button" onClick={() => setMode('HOST')}>
        host
      </button>
      <button type="button" onClick={() => setMode('VENUE')}>
        venue
      </button>
    </div>
  );
}

describe('StudioModeContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it('defaults to USER when nothing is persisted', () => {
    render(
      <StudioModeProvider>
        <Consumer />
      </StudioModeProvider>
    );
    expect(screen.getByTestId('mode')).toHaveTextContent('USER');
  });

  it('hydrates a valid persisted mode from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'VENUE');
    render(
      <StudioModeProvider>
        <Consumer />
      </StudioModeProvider>
    );
    expect(screen.getByTestId('mode')).toHaveTextContent('VENUE');
  });

  it('falls back to USER for an invalid persisted value', () => {
    localStorage.setItem(STORAGE_KEY, 'NONSENSE' as StudioMode);
    render(
      <StudioModeProvider>
        <Consumer />
      </StudioModeProvider>
    );
    expect(screen.getByTestId('mode')).toHaveTextContent('USER');
  });

  it('setMode updates the mode and persists it to localStorage', () => {
    render(
      <StudioModeProvider>
        <Consumer />
      </StudioModeProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'host' }));
    expect(screen.getByTestId('mode')).toHaveTextContent('HOST');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('HOST');

    fireEvent.click(screen.getByRole('button', { name: 'venue' }));
    expect(screen.getByTestId('mode')).toHaveTextContent('VENUE');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('VENUE');
  });

  it('useStudioMode default context returns USER and a no-op setMode', () => {
    const { result } = renderHook(() => useStudioMode());
    expect(result.current.mode).toBe('USER');
    expect(() => result.current.setMode('HOST')).not.toThrow();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('setMode via hook inside provider mutates state', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StudioModeProvider>{children}</StudioModeProvider>
    );
    const { result } = renderHook(() => useStudioMode(), { wrapper });
    expect(result.current.mode).toBe('USER');
    act(() => result.current.setMode('ECOMM'));
    expect(result.current.mode).toBe('ECOMM');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('ECOMM');
  });
});
