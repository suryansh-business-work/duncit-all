import { fireEvent, screen } from '@testing-library/react-native';

import { Sidebar } from '@/components/Sidebar';
import { useStudioModeStore } from '@/stores/studio-mode.store';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
const mockMe = jest.fn();
const mockPolicies = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('@/hooks/useLogout', () => ({ useLogout: () => jest.fn() }));
jest.mock('@/hooks/useMe', () => ({
  useMe: () => mockMe(),
  useRoleLabels: () => ({ labelFor: (k: string) => k }),
}));
jest.mock('@/hooks/usePolicies', () => ({ usePublicPolicies: () => mockPolicies() }));

beforeEach(() => {
  jest.clearAllMocks();
  useStudioModeStore.setState({ mode: 'USER' });
  mockMe.mockReturnValue({
    data: { me: { full_name: 'Asha', email: 'a@d.com', roles: ['HOST', 'VENUE_OWNER'] } },
  });
  mockPolicies.mockReturnValue({
    data: { publicPolicies: [{ id: '1', slug: 'terms', title: 'Terms' }] },
  });
});

describe('Sidebar navigation handlers', () => {
  it('navigates from the user summary and the host/venue studio menus', () => {
    renderWithProviders(<Sidebar open onClose={jest.fn()} />);
    fireEvent.press(screen.getByTestId('sidebar-user-summary'));
    expect(mockNavigate).toHaveBeenCalledWith('Profile');

    fireEvent.press(screen.getByTestId('sidebar-switch-role'));
    fireEvent.press(screen.getByTestId('studio-switch-HOST'));
    fireEvent.press(screen.getByTestId('sidebar-item-Your Pods'));
    expect(mockNavigate).toHaveBeenCalledWith('HostManage');
    fireEvent.press(screen.getByTestId('sidebar-item-Support'));
    expect(mockNavigate).toHaveBeenCalledWith('Support');

    fireEvent.press(screen.getByTestId('sidebar-switch-role'));
    fireEvent.press(screen.getByTestId('studio-switch-VENUE'));
    fireEvent.press(screen.getByTestId('sidebar-item-Your Venues'));
    expect(mockNavigate).toHaveBeenCalledWith('VenueManage');
    fireEvent.press(screen.getByTestId('sidebar-item-Verification'));
    expect(mockNavigate).toHaveBeenCalledWith('RegisterVenue');
  });

  it('copes with no signed-in user and no policies (no switch button)', () => {
    mockMe.mockReturnValue({ data: {} });
    mockPolicies.mockReturnValue({ data: {} });
    renderWithProviders(<Sidebar open onClose={jest.fn()} />);
    expect(screen.getByTestId('sidebar-panel')).toBeOnTheScreen();
    expect(screen.queryByTestId('sidebar-policies')).toBeNull();
    expect(screen.queryByTestId('sidebar-switch-role')).toBeNull();
  });

  it('runs the close animation when toggled shut', () => {
    const { rerender } = renderWithProviders(<Sidebar open onClose={jest.fn()} />);
    expect(screen.getByTestId('sidebar-panel')).toBeOnTheScreen();
    rerender(<Sidebar open={false} onClose={jest.fn()} />);
  });
});
