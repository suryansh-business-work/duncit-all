import { fireEvent, screen } from '@testing-library/react-native';

import { Sidebar } from '@/components/Sidebar';
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

beforeEach(() => jest.clearAllMocks());

describe('Sidebar', () => {
  it('stays unmounted while closed', () => {
    renderWithProviders(<Sidebar open={false} onClose={jest.fn()} />);
    expect(screen.queryByTestId('sidebar-panel')).toBeNull();
  });

  it('shows the user summary, role-based menu, and logout when open', () => {
    renderWithProviders(<Sidebar open onClose={jest.fn()} />);
    expect(screen.getByText('Asha Roy')).toBeOnTheScreen();
    // HOST role => management entry, not the join CTA.
    expect(screen.getByTestId('sidebar-item-Hosts Management')).toBeOnTheScreen();
    expect(screen.getByTestId('sidebar-logout')).toBeOnTheScreen();
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
    // Collapsed by default — the link only appears once expanded.
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
});
