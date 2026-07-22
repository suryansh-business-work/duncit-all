import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ColorModeProvider, useColorMode } from '../ColorModeContext';

const STORAGE_KEY = 'mweb_color_mode';

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

const renderProvider = () =>
  render(
    <ColorModeProvider>
      <Consumer />
    </ColorModeProvider>
  );

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  localStorage.clear();
});

describe('ColorModeProvider', () => {
  it('defaults to light when no saved preference and system is not dark', () => {
    vi.spyOn(globalThis, 'matchMedia').mockReturnValue({
      matches: false,
    } as MediaQueryList);
    renderProvider();
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
  });

  it('uses dark when system prefers dark and nothing is saved', () => {
    vi.spyOn(globalThis, 'matchMedia').mockReturnValue({
      matches: true,
    } as MediaQueryList);
    renderProvider();
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
  });

  it('reads a saved dark preference from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'dark');
    renderProvider();
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
  });

  it('reads a saved light preference from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'light');
    vi.spyOn(globalThis, 'matchMedia').mockReturnValue({
      matches: true,
    } as MediaQueryList);
    renderProvider();
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
  });

  it('toggle switches mode and persists to localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'light');
    renderProvider();
    expect(screen.getByTestId('mode')).toHaveTextContent('light');

    act(() => {
      fireEvent.click(screen.getByText('toggle'));
    });
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');

    act(() => {
      fireEvent.click(screen.getByText('toggle'));
    });
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
  });

  it('set applies an explicit mode and persists it', () => {
    localStorage.setItem(STORAGE_KEY, 'light');
    renderProvider();

    act(() => {
      fireEvent.click(screen.getByText('set-dark'));
    });
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');

    act(() => {
      fireEvent.click(screen.getByText('set-light'));
    });
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
  });
});

describe('useColorMode default context', () => {
  it('returns light mode and no-op callbacks outside a provider', () => {
    render(<Consumer />);
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
    // no-op callbacks should not throw
    act(() => {
      fireEvent.click(screen.getByText('toggle'));
      fireEvent.click(screen.getByText('set-dark'));
    });
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
  });
});
