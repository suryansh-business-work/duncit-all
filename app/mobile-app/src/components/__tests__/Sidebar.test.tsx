import { fireEvent, screen, within } from '@testing-library/react-native';

import { Sidebar } from '@/components/Sidebar';
import { useQuickAccessStore } from '@/stores/quick-access.store';
import { useStudioModeStore } from '@/stores/studio-mode.store';
import { STUDIO_ROUTE } from '@/utils/studio-mode';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
const mockLogout = jest.fn().mockResolvedValue(undefined);
const mockFlags: Record<string, boolean> = {};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate }),
}));
jest.mock('@/services/secure-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
}));
jest.mock('@/hooks/useLogout', () => ({ useLogout: () => mockLogout }));
jest.mock('@/hooks/useActiveAds', () => ({
  useActiveAds: () => ({ ads: [], loading: false }),
}));
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
  // The menu reads the whole list (useMenuFlags): the same flags, as rows.
  usePublicFeatureFlags: () =>
    Object.entries(mockFlags).map(([key, enabled]) => ({ key, enabled })),
}));
let mockUnreadChats = 0;
jest.mock('@/hooks/useChatUnreadTotal', () => ({ useChatUnreadTotal: () => mockUnreadChats }));
jest.mock('@/hooks/usePolicies', () => ({
  usePublicPolicies: () => ({
    data: { publicPolicies: [{ id: '1', slug: 'terms', title: 'Terms' }] },
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  useStudioModeStore.setState({ mode: 'USER' });
  useQuickAccessStore.setState({ raw: null });
  mockUnreadChats = 0;
});

/** Opens one of the collapsed section cards. */
const expand = (id: string) => fireEvent.press(screen.getByTestId(`sidebar-section-${id}-toggle`));

describe('Sidebar', () => {
  it('renders as a full page (no drawer backdrop)', () => {
    renderWithProviders(<Sidebar onClose={jest.fn()} />);
    expect(screen.getByTestId('sidebar-panel')).toBeOnTheScreen();
    expect(screen.queryByTestId('sidebar-backdrop')).toBeNull();
  });

  it('badges the Chats tile with the unread count, and shows no badge at zero', () => {
    // The badge is aria-hidden (the count rides as the tile's hint), so the
    // visual check opts into hidden elements and the hint is the a11y check.
    const hidden = { includeHiddenElements: true };
    mockUnreadChats = 3;
    const { unmount } = renderWithProviders(<Sidebar onClose={jest.fn()} />);
    expect(
      within(screen.getByTestId('sidebar-grid-chats')).getByTestId('sidebar-grid-badge', hidden),
    ).toHaveTextContent('3');
    expect(screen.getByHintText('3 unread')).toBeOnTheScreen();
    unmount();

    mockUnreadChats = 0;
    renderWithProviders(<Sidebar onClose={jest.fn()} />);
    expect(screen.queryByTestId('sidebar-grid-badge', hidden)).toBeNull();
    expect(screen.queryByHintText('3 unread')).toBeNull();
  });

  it('shows the profile card, Quick Access, the five collapsed sections, logout and app version', () => {
    renderWithProviders(<Sidebar onClose={jest.fn()} />);
    expect(screen.getByText('Asha Roy')).toBeOnTheScreen();
    expect(screen.getByText('Quick Access')).toBeOnTheScreen();
    expect(screen.getByTestId('sidebar-grid-pod-history')).toBeOnTheScreen();
    expect(screen.getByTestId('sidebar-grid-earn')).toBeOnTheScreen();
    for (const id of ['explore', 'work', 'shopping', 'account', 'support']) {
      expect(screen.getByTestId(`sidebar-section-${id}-toggle`)).toBeCollapsed();
    }
    // Collapsed: the rows inside a section are not drawn until it opens.
    expect(screen.queryByTestId('sidebar-switch-role')).toBeNull();
    expand('account');
    expect(screen.getByTestId('sidebar-section-account-toggle')).toBeExpanded();
    expect(screen.getByTestId('sidebar-switch-role')).toBeOnTheScreen();
    expect(screen.getByTestId('sidebar-item-saved')).toBeOnTheScreen();
    expect(screen.getByTestId('sidebar-logout')).toBeOnTheScreen();
    expect(screen.getByTestId('sidebar-app-version')).toHaveTextContent(/^App version /);
  });

  it('opens the profile from the identity card', () => {
    const onClose = jest.fn();
    renderWithProviders(<Sidebar onClose={onClose} />);
    fireEvent.press(screen.getByTestId('sidebar-identity'));
    expect(onClose).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('Profile');
  });

  it('closes and navigates from a Quick Access tile and from section rows', () => {
    const onClose = jest.fn();
    renderWithProviders(<Sidebar onClose={onClose} />);
    fireEvent.press(screen.getByTestId('sidebar-grid-pod-history'));
    expect(onClose).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('PodHistory');
    expand('work');
    fireEvent.press(screen.getByTestId('sidebar-item-referral'));
    expect(mockNavigate).toHaveBeenCalledWith('Referral');
    expand('account');
    fireEvent.press(screen.getByTestId('sidebar-item-saved'));
    expect(mockNavigate).toHaveBeenCalledWith('Saved');
  });

  it('shows the completion nudge in the profile card and opens Account from it', () => {
    renderWithProviders(<Sidebar onClose={jest.fn()} />);
    expect(screen.getByTestId('profile-completion')).toBeOnTheScreen();
    expect(screen.getByText('Your profile is 10% complete')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('profile-completion-cta'));
    expect(mockNavigate).toHaveBeenCalledWith('Account');
  });

  it('switches into Host Studio and keeps the unified card layout', () => {
    renderWithProviders(<Sidebar onClose={jest.fn()} />);
    expand('account');
    fireEvent.press(screen.getByTestId('sidebar-switch-role'));
    // Dismissing via the backdrop keeps the current (USER) mode.
    fireEvent.press(screen.getByTestId('studio-switch-backdrop'));
    expect(screen.getByTestId('sidebar-grid-pod-history')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('sidebar-switch-role'));
    fireEvent.press(screen.getByTestId('studio-switch-HOST'));
    fireEvent.press(screen.getByTestId('studio-switch-confirm'));
    // Every role now shares the same profile card layout — no studio-only list.
    expect(screen.getByTestId('sidebar-grid-pod-history')).toBeOnTheScreen();
    // The switch lands on the role's Studio screen, not its dashboard.
    expect(mockNavigate).toHaveBeenCalledWith(STUDIO_ROUTE.HOST);
  });

  it('logs out from the footer', () => {
    const onClose = jest.fn();
    renderWithProviders(<Sidebar onClose={onClose} />);
    fireEvent.press(screen.getByTestId('sidebar-logout'));
    expect(onClose).toHaveBeenCalled();
    expect(mockLogout).toHaveBeenCalled();
  });

  it('expands the policies group and navigates to a policy', () => {
    const onClose = jest.fn();
    renderWithProviders(<Sidebar onClose={onClose} />);
    expand('support');
    expect(screen.queryByTestId('sidebar-policy-terms')).toBeNull();
    fireEvent.press(screen.getByText('Policies'));
    fireEvent.press(screen.getByTestId('sidebar-policy-terms'));
    expect(onClose).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('Policy', { slug: 'terms' });
  });

  it('closes from the close button', () => {
    const onClose = jest.fn();
    renderWithProviders(<Sidebar onClose={onClose} />);
    fireEvent.press(screen.getByTestId('sidebar-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the dark-mode icon when the dark scheme is active', () => {
    const { useThemeStore } = jest.requireActual('@/stores/theme.store');
    const original = useThemeStore.getState();
    useThemeStore.setState({ ...original, scheme: 'dark' });
    renderWithProviders(<Sidebar onClose={jest.fn()} />);
    expand('account');
    expect(screen.getByTestId('sidebar-theme-switch').props.value).toBe(true);
    useThemeStore.setState(original);
  });

  it('toggles dark mode from the sidebar switch', () => {
    const toggle = jest.fn();
    const { useThemeStore } = jest.requireActual('@/stores/theme.store');
    const original = useThemeStore.getState();
    useThemeStore.setState({ ...original, toggle });
    renderWithProviders(<Sidebar onClose={jest.fn()} />);
    expand('account');
    fireEvent(screen.getByTestId('sidebar-theme-switch'), 'valueChange', true);
    expect(toggle).toHaveBeenCalled();
    useThemeStore.setState(original);
  });
});
