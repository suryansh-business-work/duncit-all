import { StyleSheet } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { TOUCH_TARGET } from '@duncit/buttons-native';

import { AuthModeToggle } from '@/components/AuthModeToggle';
import { renderWithProviders } from '@/utils/test-utils';

let mockScheme: 'light' | 'dark' = 'light';
const mockToggle = jest.fn();
jest.mock('@/stores/theme.store', () => ({
  useThemeStore: (selector: (s: { scheme: 'light' | 'dark'; toggle: () => void }) => unknown) =>
    selector({ scheme: mockScheme, toggle: mockToggle }),
}));

/** Native readers get `accessibilityState`; Native Web reads `aria-pressed` — either says it. */
const selected = (testID: string) => {
  const { props } = screen.getByTestId(testID);
  return props.accessibilityState?.selected === true || props['aria-pressed'] === true;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockScheme = 'light';
});

describe('AuthModeToggle', () => {
  it('marks Light active on a light screen and switches only via the Dark half', () => {
    renderWithProviders(<AuthModeToggle />);

    expect(screen.getByTestId('auth-mode-toggle')).toBeOnTheScreen();
    expect(selected('auth-mode-light')).toBe(true);
    expect(selected('auth-mode-dark')).toBe(false);
    expect(screen.getByText('Light')).toBeOnTheScreen();
    expect(screen.getByText('Dark')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('auth-mode-light'));
    expect(mockToggle).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('auth-mode-dark'));
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('marks Dark active on a dark screen and switches only via the Light half', () => {
    mockScheme = 'dark';
    renderWithProviders(<AuthModeToggle />);

    expect(selected('auth-mode-dark')).toBe(true);
    expect(selected('auth-mode-light')).toBe(false);

    fireEvent.press(screen.getByTestId('auth-mode-dark'));
    expect(mockToggle).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('auth-mode-light'));
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('keeps a full touch target on each compact half through its hit slop', () => {
    renderWithProviders(<AuthModeToggle />);

    for (const testID of ['auth-mode-light', 'auth-mode-dark']) {
      const node = screen.getByTestId(testID);
      const { hitSlop } = node.props as { hitSlop: { top: number; bottom: number } };
      const { minHeight } = StyleSheet.flatten(node.props.style) as { minHeight: number };
      // The drawn pill is shorter than a touch target; the slop makes up the rest.
      expect(minHeight).toBeLessThan(TOUCH_TARGET);
      expect(hitSlop.top).toBe(hitSlop.bottom);
      expect(minHeight + hitSlop.top + hitSlop.bottom).toBeGreaterThanOrEqual(TOUCH_TARGET);
    }
  });
});
