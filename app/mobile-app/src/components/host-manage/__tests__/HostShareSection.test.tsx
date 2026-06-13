import { screen } from '@testing-library/react-native';

import { HostShareSection } from '@/components/host-manage/HostShareSection';
import { useHostPayouts } from '@/hooks/useHostPayouts';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useHostPayouts', () => ({ useHostPayouts: jest.fn() }));
const mockedUse = useHostPayouts as jest.Mock;

const withBreakdown = {
  id: 'r1',
  pod_title: 'Cafe jam',
  status: 'APPROVED',
  amount_requested: 861,
  approved_amount: 800,
  breakdown: {
    collected_total: 5000,
    venue_bill: 1500,
    gst_pct: 18,
    gst_amount: 630,
    duncit_pct: 70,
    duncit_amount: 2009,
    payout_pct: 30,
    payout_amount: 861,
  },
};
const withoutBreakdown = {
  id: 'r2',
  pod_title: 'Online jam',
  status: 'WEIRD',
  amount_requested: 400,
  approved_amount: null,
  breakdown: null,
};
// Pending: not yet approved, so the payout falls back to the breakdown's amount.
const pendingPayout = {
  id: 'r3',
  pod_title: 'Pending jam',
  status: 'PENDING',
  amount_requested: 999,
  approved_amount: null,
  breakdown: {
    collected_total: 3000,
    venue_bill: 0,
    gst_pct: 18,
    gst_amount: 100,
    duncit_pct: 50,
    duncit_amount: 200,
    payout_pct: 50,
    payout_amount: 700,
  },
};

const api = (over: Record<string, unknown> = {}) => ({
  payouts: [withBreakdown, withoutBreakdown, pendingPayout],
  symbol: '₹',
  isLoading: false,
  refetch: jest.fn(),
  ...over,
});

beforeEach(() => jest.clearAllMocks());

describe('HostShareSection', () => {
  it('shows the loading state', () => {
    mockedUse.mockReturnValue(api({ payouts: [], isLoading: true }));
    renderWithProviders(<HostShareSection />);
    expect(screen.getByTestId('host-share-loading')).toBeOnTheScreen();
  });

  it('shows the empty state', () => {
    mockedUse.mockReturnValue(api({ payouts: [] }));
    renderWithProviders(<HostShareSection />);
    expect(screen.getByTestId('host-share-empty')).toBeOnTheScreen();
  });

  it('renders payouts with and without a breakdown', () => {
    mockedUse.mockReturnValue(api());
    renderWithProviders(<HostShareSection />);
    // Approved payout uses approved_amount and shows the breakdown lines.
    expect(screen.getByText('₹800.00')).toBeOnTheScreen();
    expect(screen.getByText('Duncit Taken (70%)')).toBeOnTheScreen();
    expect(screen.getByText('Your Commission (30%)')).toBeOnTheScreen();
    // Breakdown-less payout falls back to amount_requested and a bare label.
    expect(screen.getByText('₹400.00')).toBeOnTheScreen();
    expect(screen.getByText('Your Commission')).toBeOnTheScreen();
    expect(screen.getByText('APPROVED')).toBeOnTheScreen();
    expect(screen.getByText('WEIRD')).toBeOnTheScreen();
    // Pending payout (no approved amount) shows the breakdown's payout amount.
    expect(screen.getByText('₹700.00')).toBeOnTheScreen();
  });
});
