import { fireEvent, screen } from '@testing-library/react-native';

import { LogoutButton } from '@/components/LogoutButton';
import { renderWithProviders } from '@/utils/test-utils';

const mockLogout = jest.fn();
jest.mock('@/hooks/useLogout', () => ({ useLogout: () => mockLogout }));

beforeEach(() => jest.clearAllMocks());

describe('LogoutButton', () => {
  it('clears the session via the logout hook', () => {
    renderWithProviders(<LogoutButton />);
    fireEvent.press(screen.getByTestId('logout-button'));
    expect(mockLogout).toHaveBeenCalled();
  });
});
