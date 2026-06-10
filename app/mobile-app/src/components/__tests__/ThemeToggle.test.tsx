import { fireEvent, screen } from '@testing-library/react-native';

import { ThemeToggle } from '@/components/ThemeToggle';
import { renderWithProviders } from '@/utils/test-utils';

const mockToggle = jest.fn();
let mockScheme: 'light' | 'dark' = 'light';

// The Zustand theme store is consumed via selectors; route them at our mock state.
jest.mock('@/stores/theme.store', () => ({
  useThemeStore: (selector: (s: { scheme: 'light' | 'dark'; toggle: () => void }) => unknown) =>
    selector({ scheme: mockScheme, toggle: mockToggle }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockScheme = 'light';
});

describe('ThemeToggle', () => {
  it('toggles the theme store and labels the switch target', () => {
    renderWithProviders(<ThemeToggle />);
    expect(screen.getByLabelText('Switch to dark mode')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('theme-toggle'));
    expect(mockToggle).toHaveBeenCalled();
  });

  it('labels the switch toward light when currently dark', () => {
    mockScheme = 'dark';
    renderWithProviders(<ThemeToggle />);
    expect(screen.getByLabelText('Switch to light mode')).toBeOnTheScreen();
  });
});
