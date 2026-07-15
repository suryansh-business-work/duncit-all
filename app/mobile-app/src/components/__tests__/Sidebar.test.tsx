import { fireEvent, screen } from '@testing-library/react-native';

import { Sidebar } from '@/components/Sidebar';
import { useStudioModeStore } from '@/stores/studio-mode.store';
import { STUDIO_HOME_ROUTE } from '@/utils/studio-mode';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
const mockLogout = jest.fn();
const mockFlags: Record<string, boolean> = {};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate }),
}));
jest.mock('@/hooks/useLogout', () => ({ useLogout: () => mockLogout }));
jest.mock('@/hooks/useMe', () => ({
  useMe: () => ({
    data: {
      me: { first_name: 'Asha', full_name: 'Asha Roy', email: 'a@duncit.com', roles: ['HOST'] },
    },
  }),
  useRoleLabels: () => ({ labelFor: (k: string) => k }),
}));
jest.mock('@/hooks/useAccount', () => ({ useAccount: () => ({ me: { first_name: 'Asha' } }) }));
jest.mock('@/hooks/useFeatureFlag', () => ({
  useFeatureFlag: (key: string) => mockFlags[key] ?? false,
}));
jest.mock('@/hooks/usePolicies', () => ({
  usePublicPolicies: () => ({
    data: { publicPolicies: [{ id: '1', slug: 'terms', title: 'Terms' }] },
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  useStudioModeStore.setState({ mode: 'USER' });
});

describe('Sidebar', () => {
  it('stays unmounted while closed', () => {
    renderWithProviders(<Sidebar open={false} onClose={jest.fn()} />);
    expect(screen.queryByTestId('sidebar-panel')).toBeNull();
  });

  it('shows the USER profile cards, the switch-role button, logout and app version', () => {
    renderWithProviders(<Sidebar open onClose={jest.fn()} />);
    expect(screen.getByText('Asha Roy')).toBeOnTheScreen();
    expect(screen.getByTestId('sidebar-grid-pod-history')).toBeOnTheScreen();
    expect(screen.getByTestId('sidebar-grid-earn')).toBeOnTheScreen();
    expect(screen.getByTestId('sidebar-referral')).toBeOnTheScreen();
    expect(screen.getByTestId('sidebar-item-Saved Items')).toBeOnTheScreen();
    expect(screen.getByTestId('sidebar-switch-role')).toBeOnTheScreen();
    expect(screen.getByTestId('sidebar-logout')).toBeOnTheScreen();
    expect(screen.getByTestId('sidebar-app-version')).toBeOnTheScreen();
  });

  it('opens the profile from the identity card', () => {
    const onClose = jest.fn();
    renderWithProviders(<Sidebar open onClose={onClose} />);
    fireEvent.press(screen.getByTestId('sidebar-identity'));
    expect(onClose).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('Profile');
  });

  it('closes and navigates from a quick-grid tile, referral and manage rows', () => {
    const onClose = jest.fn();
    renderWithProviders(<Sidebar open onClose={onClose} />);
    fireEvent.press(screen.getByTestId('sidebar-grid-pod-history'));
    expect(onClose).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('PodHistory');
    fireEvent.press(screen.getByTestId('sidebar-referral'));
    expect(mockNavigate).toHaveBeenCalledWith('Referral');
    fireEvent.press(screen.getByTestId('sidebar-item-Saved Items'));
    expect(mockNavigate).toHaveBeenCalledWith('Saved');
  });

  it('shows the incomplete banner and opens Account from it', () => {
    renderWithProviders(<Sidebar open onClose={jest.fn()} />);
    expect(screen.getByTestId('profile-completion')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('profile-completion-cta'));
    expect(mockNavigate).toHaveBeenCalledWith('Account');
  });

  it('switches into Host Studio and keeps the unified card layout', () => {
    renderWithProviders(<Sidebar open onClose={jest.fn()} />);
    fireEvent.press(screen.getByTestId('sidebar-switch-role'));
    // Dismissing via the backdrop keeps the current (USER) mode.
    fireEvent.press(screen.getByTestId('studio-switch-backdrop'));
    expect(screen.getByTestId('sidebar-grid-pod-history')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('sidebar-switch-role'));
    fireEvent.press(screen.getByTestId('studio-switch-HOST'));
    // Every role now shares the same profile card layout — no studio-only list.
    expect(screen.getByTestId('sidebar-grid-pod-history')).toBeOnTheScreen();
    expect(mockNavigate).toHaveBeenCalledWith(STUDIO_HOME_ROUTE.HOST);
  });

  it('logs out from the footer', () => {
    const onClose = jest.fn();
    renderWithProviders(<Sidebar open onClose={onClose} />);
    fireEvent.press(screen.getByTestId('sidebar-logout'));
    expect(onClose).toHaveBeenCalled();
    expect(mockLogout).toHaveBeenCalled();
  });

  it('expands the policies group and navigates to a policy', () => {
    const onClose = jest.fn();
    renderWithProviders(<Sidebar open onClose={onClose} />);
    expect(screen.queryByTestId('sidebar-policy-terms')).toBeNull();
    fireEvent.press(screen.getByText('Policies'));
    fireEvent.press(screen.getByTestId('sidebar-policy-terms'));
    expect(onClose).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('Policy', { slug: 'terms' });
  });

  it('closes from the backdrop and the close button', () => {
    const onClose = jest.fn();
    renderWithProviders(<Sidebar open onClose={onClose} />);
    fireEvent.press(screen.getByTestId('sidebar-backdrop'));
    fireEvent.press(screen.getByTestId('sidebar-close'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('renders the dark-mode icon when the dark scheme is active', () => {
    const { useThemeStore } = jest.requireActual('@/stores/theme.store');
    const original = useThemeStore.getState();
    useThemeStore.setState({ ...original, scheme: 'dark' });
    renderWithProviders(<Sidebar open onClose={jest.fn()} />);
    expect(screen.getByTestId('sidebar-theme-switch').props.value).toBe(true);
    useThemeStore.setState(original);
  });

  it('toggles dark mode from the sidebar switch', () => {
    const toggle = jest.fn();
    const { useThemeStore } = jest.requireActual('@/stores/theme.store');
    const original = useThemeStore.getState();
    useThemeStore.setState({ ...original, toggle });
    renderWithProviders(<Sidebar open onClose={jest.fn()} />);
    fireEvent(screen.getByTestId('sidebar-theme-switch'), 'valueChange', true);
    expect(toggle).toHaveBeenCalled();
    useThemeStore.setState(original);
  });
});
