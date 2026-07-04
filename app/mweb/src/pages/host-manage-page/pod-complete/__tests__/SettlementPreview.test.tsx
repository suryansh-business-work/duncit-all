import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { describe, expect, it } from 'vitest';
import SettlementPreview, { POD_SETTLEMENT_PREVIEW } from '../SettlementPreview';

// Canonical vector @ GST 18 / fee 5 / both commissions 10, ₹1000, slot ₹300.
const mocks = [
  {
    request: { query: POD_SETTLEMENT_PREVIEW, variables: { pod_id: 'pod1', venue_bill_amount: 0 } },
    result: {
      data: {
        podSettlementPreview: {
          currency_symbol: '₹',
          collected_total: 1000,
          has_venue: true,
          waterfall: {
            version: 2,
            amount: 1000,
            gst_pct: 18,
            gst_amount: 152.54,
            net_amount: 847.46,
            platform_fee_pct: 5,
            platform_fee_amount: 42.37,
            pool_amount: 805.09,
            venue_amount: 300,
            venue_commission_pct: 10,
            venue_commission_amount: 30,
            venue_receives: 270,
            host_amount: 505.09,
            host_commission_pct: 10,
            host_commission_amount: 50.51,
            host_receives: 454.58,
            duncit_revenue: 122.88,
            host_earn_pct: 45.46,
          },
        },
      },
    },
  },
];

describe('SettlementPreview (waterfall v2)', () => {
  it('renders the finance-engine waterfall lines', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <SettlementPreview podId="pod1" venueBillAmount={0} />
      </MockedProvider>,
    );
    expect(await screen.findByText('Customer Paid')).toBeInTheDocument();
    expect(screen.getByText('₹1000.00')).toBeInTheDocument();
    expect(screen.getByText('− GST (18%)')).toBeInTheDocument();
    expect(screen.getByText('− Platform Fee (5%)')).toBeInTheDocument();
    expect(screen.getByText('Pool')).toBeInTheDocument();
    expect(screen.getByText('₹805.09')).toBeInTheDocument();
    expect(screen.getByText('Venue slot price')).toBeInTheDocument();
    expect(screen.getByText('Venue receives')).toBeInTheDocument();
    expect(screen.getByText('₹270.00')).toBeInTheDocument();
    expect(screen.getByText('You receive')).toBeInTheDocument();
    expect(screen.getByText('₹454.58')).toBeInTheDocument();
    expect(screen.getByText('Duncit revenue')).toBeInTheDocument();
    expect(screen.getByText('₹122.88')).toBeInTheDocument();
    expect(screen.getByText('Your share (after Finance approval)')).toBeInTheDocument();
  });
});
