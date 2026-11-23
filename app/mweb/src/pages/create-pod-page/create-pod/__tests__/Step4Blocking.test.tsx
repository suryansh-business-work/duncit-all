import '@testing-library/jest-dom/vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { describe, expect, it } from 'vitest';
import type { OfferEarningsArgs } from '@duncit/utils';
import {
  POTENTIAL_POD_EARNINGS,
  useEarningsPreview,
  type EarningsPreview,
} from '../price-panel';
import StepFooterBar from '../StepFooterBar';

// ₹100 × 2 paying seats (3 spots, the host sits free) on a virtual pod.
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
  venue_commission_pct: 0,
  venue_commission_amount: 0,
  venue_receives: 0,
  host_amount: hostReceives,
  host_commission_pct: 10,
  host_commission_amount: 0,
  host_receives: hostReceives,
  host_earn_pct: 0,
});

interface Verdict {
  viable: boolean;
  viability_reason?: 'BELOW_MIN_BUSINESS' | 'VENUE_NOT_COVERED' | 'NO_EARNINGS' | null;
  minimum_viable_ticket_price?: number | null;
  venue_min_business?: number;
}

const projectionOf = (verdict: Verdict, hostReceives = 120) => ({
  total_spots: 3,
  payable_spots: 2,
  viable: verdict.viable,
  viability_reason: verdict.viability_reason ?? null,
  minimum_viable_ticket_price: verdict.minimum_viable_ticket_price ?? null,
  venue_min_business: verdict.venue_min_business ?? 0,
  minimum: null,
  waterfall: waterfall(hostReceives),
});

const noVenue = { venue_id: null, venue_amount: null, venue_commission_on_top: null };

const earningsMock = (podAmount: number, verdict: Verdict, venue: Record<string, unknown> = noVenue): MockedResponse => ({
  request: { query: POTENTIAL_POD_EARNINGS, variables: { pod_amount: podAmount, no_of_spots: 3, ...venue } },
  result: { data: { potentialPodEarnings: projectionOf(verdict) } },
});

const failingMock = (podAmount: number): MockedResponse => ({
  request: { query: POTENTIAL_POD_EARNINGS, variables: { pod_amount: podAmount, no_of_spots: 3, ...noVenue } },
  error: new Error('Network request failed'),
});

interface HarnessInput {
  podAmount: number;
  isFree?: boolean;
  isPhysical?: boolean;
  slotPrice?: number | null;
  offerEarnings?: OfferEarningsArgs | null;
}

/** Drives the shared Step-4 preview hook and reports every value it produces —
 * the stepper reads exactly `blocked` to disable Create Pod. */
function PreviewHarness({ input, onPreview }: Readonly<{ input: HarnessInput; onPreview: (preview: EarningsPreview) => void }>) {
  const preview = useEarningsPreview({
    slotPrice: input.slotPrice ?? null,
    offerEarnings: input.offerEarnings,
    podAmount: input.podAmount,
    noOfSpots: 3,
    venueId: input.isPhysical ? 'v1' : null,
    isPhysical: input.isPhysical ?? false,
    isFree: input.isFree ?? false,
  });
  onPreview(preview);
  return null;
}

function renderPreview(input: HarnessInput, mocks: MockedResponse[] = []) {
  const seen: EarningsPreview[] = [];
  const view = render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <PreviewHarness input={input} onPreview={(preview) => seen.push(preview)} />
    </MockedProvider>,
  );
  const rerender = (next: HarnessInput) =>
    view.rerender(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
        <PreviewHarness input={next} onPreview={(preview) => seen.push(preview)} />
      </MockedProvider>,
    );
  return { seen, latest: () => seen.at(-1) as EarningsPreview, rerender };
}

describe('Step-4 publish gate — a paid pod needs a fresh projection that says viable', () => {
  it('stays blocked while the projection is still loading', () => {
    const { seen } = renderPreview({ podAmount: 500 }, [earningsMock(500, { viable: true })]);
    // The first render: the request is out, nothing has answered yet.
    expect(seen[0]).toMatchObject({ loading: true, fresh: false, blocked: true });
  });

  it('enables Create Pod once the fresh projection says viable', async () => {
    const { latest } = renderPreview({ podAmount: 500 }, [earningsMock(500, { viable: true })]);
    await waitFor(() => expect(latest().fresh).toBe(true));
    expect(latest()).toMatchObject({ notViable: false, failed: false, blocked: false });
  });

  it('blocks again the moment the price changes, before the new answer is in', async () => {
    const { latest, rerender } = renderPreview({ podAmount: 500 }, [
      earningsMock(500, { viable: true }),
      earningsMock(50, { viable: true }),
    ]);
    await waitFor(() => expect(latest().blocked).toBe(false));
    rerender({ podAmount: 50 });
    // A viable answer for ₹500 says nothing about ₹50: the debounce has not caught up.
    expect(latest()).toMatchObject({ stale: true, fresh: false, blocked: true });
    await waitFor(() => expect(latest().fresh).toBe(true), { timeout: 2000 });
    expect(latest().blocked).toBe(false);
  });

  it.each([
    ['BELOW_MIN_BUSINESS', { viable: false, viability_reason: 'BELOW_MIN_BUSINESS', minimum_viable_ticket_price: 124, venue_min_business: 1000 }],
    ['VENUE_NOT_COVERED', { viable: false, viability_reason: 'VENUE_NOT_COVERED', minimum_viable_ticket_price: 450 }],
    ['NO_EARNINGS', { viable: false, viability_reason: 'NO_EARNINGS', minimum_viable_ticket_price: 210 }],
  ] as const)('blocks when the server refuses the pod (%s) and keeps its reason', async (reason, verdict) => {
    const { latest } = renderPreview({ podAmount: 100 }, [earningsMock(100, verdict)]);
    await waitFor(() => expect(latest().fresh).toBe(true));
    expect(latest()).toMatchObject({ notViable: true, blocked: true });
    expect(latest().projection?.viability_reason).toBe(reason);
  });

  it('blocks when the projection request fails, and unblocks after a successful retry', async () => {
    const { latest } = renderPreview({ podAmount: 500 }, [failingMock(500), earningsMock(500, { viable: true })]);
    await waitFor(() => expect(latest().failed).toBe(true));
    expect(latest()).toMatchObject({ fresh: false, notViable: false, blocked: true });
    act(() => latest().retry());
    await waitFor(() => expect(latest().fresh).toBe(true));
    expect(latest()).toMatchObject({ failed: false, blocked: false });
  });

  it("holds a physical pod until its venue's cost is known, even when a venue-less answer says viable", async () => {
    // The offer's quote is still out (slotPrice null), so the projection is asked without a venue.
    const { latest } = renderPreview({ podAmount: 500, isPhysical: true, slotPrice: null }, [earningsMock(500, { viable: true })]);
    await waitFor(() => expect(latest().projection?.viable).toBe(true));
    expect(latest()).toMatchObject({ hasVenue: false, fresh: false, blocked: true });
  });

  it("asks with the offer's model and hours, so the verdict holds the pod to the venue's minimum business", async () => {
    const offerEarnings = { venue_amount: 1000, venue_commission_on_top: 100, venue_offer_model: 'FLAT' as const, venue_hours: 2 };
    const venue = { venue_id: 'v1', ...offerEarnings };
    const verdict = { viable: false, viability_reason: 'BELOW_MIN_BUSINESS', minimum_viable_ticket_price: 700, venue_min_business: 1200 } as const;
    const { latest } = renderPreview({ podAmount: 100, isPhysical: true, slotPrice: 1100, offerEarnings }, [earningsMock(100, verdict, venue)]);
    // Only the variables carrying the model and hours resolve.
    await waitFor(() => expect(latest().fresh).toBe(true));
    expect(latest()).toMatchObject({ hasVenue: true, notViable: true, blocked: true });
    expect(latest().projection?.venue_min_business).toBe(1200);
  });

  // The Ticket Price field ships blank, so an untouched paid pod reads as ₹0 —
  // publishing stays blocked until the host types a price of their own.
  it('blocks a paid pod while the ticket price is still blank', () => {
    const { latest } = renderPreview({ podAmount: 0 });
    expect(latest()).toMatchObject({ priceMissing: true, fresh: false, blocked: true });
  });

  it('never blocks a free pod, whose price is legitimately ₹0 and which has no projection', () => {
    const { latest } = renderPreview({ podAmount: 0, isFree: true });
    expect(latest()).toMatchObject({ priceMissing: false, projection: undefined, notViable: false, blocked: false });
  });
});

const noop = () => undefined;

describe('Create Pod button', () => {
  it('is disabled while the gate holds and enabled once it clears', () => {
    const { rerender } = render(
      <StepFooterBar isFirst={false} isLast busy={false} submitDisabled onBack={noop} onNext={noop} onSubmit={noop} />,
    );
    expect(screen.getByRole('button', { name: 'Create Pod' })).toBeDisabled();

    rerender(<StepFooterBar isFirst={false} isLast busy={false} submitDisabled={false} onBack={noop} onNext={noop} onSubmit={noop} />);
    expect(screen.getByRole('button', { name: 'Create Pod' })).toBeEnabled();
  });

  it('only gates the last step — Next stays available while Money is unresolved', () => {
    render(<StepFooterBar isFirst={false} isLast={false} busy={false} submitDisabled nextLabel="Next: Details" onBack={noop} onNext={noop} onSubmit={noop} />);
    expect(screen.getByRole('button', { name: 'Next: Details' })).toBeEnabled();
  });
});
