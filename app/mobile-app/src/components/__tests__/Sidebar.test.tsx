import { fireEvent, screen } from '@testing-library/react-native';

import { Sidebar } from '@/components/Sidebar';
import { useStudioModeStore } from '@/stores/studio-mode.store';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
const mockLogout = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('@/hooks/useLogout', () => ({ useLogout: () => mockLogout }));
jest.mock('@/hooks/useMe', () => ({
  useMe: () => ({
    data: { me: { full_name: 'Asha Roy', email: 'a@duncit.com', roles: ['HOST'] } },
  }),
  useRoleLabels: () => ({ labelFor: (k: string) => k }),
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

  it('shows the USER menu (Earn with Duncit), the switch-role button, and logout', () => {
    renderWithProviders(<Sidebar open onClose={jest.fn()} />);
    expect(screen.getByText('Asha Roy')).toBeOnTheScreen();
    expect(screen.getByTestId('sidebar-item-Earn with Duncit')).toBeOnTheScreen();
    expect(screen.getByTestId('sidebar-switch-role')).toBeOnTheScreen();
    expect(screen.getByTestId('sidebar-logout')).toBeOnTheScreen();
  });

  it('switches into Host Studio and shows its menu', () => {
    renderWithProviders(<Sidebar open onClose={jest.fn()} />);
    fireEvent.press(screen.getByTestId('sidebar-switch-role'));
    // Dismissing via the backdrop keeps the current (USER) mode.
    fireEvent.press(screen.getByTestId('studio-switch-backdrop'));
    expect(screen.queryByTestId('sidebar-item-Your Pods')).toBeNull();
    fireEvent.press(screen.getByTestId('sidebar-switch-role'));
    fireEvent.press(screen.getByTestId('studio-switch-HOST'));
    expect(screen.getByTestId('sidebar-item-Your Pods')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('sidebar-item-Your Pods'));
    expect(mockNavigate).toHaveBeenCalledWith('HostManage');
  });

  it('closes and navigates when a menu item is tapped', () => {
    const onClose = jest.fn();
    renderWithProviders(<Sidebar open onClose={onClose} />);
    fireEvent.press(screen.getByTestId('sidebar-item-Saved Items'));
    expect(onClose).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('Saved');
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
