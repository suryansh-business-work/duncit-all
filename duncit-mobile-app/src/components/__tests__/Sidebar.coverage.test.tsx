import { fireEvent, screen } from '@testing-library/react-native';

import { Sidebar } from '@/components/Sidebar';
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
  mockMe.mockReturnValue({
    data: { me: { full_name: 'Asha', email: 'a@d.com', roles: ['HOST', 'VENUE_OWNER'] } },
  });
  mockPolicies.mockReturnValue({
    data: { publicPolicies: [{ id: '1', slug: 'terms', title: 'Terms' }] },
  });
});

describe('Sidebar navigation handlers', () => {
  it('navigates from the user summary, management and support rows', () => {
    renderWithProviders(<Sidebar open onClose={jest.fn()} />);
    fireEvent.press(screen.getByTestId('sidebar-user-summary'));
    expect(mockNavigate).toHaveBeenCalledWith('Profile');
    fireEvent.press(screen.getByTestId('sidebar-item-Hosts Management'));
    expect(mockNavigate).toHaveBeenCalledWith('HostManage');
    fireEvent.press(screen.getByTestId('sidebar-item-Venue Management'));
    expect(mockNavigate).toHaveBeenCalledWith('VenueManage');
    fireEvent.press(screen.getByTestId('sidebar-item-Support'));
    expect(mockNavigate).toHaveBeenCalledWith('Support');
  });

  it('copes with no signed-in user and no policies', () => {
    mockMe.mockReturnValue({ data: {} });
    mockPolicies.mockReturnValue({ data: {} });
    renderWithProviders(<Sidebar open onClose={jest.fn()} />);
    expect(screen.getByTestId('sidebar-panel')).toBeOnTheScreen();
    expect(screen.queryByTestId('sidebar-policies')).toBeNull();
  });

  it('runs the close animation when toggled shut', () => {
    const { rerender } = renderWithProviders(<Sidebar open onClose={jest.fn()} />);
    expect(screen.getByTestId('sidebar-panel')).toBeOnTheScreen();
    rerender(<Sidebar open={false} onClose={jest.fn()} />);
  });
});
