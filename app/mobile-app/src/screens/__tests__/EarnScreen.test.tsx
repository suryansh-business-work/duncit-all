import { fireEvent, screen } from '@testing-library/react-native';

import { EarnScreen } from '@/screens/EarnScreen';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));
const mockUseMe = jest.fn();
jest.mock('@/hooks/useMe', () => ({ useMe: () => mockUseMe() }));

beforeEach(() => {
  jest.clearAllMocks();
  mockUseMe.mockReturnValue({ data: { me: { roles: ['HOST'] } } });
});

describe('EarnScreen', () => {
  it('disables held-role boxes and navigates from an available one', () => {
    renderWithProviders(<EarnScreen />);
    expect(screen.getByTestId('earn-box-HOST-enabled')).toBeOnTheScreen();
    expect(screen.queryByTestId('earn-box-VENUE_OWNER-enabled')).toBeNull();
    fireEvent.press(screen.getByTestId('earn-box-VENUE_OWNER'));
    expect(mockNavigate).toHaveBeenCalledWith('RegisterVenue');
  });

  it('treats a user with no roles as all-available', () => {
    mockUseMe.mockReturnValue({ data: {} });
    renderWithProviders(<EarnScreen />);
    expect(screen.queryByTestId('earn-box-HOST-enabled')).toBeNull();
    fireEvent.press(screen.getByTestId('earn-box-ECOMM_MANAGER'));
    expect(mockNavigate).toHaveBeenCalledWith('ProductsManage');
  });
});
