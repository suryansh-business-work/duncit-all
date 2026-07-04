import { screen } from '@testing-library/react-native';

import { SettlementSummary } from '@/components/host-manage/SettlementSummary';
import { renderWithProviders } from '@/utils/test-utils';

const waterfall = {
  amount: 1000,
  gst_pct: 18,
  gst_amount: 152.54,
  platform_fee_pct: 5,
  platform_fee_amount: 42.37,
  pool_amount: 805.09,
  venue_amount: 300,
  venue_receives: 270,
  host_receives: 454.58,
  duncit_revenue: 122.88,
};

const settlement = {
  currency_symbol: '₹',
  collected_total: 1000,
  has_venue: true,
  waterfall,
};

describe('SettlementSummary', () => {
  it('shows the empty prompt with no settlement', () => {
    renderWithProviders(<SettlementSummary settlement={null} isLoading={false} />);
    expect(screen.getByTestId('settlement-empty')).toBeOnTheScreen();
  });

  it('shows the spinner while loading', () => {
    renderWithProviders(<SettlementSummary settlement={null} isLoading />);
    expect(screen.getByTestId('settlement-loading')).toBeOnTheScreen();
  });

  it('renders the full waterfall including the venue lines', () => {
    renderWithProviders(<SettlementSummary settlement={settlement} isLoading={false} />);
    expect(screen.getByTestId('settlement-row-Customer Paid')).toBeOnTheScreen();
    expect(screen.getByText('− GST (18%)')).toBeOnTheScreen();
    expect(screen.getByText('− Platform Fee (5%)')).toBeOnTheScreen();
    expect(screen.getByText('₹805.09')).toBeOnTheScreen();
    expect(screen.getByText('₹300.00')).toBeOnTheScreen();
    expect(screen.getByText('₹270.00')).toBeOnTheScreen();
    expect(screen.getByText('₹454.58')).toBeOnTheScreen();
    expect(screen.getByText('₹122.88')).toBeOnTheScreen();
    expect(screen.getByText('Your share (after Finance approval)')).toBeOnTheScreen();
  });

  it('skips the venue lines for a venue-less pod', () => {
    const noVenue = {
      ...settlement,
      has_venue: false,
      waterfall: { ...waterfall, venue_amount: 0, venue_receives: 0, host_receives: 724.58 },
    };
    renderWithProviders(<SettlementSummary settlement={noVenue} isLoading={false} />);
    expect(screen.queryByTestId('settlement-row-Venue price')).toBeNull();
    expect(screen.getByText('₹724.58')).toBeOnTheScreen();
  });
});
