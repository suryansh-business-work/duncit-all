import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderWithTheme } from '@/test-utils';
import { useAuthStore } from '@/stores/auth.store';
import { MoreScreen } from '../more/MoreScreen';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
const mockNav = { navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn() };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNav,
}));

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({
    user: {
      user_id: 'u1',
      first_name: 'Asha',
      last_name: 'Rao',
      email: 'asha@duncit.com',
      roles: [],
    },
  });
});

describe('MoreScreen', () => {
  it('shows who is signed in, then the portal’s groups as sections of their pages', () => {
    renderWithTheme(<MoreScreen />);
    expect(screen.getByText('Asha Rao')).toBeOnTheScreen();
    expect(screen.getByText('asha@duncit.com')).toBeOnTheScreen();
    expect(screen.getByTestId('more-section-leads')).toBeOnTheScreen();
    expect(screen.getByTestId('nav-dashboard')).toBeOnTheScreen();
    // Pages inside nested groups are listed directly, no drill-down needed.
    expect(screen.getByTestId('nav-amenities')).toBeOnTheScreen();
    // Reminders is a bottom tab, so More leaves it out.
    expect(screen.queryByTestId('nav-reminders')).toBeNull();
  });

  it('opens a screen, a kind’s lead list or a managed list', () => {
    renderWithTheme(<MoreScreen />);
    fireEvent.press(screen.getByTestId('nav-dashboard'));
    expect(mockNav.navigate).toHaveBeenLastCalledWith('Dashboard');
    fireEvent.press(screen.getByTestId('nav-ecommLeads'));
    expect(mockNav.navigate).toHaveBeenLastCalledWith('LeadList', { kind: 'ECOMM_LEAD' });
    fireEvent.press(screen.getByTestId('nav-eventSuitability'));
    expect(mockNav.navigate).toHaveBeenLastCalledWith('ManagedOptions', {
      group: 'EVENT_SUITABILITY',
    });
  });

  it('opens the app’s settings', () => {
    renderWithTheme(<MoreScreen />);
    fireEvent.press(screen.getByTestId('more-settings'));
    expect(mockNav.navigate).toHaveBeenCalledWith('Settings');
  });

  it('asks before signing out, and stays signed in on cancel', async () => {
    const signOut = jest.fn().mockResolvedValue(undefined);
    useAuthStore.setState({ signOut });
    renderWithTheme(<MoreScreen />);
    fireEvent.press(screen.getByTestId('more-sign-out'));
    fireEvent.press(screen.getByTestId('more-sign-out-confirm-cancel'));
    expect(signOut).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('more-sign-out'));
    fireEvent.press(screen.getByTestId('more-sign-out-confirm-confirm'));
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
  });

  it('falls back to the app’s name when the account has no name', () => {
    useAuthStore.setState({ user: { user_id: 'u2', roles: [] } });
    renderWithTheme(<MoreScreen />);
    expect(screen.getAllByText('Duncit CRM').length).toBeGreaterThan(0);
  });
});
