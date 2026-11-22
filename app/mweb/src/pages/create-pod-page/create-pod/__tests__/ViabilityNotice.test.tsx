import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { EarningsWaterfall } from '@duncit/utils';
import type { EarningsPreview } from '../price-panel';
import ViabilityNotice from '../price-panel/ViabilityNotice';
import { fallbackT } from '../../../../i18n/fallback';

const WATERFALL: EarningsWaterfall = {
  amount: 900,
  gst_pct: 18,
  gst_amount: 137.29,
  net_amount: 762.71,
  platform_fee_pct: 5,
  platform_fee_amount: 38.14,
  pool_amount: 724.57,
  club_admin_pct: 0,
  club_admin_amount: 0,
  venue_amount: 1000,
  venue_commission_pct: 10,
  venue_commission_amount: 100,
  venue_receives: 900,
  host_amount: -275.43,
  host_commission_pct: 10,
  host_commission_amount: 0,
  host_receives: -275.43,
  host_earn_pct: 0,
};

const refused = (reason: string, price: number | null, minimum = 0) => ({
  total_spots: 10,
  payable_spots: 9,
  viable: false,
  viability_reason: reason,
  minimum_viable_ticket_price: price,
  venue_min_business: minimum,
  waterfall: WATERFALL,
});

function preview(over: Partial<EarningsPreview> = {}): EarningsPreview {
  return {
    slotPrice: 1100,
    podAmount: 100,
    noOfSpots: 10,
    venueId: 'v1',
    isPhysical: true,
    isFree: false,
    projection: undefined,
    loading: false,
    stale: false,
    failed: false,
    hasVenue: true,
    ready: true,
    priceMissing: false,
    venueShortfall: false,
    fresh: true,
    notViable: false,
    blocked: true,
    retry: vi.fn(),
    ...over,
  };
}

const notice = () => screen.getByTestId('create-pod-viability-notice');

describe('ViabilityNotice', () => {
  it("names the venue's minimum business and the lowest ticket price when the pod is below it", () => {
    // ₹100 × 9 paying seats = ₹900, less Duncit's 10% = ₹810 — not more than the ₹1,000 minimum.
    render(<ViabilityNotice currency="₹" preview={preview({ notViable: true, projection: refused('BELOW_MIN_BUSINESS', 124, 1000) })} />);
    expect(notice()).toHaveAttribute('data-reason', 'BELOW_MIN_BUSINESS');
    expect(notice()).toHaveTextContent("Below the venue's minimum business");
    expect(notice()).toHaveTextContent("This venue's minimum business is ₹1,000.00.");
    expect(notice()).toHaveTextContent('Set the ticket price to at least ₹124.00, or add spots.');
  });

  it('still names the minimum when no ticket price works', () => {
    render(<ViabilityNotice currency="₹" preview={preview({ notViable: true, projection: refused('BELOW_MIN_BUSINESS', null, 500000) })} />);
    expect(notice()).toHaveTextContent("This venue's minimum business is ₹5,00,000.00.");
    expect(notice()).toHaveTextContent('Add spots or raise the ticket price.');
    expect(notice()).not.toHaveTextContent('at least');
  });

  it('names the lowest working price when the ticket money does not cover the venue', () => {
    render(<ViabilityNotice currency="₹" preview={preview({ notViable: true, projection: refused('VENUE_NOT_COVERED', 450) })} />);
    expect(notice()).toHaveTextContent('The pod does not cover the venue');
    expect(notice()).toHaveTextContent('Set the ticket price to at least ₹450.00.');
  });

  it('falls back to the venue-price copy when no price covers the venue', () => {
    render(<ViabilityNotice currency="₹" preview={preview({ notViable: true, projection: refused('VENUE_NOT_COVERED', null) })} />);
    expect(notice()).toHaveTextContent(fallbackT('mweb.createPod.venueShortfall'));
  });

  it('names the lowest working price when the host would earn nothing', () => {
    render(<ViabilityNotice currency="₹" preview={preview({ notViable: true, projection: refused('NO_EARNINGS', 210) })} />);
    expect(notice()).toHaveTextContent(fallbackT('mweb.createPod.zeroEarningsTitle'));
    expect(notice()).toHaveTextContent('Set it to at least ₹210.00 to earn from this pod.');
  });

  it('keeps the ₹0 copy when no price earns anything', () => {
    render(<ViabilityNotice currency="₹" preview={preview({ notViable: true, projection: refused('NO_EARNINGS', null) })} />);
    expect(notice()).toHaveTextContent(fallbackT('mweb.createPod.zeroEarningsBody'));
  });

  it('says the check failed and asks again on Try again', () => {
    const retry = vi.fn();
    render(<ViabilityNotice currency="₹" preview={preview({ failed: true, fresh: false, retry })} />);
    expect(screen.getByTestId('create-pod-viability-failed')).toHaveTextContent(fallbackT('mweb.createPod.viability.checkFailed'));
    expect(screen.queryByTestId('create-pod-viability-notice')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.createPod.viability.retry') }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('says nothing for a viable pod, and nothing from a verdict that is no longer fresh — inside a live region either way', () => {
    const viable = { ...refused('NO_EARNINGS', 210), viable: true, viability_reason: null };
    const { rerender } = render(<ViabilityNotice currency="₹" preview={preview({ projection: viable, blocked: false })} />);
    const region = screen.getByTestId('create-pod-viability');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toBeEmptyDOMElement();
    // A refusing projection for older inputs (the price is still debouncing) is not shown.
    rerender(<ViabilityNotice currency="₹" preview={preview({ projection: refused('NO_EARNINGS', 210), stale: true, fresh: false })} />);
    expect(screen.getByTestId('create-pod-viability')).toBeEmptyDOMElement();
  });
});
