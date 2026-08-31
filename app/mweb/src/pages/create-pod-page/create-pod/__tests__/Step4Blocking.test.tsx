import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { describe, expect, it } from 'vitest';
import {
  POTENTIAL_POD_EARNINGS,
  useEarningsPreview,
  type EarningsPreview,
} from '../price-panel';
import StepFooterBar from '../StepFooterBar';

// A virtual pod, so the venue rule can never fire and the zero-earnings rule is
// the only thing that can block publishing.
const waterfall = (hostReceives: number) => ({
  amount: 200,
  gst_pct: 18,
  gst_amount: 30.51,
  net_amount: 169.49,
  platform_fee_pct: 5,
  platform_fee_amount: 8.47,
  pool_amount: 161.02,
  club_admin_pct: 0,
  club_admin_amount: 0,
  venue_amount: 0,
  host_amount: hostReceives,
  host_commission_pct: 10,
  host_commission_amount: 0,
  host_receives: hostReceives,
  host_earn_pct: 0,
});

const earningsMock = (podAmount: number, hostReceives: number) => ({
  request: {
    query: POTENTIAL_POD_EARNINGS,
    variables: { pod_amount: podAmount, no_of_spots: 3, venue_id: null, venue_amount: null },
  },
  result: {
    data: {
      potentialPodEarnings: {
        total_spots: 3,
        payable_spots: 2,
        waterfall: waterfall(hostReceives),
      },
    },
  },
});

/** Drives the shared Step-4 preview hook and reports every value it produces —
 * the stepper reads exactly these flags to disable Create Pod. */
function PreviewHarness({
  podAmount,
  isFree = false,
  onPreview,
}: Readonly<{
  podAmount: number;
  isFree?: boolean;
  onPreview: (preview: EarningsPreview) => void;
}>) {
  const preview = useEarningsPreview({
    slotPrice: null,
    podAmount,
    noOfSpots: 3,
    venueId: null,
    isPhysical: false,
    isFree,
  });
  onPreview(preview);
  return null;
}

function renderPreview(podAmount: number, hostReceives: number, isFree = false) {
  const seen: EarningsPreview[] = [];
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[earningsMock(podAmount, hostReceives)]}>
      <PreviewHarness
        podAmount={podAmount}
        isFree={isFree}
        onPreview={(preview) => seen.push(preview)}
      />
    </MockedProvider>,
  );
  return seen;
}

describe('Step-4 publish gate', () => {
  it('blocks publishing when the projected payout is ₹0 or less', async () => {
    const seen = renderPreview(10, 0);
    await waitFor(() => expect(seen.at(-1)?.zeroEarnings).toBe(true));
    expect(seen.at(-1)?.blocked).toBe(true);
    // A virtual pod never trips the venue rule, so this block is the ₹0 rule.
    expect(seen.at(-1)?.venueShortfall).toBe(false);
  });

  it('clears the block as soon as the payout is positive', async () => {
    const seen = renderPreview(500, 640);
    await waitFor(() => expect(seen.at(-1)?.projection).toBeDefined());
    expect(seen.at(-1)?.zeroEarnings).toBe(false);
    expect(seen.at(-1)?.blocked).toBe(false);
  });

  // The Ticket Price field ships blank, so an untouched paid pod reads as ₹0 —
  // publishing stays blocked until the host types a price of their own.
  it('blocks a paid pod while the ticket price is still blank', () => {
    const seen = renderPreview(0, 0);
    expect(seen.at(-1)?.priceMissing).toBe(true);
    expect(seen.at(-1)?.blocked).toBe(true);
  });

  it('exempts a free pod, whose price is legitimately ₹0', () => {
    const seen = renderPreview(0, 0, true);
    expect(seen.at(-1)?.priceMissing).toBe(false);
    expect(seen.at(-1)?.blocked).toBe(false);
  });
});

const noop = () => undefined;

describe('Create Pod button', () => {
  it('is disabled while a pricing rule is unmet and enabled once it clears', () => {
    const { rerender } = render(
      <StepFooterBar
        isFirst={false}
        isLast
        busy={false}
        submitDisabled
        onBack={noop}
        onNext={noop}
        onSubmit={noop}
      />,
    );
    expect(screen.getByRole('button', { name: 'Create Pod' })).toBeDisabled();

    rerender(
      <StepFooterBar
        isFirst={false}
        isLast
        busy={false}
        submitDisabled={false}
        onBack={noop}
        onNext={noop}
        onSubmit={noop}
      />,
    );
    expect(screen.getByRole('button', { name: 'Create Pod' })).toBeEnabled();
  });
});
