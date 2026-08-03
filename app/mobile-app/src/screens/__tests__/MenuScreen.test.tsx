/* eslint-disable @typescript-eslint/no-require-imports -- jest.mock factory requires lazily */
import { fireEvent, screen } from '@testing-library/react-native';

import { MenuScreen } from '@/screens/MenuScreen';
import { renderWithProviders } from '@/utils/test-utils';

const mockGoBack = jest.fn();
jest.mock('@/hooks/useGoBack', () => ({ useGoBack: () => mockGoBack }));
jest.mock('@/components/Sidebar', () => ({
  Sidebar: ({ onClose }: { onClose: () => void }) =>
    require('react').createElement(require('react-native').Pressable, {
      testID: 'menu-sidebar',
      onPress: onClose,
    }),
}));

afterEach(() => jest.clearAllMocks());

describe('MenuScreen', () => {
  it('renders the menu and closes via goBack', () => {
    renderWithProviders(<MenuScreen />);
    expect(screen.getByTestId('menu-sidebar')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('menu-sidebar'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});
