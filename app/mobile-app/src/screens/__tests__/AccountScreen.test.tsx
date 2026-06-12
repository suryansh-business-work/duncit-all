import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { AccountScreen } from '@/screens/AccountScreen';
import { useAccount } from '@/hooks/useAccount';
import { useLogout } from '@/hooks/useLogout';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useAccount', () => ({ useAccount: jest.fn() }));
jest.mock('@/hooks/useLogout', () => ({ useLogout: jest.fn() }));
jest.mock('@/hooks/useMe', () => ({ useRoleLabels: () => ({ labelFor: (k: string) => k }) }));
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate, goBack: jest.fn() }),
}));

const mockedUseAccount = useAccount as jest.Mock;
const mockedUseLogout = useLogout as jest.Mock;
const logout = jest.fn();
const updateProfile = jest.fn().mockResolvedValue(undefined);
const changePhoto = jest.fn().mockResolvedValue(undefined);

const me = {
  user_id: 'u1',
  first_name: 'Riya',
  last_name: 'Sharma',
  full_name: 'Riya Sharma',
  email: 'riya@duncit.com',
  phone_number: '9876543210',
  phone_extension: '+91',
  whatsapp_number: '',
  whatsapp_extension: '+91',
  profile_photo: null,
  bio: 'Hi',
  city: 'Pune',
  zone: 'Kothrud',
  country: 'India',
  dob: '1995-01-01',
  roles: ['USER'],
  status: 'ACTIVE',
  created_at: '2024-01-01',
};
const health = { base_score: 100, delta_sum: 0, total_score: 100, band: 'GREEN', adjustments: [] };

function setAccount(over: Record<string, unknown> = {}) {
  mockedUseAccount.mockReturnValue({
    me,
    health,
    isLoading: false,
    error: undefined,
    savingPhoto: false,
    updateProfile,
    changePhoto,
    ...over,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseLogout.mockReturnValue(logout);
  setAccount();
});

describe('AccountScreen', () => {
  it('shows the loading skeleton', () => {
    setAccount({ me: null, isLoading: true });
    renderWithProviders(<AccountScreen />);
    expect(screen.getByTestId('account-loading')).toBeOnTheScreen();
  });

  it('shows an error/empty state', () => {
    setAccount({ me: null, isLoading: false, error: new Error('x') });
    renderWithProviders(<AccountScreen />);
    expect(screen.getByTestId('account-error')).toBeOnTheScreen();
  });

  it('renders info rows, health and hosts/venues, and wires actions', () => {
    renderWithProviders(<AccountScreen />);
    expect(screen.getByText('riya@duncit.com')).toBeOnTheScreen();
    expect(screen.getByText('Pune · Kothrud · India')).toBeOnTheScreen();
    expect(screen.getByTestId('account-health')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('account-health'));
    expect(mockNavigate).toHaveBeenCalledWith('AccountHealth');

    fireEvent.press(screen.getByTestId('account-change-photo'));
    expect(changePhoto).toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('account-logout'));
    expect(logout).toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('account-hosts-venues-discover'));
    expect(mockNavigate).toHaveBeenCalledWith('HostsVenues');
    fireEvent.press(screen.getByTestId('hv-host'));
    expect(mockNavigate).toHaveBeenCalledWith('BecomeHost');
    fireEvent.press(screen.getByTestId('hv-venue'));
    expect(mockNavigate).toHaveBeenCalledWith('RegisterVenue');
    fireEvent.press(screen.getByTestId('hv-pod-history'));
    expect(mockNavigate).toHaveBeenCalledWith('PodHistory');
  });

  it('opens and closes the edit dialog', async () => {
    renderWithProviders(<AccountScreen />);
    fireEvent.press(screen.getByTestId('account-edit'));
    await waitFor(() => expect(screen.getByTestId('account-edit-submit')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('edit-account-close'));
    await waitFor(() => expect(screen.queryByTestId('account-edit-submit')).toBeNull());
  });

  it('routes hosts/venue owners to management and hides health when absent', () => {
    setAccount({ me: { ...me, roles: ['HOST', 'VENUE_OWNER'] }, health: null });
    renderWithProviders(<AccountScreen />);
    expect(screen.queryByTestId('account-health')).toBeNull();
    fireEvent.press(screen.getByTestId('hv-host'));
    expect(mockNavigate).toHaveBeenCalledWith('HostManage');
    fireEvent.press(screen.getByTestId('hv-venue'));
    expect(mockNavigate).toHaveBeenCalledWith('VenueManage');
  });

  it('renders the email/dob/phone fallbacks when fields are empty', () => {
    setAccount({
      me: { ...me, email: '', phone_number: '', city: '', zone: '', country: '', dob: '' },
    });
    renderWithProviders(<AccountScreen />);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('trims an empty phone extension', () => {
    setAccount({ me: { ...me, phone_extension: '' } });
    renderWithProviders(<AccountScreen />);
    expect(screen.getByText('9876543210')).toBeOnTheScreen();
  });
});
