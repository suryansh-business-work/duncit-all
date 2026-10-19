import { fireEvent, screen } from '@testing-library/react-native';

import { Sidebar } from '@/components/Sidebar';
import { useQuickAccessStore } from '@/stores/quick-access.store';
import { useStudioModeStore } from '@/stores/studio-mode.store';
import { STUDIO_ROUTE } from '@/utils/studio-mode';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
const mockMe = jest.fn();
const mockPolicies = jest.fn();
const mockFlags: Record<string, boolean> = {};

const FULL_ACCOUNT = {
  first_name: 'Asha',
  last_name: 'Roy',
  bio: 'Hi',
  dob: '2000-01-01',
  city: 'Mumbai',
  state: 'MH',
  country: 'IN',
  phone_number: '9990001111',
  whatsapp_number: '9990001111',
  profile_photo: 'https://x/p.png',
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate }),
}));
jest.mock('@/hooks/useLogout', () => ({ useLogout: () => jest.fn() }));
jest.mock('@/services/secure-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
}));
jest.mock('@/hooks/useActiveAds', () => ({
  useActiveAds: () => ({ ads: [], loading: false }),
}));
jest.mock('@/hooks/useMe', () => ({
  useMe: () => mockMe(),
  useRoleLabels: () => ({ labelFor: (k: string) => k }),
}));
jest.mock('@/hooks/useFeatureFlag', () => ({
  useFeatureFlag: (key: string) => mockFlags[key] ?? false,
}));
jest.mock('@/hooks/usePolicies', () => ({ usePublicPolicies: () => mockPolicies() }));

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockFlags).forEach((k) => delete mockFlags[k]);
  useStudioModeStore.setState({ mode: 'USER' });
  useQuickAccessStore.setState({ raw: null });
  mockMe.mockReturnValue({
    data: { me: { full_name: 'Asha', email: 'a@d.com', roles: ['HOST', 'VENUE_OWNER'] } },
  });
  mockPolicies.mockReturnValue({
    data: { publicPolicies: [{ id: '1', slug: 'terms', title: 'Terms' }] },
  });
});

describe('Sidebar branch coverage', () => {
  it('lists Pod Plans in the Account section only while its flag is on', () => {
    const { unmount } = renderWithProviders(<Sidebar onClose={jest.fn()} />);
    fireEvent.press(screen.getByTestId('sidebar-section-account-toggle'));
    expect(screen.queryByTestId('sidebar-item-plans')).toBeNull();
    expect(screen.getByTestId('sidebar-section-account-subtitle')).not.toHaveTextContent(
      /Pod Plans/,
    );
    unmount();

    mockFlags.pod_plans_section = true;
    renderWithProviders(<Sidebar onClose={jest.fn()} />);
    expect(screen.getByTestId('sidebar-section-account-subtitle')).toHaveTextContent(/Pod Plans/);
    fireEvent.press(screen.getByTestId('sidebar-section-account-toggle'));
    fireEvent.press(screen.getByTestId('sidebar-item-plans'));
    expect(mockNavigate).toHaveBeenCalledWith('PodPlans');
  });

  it('puts the Pod Shop rows in Shopping & Orders and the cart tab under Home, behind the products flag', () => {
    mockFlags.is_product_visible = true;
    renderWithProviders(<Sidebar onClose={jest.fn()} />);
    fireEvent.press(screen.getByTestId('sidebar-section-shopping-toggle'));
    fireEvent.press(screen.getByTestId('sidebar-item-orders'));
    expect(mockNavigate).toHaveBeenCalledWith('OrdersHistory');
    fireEvent.press(screen.getByTestId('sidebar-item-cart'));
    // The cart is a tab, so it is reached through Home rather than navigated to bare.
    expect(mockNavigate).toHaveBeenCalledWith('Home', { screen: 'Cart' });
  });

  it('hides the incomplete banner once the profile is 100% complete', () => {
    // Completion is read off the same user info record as the identity.
    mockMe.mockReturnValue({
      data: { me: { ...FULL_ACCOUNT, full_name: 'Asha Roy', email: 'a@d.com', roles: ['HOST'] } },
    });
    renderWithProviders(<Sidebar onClose={jest.fn()} />);
    expect(screen.queryByTestId('profile-completion')).toBeNull();
  });

  it('jumps to the venue Studio screen after switching modes, keeping the card layout', () => {
    renderWithProviders(<Sidebar onClose={jest.fn()} />);
    fireEvent.press(screen.getByTestId('sidebar-section-account-toggle'));
    fireEvent.press(screen.getByTestId('sidebar-switch-role'));
    fireEvent.press(screen.getByTestId('studio-switch-VENUE'));
    fireEvent.press(screen.getByTestId('studio-switch-confirm'));
    // The unified card layout stays; switching jumps to the venue Studio screen.
    expect(screen.getByTestId('sidebar-grid-pod-history')).toBeOnTheScreen();
    expect(mockNavigate).toHaveBeenCalledWith(STUDIO_ROUTE.VENUE);
  });

  it('copes with no signed-in user and no policies (no switch button)', () => {
    mockMe.mockReturnValue({ data: {} });
    mockPolicies.mockReturnValue({ data: {} });
    renderWithProviders(<Sidebar onClose={jest.fn()} />);
    expect(screen.getByTestId('sidebar-panel')).toBeOnTheScreen();
    expect(screen.getByTestId('profile-completion')).toBeOnTheScreen();
    // Support lists Help and FAQs but no Policies, and Account no Switch role.
    expect(screen.getByTestId('sidebar-section-support-subtitle')).toHaveTextContent('Help, FAQs');
    expect(screen.getByTestId('sidebar-section-account-subtitle')).not.toHaveTextContent(
      /Switch role/,
    );
    fireEvent.press(screen.getByTestId('sidebar-section-support-toggle'));
    fireEvent.press(screen.getByTestId('sidebar-section-account-toggle'));
    expect(screen.queryByTestId('sidebar-policies')).toBeNull();
    expect(screen.queryByTestId('sidebar-switch-role')).toBeNull();
  });
});
