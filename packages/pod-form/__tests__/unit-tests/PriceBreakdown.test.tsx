import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PriceBreakdown from '../../src/components/PriceBreakdown';

describe('PriceBreakdown', () => {
  it('renders the default rupee currency and computed fee/gst/payout', () => {
    render(<PriceBreakdown amount={118} finance={{ platform_fee_pct: 0, gst_pct: 18 }} />);
    // divisor = 1 * 1.18 -> net = 100.00 (net + final payout both show ₹100.00)
    expect(screen.getByText('₹118.00')).toBeInTheDocument();
    expect(screen.getAllByText('₹100.00')).toHaveLength(2);
    expect(screen.getByText('GST (18%)')).toBeInTheDocument();
    expect(screen.getByText('Platform Fee (0%)')).toBeInTheDocument();
  });

  it('uses the supplied currency symbol', () => {
    render(
      <PriceBreakdown amount={100} finance={{ platform_fee_pct: 10, gst_pct: 0, currency_symbol: '$' }} />,
    );
    expect(screen.getByText('$100.00')).toBeInTheDocument();
  });

  it('divides product cost across spots when spots are available', () => {
    render(
      <PriceBreakdown
        amount={200}
        finance={{ platform_fee_pct: 0, gst_pct: 0 }}
        productCost={100}
        spots={4}
      />,
    );
    // productShare = 100 / 4 = 25.00
    expect(screen.getByText('₹25.00')).toBeInTheDocument();
    // final payout = 200 - 25 = 175.00
    expect(screen.getByText('₹175.00')).toBeInTheDocument();
  });

  it('uses the full product cost when spots are zero and clamps payout at 0', () => {
    render(
      <PriceBreakdown
        amount={50}
        finance={{ platform_fee_pct: 0, gst_pct: 0 }}
        productCost={100}
        spots={0}
      />,
    );
    // productShare = 100 (no spot division); payout clamps to 0.00
    expect(screen.getByText('₹100.00')).toBeInTheDocument();
    // fee, gst and final payout all render ₹0.00
    expect(screen.getAllByText('₹0.00').length).toBeGreaterThanOrEqual(1);
  });

  it('handles a non-numeric amount as zero gross', () => {
    render(
      <PriceBreakdown
        amount={Number.NaN}
        finance={{ platform_fee_pct: 10, gst_pct: 10 }}
      />,
    );
    // gross falls back to 0 -> user pays ₹0.00
    expect(screen.getAllByText('₹0.00').length).toBeGreaterThan(0);
  });

  it('falls back to gross when the divisor is not positive', () => {
    render(<PriceBreakdown amount={100} finance={{ platform_fee_pct: -200, gst_pct: 0 }} />);
    // divisor = (1 - 2) * 1 = -1 <= 0 -> net = gross; user-pays and payout both ₹100.00
    expect(screen.getAllByText('₹100.00').length).toBeGreaterThanOrEqual(2);
  });
});
