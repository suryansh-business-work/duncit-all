import { screen } from '@testing-library/react-native';

import { PricePanel, usePodPricing } from '@/components/create-pod/price-panel';
import { VenueQuoteCard } from '@/components/create-pod/steps/VenueSlotStep/VenueQuoteCard';
import { VenuePricingModel } from '@/generated/graphql/graphql';
import { usePotentialEarnings } from '@/hooks/usePotentialEarnings';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/usePotentialEarnings', () => ({ usePotentialEarnings: jest.fn() }));
const mockedEarnings = usePotentialEarnings as jest.Mock;

const finance = { platform_fee_pct: 5, gst_pct: 18, currency_symbol: '₹' };

const breakdown = (pax: number, payout: number, fee: number) => ({
  model: VenuePricingModel.PerPax,
  rate: 300,
  pax,
  hours: 2,
  base: payout,
  rules: [],
  min_spend_top_up: 0,
  cleaning_fee: 0,
  pet_fee: 0,
  gst_pct: 0,
  taxes: 0,
  platform_fee_pct: 5,
  platform_fee: fee,
  venue_payout: payout,
  total: payout + fee,
  deposit: 0,
});

describe('VenueQuoteCard ranges', () => {
  it('reads the venue and the pod money from the fewest guests to the most', () => {
    renderWithProviders(
      <VenueQuoteCard
        quote={breakdown(20, 6000, 300)}
        quoteMin={breakdown(8, 2400, 120)}
        loading={false}
        error={null}
        currencySymbol="₹"
      />,
    );
    expect(screen.getByTestId('create-pod-quote-venue-range')).toHaveTextContent(
      '₹2,400.00 – ₹6,000.00',
    );
    expect(screen.getByTestId('create-pod-quote-total-range')).toHaveTextContent(
      '₹2,520.00 – ₹6,300.00',
    );
    expect(
      screen.getByText('From 8 guests, the fewest the venue is paid for, up to your 20 spots.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Breakdown at 20 guests')).toBeOnTheScreen();
  });

  it('draws no range when both ends cost the same', () => {
    renderWithProviders(
      <VenueQuoteCard
        quote={breakdown(20, 6000, 300)}
        quoteMin={breakdown(20, 6000, 300)}
        loading={false}
        error={null}
        currencySymbol="₹"
      />,
    );
    expect(screen.getByTestId('create-pod-venue-quote')).toBeOnTheScreen();
    expect(screen.queryByTestId('create-pod-quote-range')).toBeNull();
  });
});

const waterfall = (hostReceives: number) => ({
  amount: 9500,
  gst_pct: 18,
  gst_amount: 1449.15,
  net_amount: 8050.85,
  platform_fee_pct: 5,
  platform_fee_amount: 402.54,
  pool_amount: 7648.31,
  club_admin_pct: 0,
  club_admin_amount: 0,
  venue_amount: 6000,
  venue_commission_pct: 0,
  venue_commission_amount: 0,
  venue_receives: 6000,
  host_amount: 1648.31,
  host_commission_pct: 10,
  host_commission_amount: 164.83,
  host_receives: hostReceives,
  host_earn_pct: 10,
});

function PanelHarness() {
  return (
    <PricePanel
      finance={finance}
      pricing={usePodPricing({
        podAmount: 500,
        noOfSpots: 20,
        venueId: 'v1',
        slotPrice: 6300,
        isPhysical: true,
        isFree: false,
      })}
    />
  );
}

const withMinimum = (atFewest: number) => {
  const atMost = waterfall(1483.48);
  mockedEarnings.mockReturnValue({
    projection: {
      total_spots: 20,
      payable_spots: 19,
      waterfall: atMost,
      minimum: { total_spots: 8, waterfall: { host_receives: atFewest } },
    },
    waterfall: atMost,
    isLoading: false,
  });
};

describe('EarningsRange', () => {
  it("shows the take-home from the venue's minimum guests up to every spot sold", () => {
    withMinimum(310.5);
    renderWithProviders(<PanelHarness />);
    expect(screen.getByText('You could earn')).toBeOnTheScreen();
    expect(screen.getByTestId('price-panel-earnings-range-value')).toHaveTextContent(
      '₹310.50 – ₹1,483.48',
    );
    expect(
      screen.getByText(/From 8 guests, the fewest the venue is paid for, up to all 20/),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('price-panel-earnings-range-low')).toBeNull();
  });

  it('says so, without blocking, when the fewest guests would not cover the venue', () => {
    withMinimum(0);
    renderWithProviders(<PanelHarness />);
    expect(screen.getByTestId('price-panel-earnings-range-low')).toHaveTextContent(
      /With only 8 guests this pod would not cover the venue/,
    );
    // Publishing is judged at the pod's spots, where it still earns.
    expect(screen.getByTestId('create-pod-earnings')).toBeOnTheScreen();
  });

  it('draws no range for a pod with no minimum asked for', () => {
    const atMost = waterfall(1483.48);
    mockedEarnings.mockReturnValue({
      projection: { total_spots: 20, payable_spots: 19, waterfall: atMost, minimum: null },
      waterfall: atMost,
      isLoading: false,
    });
    renderWithProviders(<PanelHarness />);
    expect(screen.getByTestId('create-pod-earnings')).toBeOnTheScreen();
    expect(screen.queryByTestId('price-panel-earnings-range')).toBeNull();
  });
});
