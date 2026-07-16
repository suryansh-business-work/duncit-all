import { fireEvent, screen } from '@testing-library/react-native';

import { Sidebar } from '@/components/Sidebar';
import { useStudioModeStore } from '@/stores/studio-mode.store';
import { STUDIO_HOME_ROUTE } from '@/utils/studio-mode';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
const mockMe = jest.fn();
const mockAccount = jest.fn();
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
jest.mock('@/hooks/useActiveAds', () => ({
  useActiveAds: () => ({ ads: [], loading: false }),
}));
jest.mock('@/hooks/useMe', () => ({
  useMe: () => mockMe(),
  useRoleLabels: () => ({ labelFor: (k: string) => k }),
}));
jest.mock('@/hooks/useAccount', () => ({ useAccount: () => mockAccount() }));
jest.mock('@/hooks/useFeatureFlag', () => ({
  useFeatureFlag: (key: string) => mockFlags[key] ?? false,
}));
jest.mock('@/hooks/usePolicies', () => ({ usePublicPolicies: () => mockPolicies() }));

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockFlags).forEach((k) => delete mockFlags[k]);
  useStudioModeStore.setState({ mode: 'USER' });
  mockMe.mockReturnValue({
    data: { me: { full_name: 'Asha', email: 'a@d.com', roles: ['HOST', 'VENUE_OWNER'] } },
  });
  mockAccount.mockReturnValue({ me: { first_name: 'Asha' } });
  mockPolicies.mockReturnValue({
    data: { publicPolicies: [{ id: '1', slug: 'terms', title: 'Terms' }] },
  });
});

describe('Sidebar branch coverage', () => {
  it('shows the Pod Plans manage row when the flag is on', () => {
    mockFlags.pod_plans_section = true;
    renderWithProviders(<Sidebar open onClose={jest.fn()} />);
    fireEvent.press(screen.getByTestId('sidebar-item-Pod Plans'));
    expect(mockNavigate).toHaveBeenCalledWith('PodPlans');
  });

  it('hides the incomplete banner once the profile is 100% complete', () => {
    mockAccount.mockReturnValue({ me: FULL_ACCOUNT });
    renderWithProviders(<Sidebar open onClose={jest.fn()} />);
    expect(screen.queryByTestId('profile-completion')).toBeNull();
  });

  it('jumps to the venue dashboard after switching modes, keeping the card layout', () => {
    renderWithProviders(<Sidebar open onClose={jest.fn()} />);
    fireEvent.press(screen.getByTestId('sidebar-switch-role'));
    fireEvent.press(screen.getByTestId('studio-switch-VENUE'));
    // The unified card layout stays; switching jumps to the venue dashboard.
    expect(screen.getByTestId('sidebar-grid-pod-history')).toBeOnTheScreen();
    expect(mockNavigate).toHaveBeenCalledWith(STUDIO_HOME_ROUTE.VENUE);
  });

  it('copes with no signed-in user and no policies (no switch button)', () => {
    mockMe.mockReturnValue({ data: {} });
    mockAccount.mockReturnValue({ me: null });
    mockPolicies.mockReturnValue({ data: {} });
    renderWithProviders(<Sidebar open onClose={jest.fn()} />);
    expect(screen.getByTestId('sidebar-panel')).toBeOnTheScreen();
    expect(screen.getByTestId('profile-completion')).toBeOnTheScreen();
    expect(screen.queryByTestId('sidebar-policies')).toBeNull();
    expect(screen.queryByTestId('sidebar-switch-role')).toBeNull();
  });

  it('runs the close animation when toggled shut', () => {
    const { rerender } = renderWithProviders(<Sidebar open onClose={jest.fn()} />);
    expect(screen.getByTestId('sidebar-panel')).toBeOnTheScreen();
    rerender(<Sidebar open={false} onClose={jest.fn()} />);
  });
});
