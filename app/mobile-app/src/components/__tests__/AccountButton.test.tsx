import { fireEvent, screen } from '@testing-library/react-native';

import { AccountButton } from '@/components/AccountButton';
import { useMe } from '@/hooks/useMe';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, canGoBack: () => true, goBack: jest.fn() }),
}));
jest.mock('@/hooks/useMe', () => ({ useMe: jest.fn() }));

const mockedUseMe = jest.mocked(useMe);

afterEach(() => jest.clearAllMocks());

describe('AccountButton', () => {
  it('shows the user photo when present', () => {
    mockedUseMe.mockReturnValue({ data: { me: { profile_photo: 'https://x/p.png' } } } as never);
    renderWithProviders(<AccountButton />);
    expect(screen.getByTestId('account-avatar-image')).toBeOnTheScreen();
  });

  it('falls back to the initial and opens the /menu route on press', () => {
    mockedUseMe.mockReturnValue({ data: { me: { first_name: 'Asha' } } } as never);
    renderWithProviders(<AccountButton />);
    expect(screen.getByText('A')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('account-button'));
    expect(mockNavigate).toHaveBeenCalledWith('Menu');
  });

  it('defaults to "U" with no user data', () => {
    mockedUseMe.mockReturnValue({ data: undefined } as never);
    renderWithProviders(<AccountButton />);
    expect(screen.getByText('U')).toBeOnTheScreen();
  });
});
