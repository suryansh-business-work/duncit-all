import { fireEvent, screen } from '@testing-library/react-native';

import { HostDashboardScreen } from '@/screens/HostDashboardScreen';
import { useHostDashboard } from '@/hooks/useHostDashboard';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useHostDashboard', () => ({ useHostDashboard: jest.fn() }));
// The insights section (charts + its own queries) is unit-tested on its own.
jest.mock('@/components/host-manage/host-insights', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: V } = require('react-native');
  return { HostInsightsSection: () => <V testID="mock-host-insights" /> };
});

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate, goBack: jest.fn() }),
}));

const mockedDashboard = useHostDashboard as jest.Mock;

const base = {
  me: { user_id: 'h1', full_name: 'Riya' },
  wallet: { balance: 1200, currency_symbol: '₹', next_payout_at: null },
  earnings: {
    currency_symbol: '₹',
    lifetime_earnings: 4540.5,
    pending_amount: 454.58,
    pods_completed: 7,
    this_month_earnings: 900,
  },
  health: { total_score: 82, band: 'GREEN' },
  stats: { total: 3, upcoming: 2, paid: 1 },
  pods: [],
  isLoading: false,
};

beforeEach(() => {
  mockNavigate.mockClear();
  mockedDashboard.mockReturnValue(base);
});

describe('HostDashboardScreen', () => {
  it('shows the loading skeleton', () => {
    mockedDashboard.mockReturnValue({ ...base, me: null, isLoading: true });
    renderWithProviders(<HostDashboardScreen />);
    expect(screen.getByTestId('host-dashboard-loading')).toBeOnTheScreen();
  });

  it('renders earnings, stats, quick actions and opens health + a quick action', () => {
    renderWithProviders(<HostDashboardScreen />);
    expect(screen.getByTestId('host-earnings')).toBeOnTheScreen();
    expect(screen.getByText('Welcome back, Riya')).toBeOnTheScreen();
    // Earnings summary tiles from myHostEarningsSummary.
    expect(screen.getByTestId('earnings-summary-tiles')).toBeOnTheScreen();
    expect(screen.getByText('Lifetime earnings')).toBeOnTheScreen();
    expect(screen.getByText('₹4540.50')).toBeOnTheScreen();
    expect(screen.getByText('Pending approval')).toBeOnTheScreen();
    expect(screen.getByText('₹454.58')).toBeOnTheScreen();
    expect(screen.getByText('This month')).toBeOnTheScreen();
    expect(screen.getByText('₹900.00')).toBeOnTheScreen();
    expect(screen.getByText('Pods completed')).toBeOnTheScreen();
    expect(screen.getByText('7')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('host-action-create-pod'));
    expect(mockNavigate).toHaveBeenCalledWith('CreatePod');
    fireEvent.press(screen.getByTestId('host-health'));
    expect(mockNavigate).toHaveBeenCalledWith('AccountHealth');
  });

  it('falls back to defaults with no wallet/name and hides health when absent', () => {
    mockedDashboard.mockReturnValue({
      ...base,
      me: null,
      wallet: null,
      earnings: null,
      health: null,
    });
    renderWithProviders(<HostDashboardScreen />);
    expect(screen.getByText('₹0.00')).toBeOnTheScreen();
    expect(screen.getByText('Earnings from your hosted pods')).toBeOnTheScreen();
    expect(screen.queryByTestId('earnings-summary-tiles')).toBeNull();
    expect(screen.queryByTestId('host-health')).toBeNull();
  });
});
