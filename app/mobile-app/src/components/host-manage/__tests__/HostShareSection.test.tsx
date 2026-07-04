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
    version: 1,
    share_amount: 0,
    commission_pct: 0,
    commission_amount: 0,
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
    version: 1,
    share_amount: 0,
    commission_pct: 0,
    commission_amount: 0,
  },
};
// v2 waterfall payout: the host's pool remainder minus Duncit commission.
const waterfallPayout = {
  id: 'r4',
  pod_title: 'Waterfall jam',
  status: 'APPROVED',
  amount_requested: 454.58,
  approved_amount: 454.58,
  breakdown: {
    collected_total: 1000,
    venue_bill: 0,
    gst_pct: 18,
    gst_amount: 152.54,
    duncit_pct: 0,
    duncit_amount: 0,
    payout_pct: 0,
    payout_amount: 454.58,
    version: 2,
    share_amount: 505.09,
    commission_pct: 10,
    commission_amount: 50.51,
  },
};

// Free pod: nothing collected, nothing payable.
const zeroPayout = {
  id: 'r5',
  pod_title: 'Free jam',
  status: 'PENDING',
  amount_requested: 0,
  approved_amount: null,
  breakdown: null,
};

const api = (over: Record<string, unknown> = {}) => ({
  payouts: [withBreakdown, withoutBreakdown, pendingPayout, waterfallPayout, zeroPayout],
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
    expect(screen.getAllByText('Your Commission')).toHaveLength(2);
    expect(screen.getAllByText('APPROVED')).toHaveLength(2);
    expect(screen.getByText('WEIRD')).toBeOnTheScreen();
    // Pending payout (no approved amount) shows the breakdown's payout amount.
    expect(screen.getByText('₹700.00')).toBeOnTheScreen();
    // v2 payout renders "your amount − commission = payout".
    expect(screen.getByText('Your Amount')).toBeOnTheScreen();
    expect(screen.getByText('₹505.09')).toBeOnTheScreen();
    expect(screen.getByText('− Commission (10%)')).toBeOnTheScreen();
    expect(screen.getByText('₹50.51')).toBeOnTheScreen();
    expect(screen.getByText('Payout')).toBeOnTheScreen();
    expect(screen.getByText('₹454.58')).toBeOnTheScreen();
    // Zero-amount payout + the pending payout's zero venue bill render as ₹0.00.
    expect(screen.getAllByText('₹0.00')).toHaveLength(2);
  });
});
