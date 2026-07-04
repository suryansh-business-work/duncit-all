import { screen } from '@testing-library/react-native';

import { VenueEarningsScreen } from '@/screens/VenueEarningsScreen';
import { useVenueEarnings } from '@/hooks/useVenueEarnings';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/components/AppHeader', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: V } = require('react-native');
  return { AppHeader: () => <V testID="app-header-stub" /> };
});
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: jest.fn() }),
}));
jest.mock('@/hooks/useVenueEarnings', () => ({ useVenueEarnings: jest.fn() }));
const mockedUse = useVenueEarnings as jest.Mock;

const summary = {
  currency_symbol: '₹',
  lifetime_earnings: 2700,
  pending_amount: 135,
  pods_completed: 10,
  this_month_earnings: 540,
};
const v2Payout = {
  id: 'r1',
  pod_title: 'Cafe jam',
  status: 'APPROVED',
  amount_requested: 270,
  approved_amount: 270,
  created_at: '2026-06-13',
  breakdown: {
    version: 2,
    payout_amount: 270,
    share_amount: 300,
    commission_pct: 10,
    commission_amount: 30,
  },
};
// Legacy venue-bill release: no waterfall line, payout from the breakdown.
const v1Payout = {
  id: 'r2',
  pod_title: 'Old jam',
  status: 'PENDING',
  amount_requested: 500,
  approved_amount: null,
  created_at: 'bad-date',
  breakdown: {
    version: 1,
    payout_amount: 480,
    share_amount: 0,
    commission_pct: 0,
    commission_amount: 0,
  },
};
const barePayout = {
  id: 'r3',
  pod_title: 'Bare jam',
  status: 'WEIRD',
  amount_requested: 120,
  approved_amount: null,
  created_at: '2026-06-14',
  breakdown: null,
};

const api = (over: Record<string, unknown> = {}) => ({
  summary,
  payouts: [v2Payout, v1Payout, barePayout],
  isLoading: false,
  refetch: jest.fn(),
  ...over,
});

beforeEach(() => jest.clearAllMocks());

describe('VenueEarningsScreen', () => {
  it('shows the loading spinner without summary or payouts', () => {
    mockedUse.mockReturnValue(api({ summary: null, payouts: [], isLoading: true }));
    renderWithProviders(<VenueEarningsScreen />);
    expect(screen.getByTestId('venue-earnings-loading')).toBeOnTheScreen();
    expect(screen.queryByTestId('earnings-summary-tiles')).toBeNull();
    expect(screen.queryByTestId('venue-earnings-empty')).toBeNull();
  });

  it('shows the empty state once loaded with no payouts', () => {
    mockedUse.mockReturnValue(api({ payouts: [] }));
    renderWithProviders(<VenueEarningsScreen />);
    expect(screen.getByTestId('venue-earnings-empty')).toBeOnTheScreen();
    expect(screen.getByText('Lifetime earnings')).toBeOnTheScreen();
    expect(screen.getByText('₹2700.00')).toBeOnTheScreen();
    expect(screen.getByText('10')).toBeOnTheScreen();
  });

  it('renders v2, v1 and breakdown-less payout cards', () => {
    mockedUse.mockReturnValue(api());
    renderWithProviders(<VenueEarningsScreen />);
    // v2 card: title, date, waterfall line, payout amount + status pill.
    expect(screen.getByText('Cafe jam')).toBeOnTheScreen();
    expect(screen.getByTestId('venue-payout-waterfall')).toHaveTextContent(
      '₹300.00 slot price − ₹30.00 commission (10%) = ₹270.00 payout',
    );
    expect(screen.getByText('₹270.00')).toBeOnTheScreen();
    expect(screen.getByText('APPROVED')).toBeOnTheScreen();
    // v1 card: no waterfall line, invalid date dash, breakdown payout fallback.
    expect(screen.getByText('Old jam')).toBeOnTheScreen();
    expect(screen.getByText('—')).toBeOnTheScreen();
    expect(screen.getByText('₹480.00')).toBeOnTheScreen();
    // Breakdown-less card falls back to amount_requested + grey pill.
    expect(screen.getByText('₹120.00')).toBeOnTheScreen();
    expect(screen.getByText('WEIRD')).toBeOnTheScreen();
  });
});
