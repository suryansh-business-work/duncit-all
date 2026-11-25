import { fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { renderWithTheme } from '@/test-utils';
import { useAuthStore } from '@/stores/auth.store';
import { MenuScreen } from '../menu/MenuScreen';
import { PortalPageScreen } from '../portal/PortalPageScreen';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
const mockNav = { navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn() };
let mockBelow: object | undefined;
let mockParams: object = {};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNav,
  useRoute: () => ({ params: mockParams }),
  useNavigationState: (pick: (state: object) => unknown) =>
    pick({ index: 1, routes: [mockBelow, { name: 'Menu' }] }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockBelow = { name: 'Tabs', state: { index: 0, routes: [{ name: 'Home' }] } };
  useAuthStore.setState({
    user: { user_id: 'u1', first_name: 'Asha', last_name: 'Rao', roles: [] },
  });
});

describe('MenuScreen', () => {
  it('lists the portal’s groups closed, with who is signed in', () => {
    renderWithTheme(<MenuScreen />);
    expect(screen.getByText('Asha Rao')).toBeOnTheScreen();
    expect(screen.getByTestId('nav-leads')).toBeOnTheScreen();
    expect(screen.getByTestId('nav-settings')).toBeOnTheScreen();
    expect(screen.queryByTestId('nav-crmMobileApp')).toBeNull();
    expect(screen.queryByTestId('nav-venueLeads')).toBeNull();
  });

  it('opens and closes a group in place, and goes where an item points', () => {
    renderWithTheme(<MenuScreen />);
    fireEvent.press(screen.getByTestId('nav-leads'));
    fireEvent.press(screen.getByTestId('nav-ecommLeads'));
    expect(mockNav.goBack).toHaveBeenCalled();
    expect(mockNav.navigate).toHaveBeenCalledWith('Tabs', {
      screen: 'Leads',
      params: { kind: 'ECOMM_LEAD' },
    });
    fireEvent.press(screen.getByTestId('nav-leads'));
    expect(screen.queryByTestId('nav-ecommLeads')).toBeNull();
  });

  it('opens on the current page with its groups expanded and the page marked', () => {
    mockBelow = { name: 'ManagedOptions', params: { group: 'AMENITY' } };
    renderWithTheme(<MenuScreen />);
    expect(screen.getByTestId('nav-amenities')).toBeSelected();
    expect(screen.getByTestId('nav-servicesOffered')).not.toBeSelected();
  });

  it('closes from the close button or the dimmed edge', () => {
    renderWithTheme(<MenuScreen />);
    fireEvent.press(screen.getByTestId('menu-close'));
    fireEvent.press(screen.getByTestId('menu-scrim'));
    expect(mockNav.goBack).toHaveBeenCalledTimes(2);
  });
});

describe('PortalPageScreen', () => {
  it('names the page, says it is not in the app yet, and opens it in the staging portal', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    mockParams = { path: '/lead-research', titleKey: 'shell.nav.leadResearch' };
    renderWithTheme(<PortalPageScreen />);
    expect(mockNav.setOptions).toHaveBeenCalledWith({ title: 'Lead Research' });
    expect(screen.getByText(/is not in the app yet/)).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('portal-page-open'));
    expect(openURL).toHaveBeenCalledWith('https://staging.crm.duncit.com/lead-research');
  });
});
