import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { gql } from '@apollo/client';
import { describe, expect, it } from 'vitest';
import PricePanel, { SUGGESTED_TICKET_PRICES, type EarningsPreview } from '../price-panel';
import SuggestedPricesDialog from '../price-panel/SuggestedPricesDialog';
import { isVenueShortfall } from '../price-panel/useEarningsPreview';
import {
  SUGGESTED_PRICES_EMPTY,
  SUGGESTED_PRICES_NOTE,
  VENUE_SHORTFALL_MESSAGE,
  ZERO_EARNINGS_BODY,
  ZERO_EARNINGS_TITLE,
} from '../price-panel/pricingCopy';
import ZeroEarningsNotice from '../price-panel/ZeroEarningsNotice';

// Structurally identical to usePricing's private document so Apollo matches it.
const PUBLIC_FINANCE = gql`
  query PublicFinanceSettingsForPricing {
    publicFinanceSettings {
      platform_fee_pct
      gst_pct
      currency_symbol
      default_backout_deduction_pct
    }
  }
`;

const financeMock = {
  request: { query: PUBLIC_FINANCE },
  result: {
    data: {
      publicFinanceSettings: {
        platform_fee_pct: 5,
        gst_pct: 18,
        currency_symbol: '₹',
        default_backout_deduction_pct: 20,
      },
    },
  },
};

// A pod that collects ₹200 in total against a ₹500 venue slot — the venue is
// deducted once for the pod, so nothing is left for anyone.
const shortfallWaterfall = {
  amount: 200,
  gst_pct: 18,
  gst_amount: 30.51,
  net_amount: 169.49,
  platform_fee_pct: 5,
  platform_fee_amount: 8.47,
  pool_amount: 161.02,
  club_admin_pct: 0,
  club_admin_amount: 0,
  venue_amount: 500,
  venue_commission_pct: 10,
  venue_commission_amount: 50,
  venue_receives: 450,
  host_amount: -338.98,
  host_commission_pct: 10,
  host_commission_amount: 0,
  host_receives: -338.98,
  host_earn_pct: 0,
};

function previewWith(overrides: Partial<EarningsPreview>): EarningsPreview {
  return {
    slotPrice: 500,
    podAmount: 100,
    noOfSpots: 3,
    venueId: 'v1',
    isPhysical: true,
    isFree: false,
    projection: { total_spots: 3, payable_spots: 2, waterfall: shortfallWaterfall },
    loading: false,
    stale: false,
    hasVenue: true,
    ready: true,
    priceMissing: false,
    zeroEarnings: false,
    venueShortfall: false,
    blocked: false,
    ...overrides,
  };
}

describe('Step-4 pricing guards', () => {
  it('flags a venue shortfall only for a priced, multi-spot physical pod', () => {
    const base = {
      podAmount: 100,
      noOfSpots: 3,
      slotPrice: 500,
      venueId: 'v1',
      isPhysical: true,
      isFree: false,
    };
    // ₹100 × 2 payable spots = ₹200 < ₹500.
    expect(isVenueShortfall(base)).toBe(true);
    // ₹300 × 2 = ₹600 ≥ ₹500.
    expect(isVenueShortfall({ ...base, podAmount: 300 })).toBe(false);
    // Free pods, host-only pods, virtual pods and unpriced slots are exempt.
    expect(isVenueShortfall({ ...base, podAmount: 0 })).toBe(false);
    expect(isVenueShortfall({ ...base, noOfSpots: 1 })).toBe(false);
    expect(isVenueShortfall({ ...base, isPhysical: false })).toBe(false);
    expect(isVenueShortfall({ ...base, slotPrice: null })).toBe(false);
  });

  it('states the venue rule inside the Venue Charges section', async () => {
    render(
      <MockedProvider mocks={[financeMock]}>
        <PricePanel preview={previewWith({ venueShortfall: true, blocked: true })} />
      </MockedProvider>,
    );
    expect(await screen.findByTestId('price-panel-venue-error')).toHaveTextContent(
      VENUE_SHORTFALL_MESSAGE,
    );
  });

  it('keeps the charges tree clean when the pod covers the venue', async () => {
    render(
      <MockedProvider mocks={[financeMock]}>
        <PricePanel preview={previewWith({})} />
      </MockedProvider>,
    );
    await screen.findByTestId('price-panel-charges');
    expect(screen.queryByTestId('price-panel-venue-error')).not.toBeInTheDocument();
  });

  it('renders the zero-earnings notice copy', () => {
    render(<ZeroEarningsNotice />);
    const box = screen.getByTestId('create-pod-zero-earnings');
    expect(box).toHaveTextContent(ZERO_EARNINGS_TITLE);
    expect(box).toHaveTextContent(ZERO_EARNINGS_BODY);
  });
});

const suggestionVariables = { no_of_spots: 10, venue_id: 'v1', venue_amount: 300 };

function renderDialog(prices: { price: number; host_receives: number }[]) {
  return render(
    <MockedProvider
      mocks={[
        {
          request: { query: SUGGESTED_TICKET_PRICES, variables: suggestionVariables },
          result: { data: { suggestedTicketPrices: prices } },
        },
      ]}
    >
      <SuggestedPricesDialog
        open
        onClose={() => undefined}
        noOfSpots={10}
        venueId="v1"
        venueAmount={300}
        symbol="₹"
      />
    </MockedProvider>,
  );
}

describe('Suggested Ticket Prices modal', () => {
  it('lists the ladder, marks the open-ended top rung and shows the note', async () => {
    renderDialog([
      { price: 99, host_receives: 120 },
      { price: 199, host_receives: 800 },
    ]);
    expect(await screen.findByTestId('suggested-price-99')).toHaveTextContent('₹99');
    expect(screen.getByTestId('suggested-price-99')).toHaveTextContent(
      'Most affordable — the easiest price to fill every spot.',
    );
    expect(screen.getByTestId('suggested-price-199')).toHaveTextContent('₹199+');
    expect(screen.getByTestId('suggested-prices-note')).toHaveTextContent(SUGGESTED_PRICES_NOTE);
  });

  it('explains an empty ladder', async () => {
    renderDialog([]);
    expect(await screen.findByTestId('suggested-prices-empty')).toHaveTextContent(
      SUGGESTED_PRICES_EMPTY,
    );
  });
});
