import '@testing-library/jest-dom/vitest';
import { MockedProvider } from '@apollo/client/testing/react';
import { fireEvent, render, screen, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ColorModeProvider, useColorMode } from '../ColorModeContext';
import { OCCASION_LIVE } from '../hooks/useOccasionLive';

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
  // The provider reads the branding theme tokens over Apollo; with no mock it
  // keeps the bundled palette, which is all these mode tests need.
  render(
    <MockedProvider mocks={[]}>
      <ColorModeProvider>
        <Consumer />
      </ColorModeProvider>
    </MockedProvider>
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

describe('ColorModeProvider with a festive look', () => {
  const TOKEN_KEYS = ['bg', 'surface', 'soft', 'ink', 'muted', 'border', 'inputBorder', 'primary', 'primaryHover', 'primaryActive', 'onPrimary', 'accent', 'onAccent', 'brand', 'success', 'warning', 'error', 'info', 'onSemantic'];
  const palette = (primary: string) => ({ __typename: 'ThemeModeTokens', ...Object.fromEntries(TOKEN_KEYS.map((key) => [key, ''])), primary });

  const look = (colorMode: 'AUTO' | 'DARK') => ({
    __typename: 'OccasionTheme',
    key: 'halloween',
    name: 'Halloween',
    color_mode: colorMode,
    greeting: '',
    palette_light: palette('#FF7518'),
    palette_dark: palette('#FF7518'),
    particles: [],
    flyers: [],
    fireworks: { __typename: 'OccasionFireworks', enabled: false, colors: [], bursts_per_minute: 12, sparks: 28, radius: 90 },
    overlays: [],
    garland: { __typename: 'OccasionGarland', style: 'NONE', colors: [] },
  });

  function LockProbe() {
    const { mode, locked } = useColorMode();
    return <span data-testid="lock">{`${mode}:${locked ? 'locked' : 'free'}`}</span>;
  }

  const renderWithLook = (theme: ReturnType<typeof look> | null) =>
    render(
      <MockedProvider
        mocks={[
          {
            request: { query: OCCASION_LIVE, variables: { preview: null } },
            result: { data: { occasionLive: { __typename: 'OccasionLive', next_change_at: null, theme } } },
          },
        ]}
      >
        <ColorModeProvider>
          <LockProbe />
        </ColorModeProvider>
      </MockedProvider>
    );

  it('wears a look that pins dark mode whatever the viewer saved, and locks the toggles', async () => {
    localStorage.setItem(STORAGE_KEY, 'light');
    renderWithLook(look('DARK'));

    expect(await screen.findByText('dark:locked')).toBeInTheDocument();
  });

  it("keeps the viewer's own mode, unlocked, for a look that leaves the mode to them", async () => {
    localStorage.setItem(STORAGE_KEY, 'light');
    renderWithLook(look('AUTO'));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.getByTestId('lock')).toHaveTextContent('light:free');
  });
});
