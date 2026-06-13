import { screen } from '@testing-library/react-native';

import { SettlementSummary } from '@/components/host-manage/SettlementSummary';
import { renderWithProviders } from '@/utils/test-utils';

const settlement = {
  currency_symbol: '₹',
  collected_total: 5000,
  has_venue: true,
  host: {
    venue_bill: 1500,
    gst_pct: 18,
    gst_amount: 630,
    duncit_pct: 70,
    duncit_amount: 2009,
    payout_pct: 30,
    payout_amount: 861,
  },
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

  it('renders the reconciled lines', () => {
    renderWithProviders(<SettlementSummary settlement={settlement} isLoading={false} />);
    expect(screen.getByTestId('settlement-row-Total collected')).toBeOnTheScreen();
    expect(screen.getByText('Your Commission (30%)')).toBeOnTheScreen();
    expect(screen.getByText('₹861.00')).toBeOnTheScreen();
  });
});
