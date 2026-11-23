/**
 * Payment Release — what a request says when its payouts send out more than
 * its pod collected, and when its venue bill was recorded as evidence only.
 *
 * The ticket's case (see payment-release-shortfall.mock): a pod that took ₹36
 * pays the venue its ₹40 booking and the club admin ₹0.87 in full while the
 * host's side went to −₹15.89, beside a ₹9,999 bill kept only as evidence.
 */
import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { buildReleaseRequestView } from '../../src/pages/finance/payment-release-page/detail/release-terms';
import { billLine, mountReleaseDetail, payout } from '../payment-release-dom';
import { makeDetailBreakdown, makeDetailRelease, makeReleaseDetail } from '../mocks/payment-release.mock';
import {
  SHORTFALL,
  fundedDetail,
  shortfallClub,
  shortfallDetail,
  shortfallHost,
  shortfallSnapshot,
  shortfallVenue,
} from '../mocks/payment-release-shortfall.mock';

vi.mock('./mocks/dialogs', async (importOriginal) => {
  const stub = await importOriginal<typeof import('./mocks/dialogs')>();
  const { useConfirm } = await import('../../../../packages/dialogs/src/useConfirm');
  return { ...stub, useConfirm };
});

vi.mock('./mocks/ui', async (importOriginal) => {
  const stub = await importOriginal<typeof import('./mocks/ui')>();
  const { QueryGuard } = await import('../../../../packages/ui/src/QueryGuard');
  return { ...stub, QueryGuard };
});

const NEEDS_NOTE = 'Approving needs a note saying who funds it.';

describe('buildReleaseRequestView — the shortfall and the bill', () => {
  it('reads the shortfall off the payouts, and how much of it is still waiting', () => {
    const waiting = buildReleaseRequestView([shortfallVenue({ status: 'APPROVED' }), shortfallHost(), shortfallClub()]);
    expect(waiting.shortfall).toBe(SHORTFALL);
    expect(waiting.pendingShortfall).toBe(SHORTFALL);

    const decided = buildReleaseRequestView(fundedDetail().releases);
    expect(decided.shortfall).toBe(SHORTFALL);
    expect(decided.pendingShortfall).toBe(0);
  });

  it('reads none off a pod that paid its way, off releases with no snapshot, or off an empty request', () => {
    expect(buildReleaseRequestView(makeReleaseDetail().releases).shortfall).toBe(0);
    expect(buildReleaseRequestView([makeDetailRelease({ breakdown: null })]).shortfall).toBe(0);
    expect(buildReleaseRequestView([]).pendingShortfall).toBe(0);
  });

  it('calls a bill evidence only when the snapshot says it did not set the venue’s money', () => {
    const evidenceOnly = (breakdown = shortfallSnapshot()) =>
      buildReleaseRequestView([shortfallVenue({ breakdown })]).billEvidenceOnly;
    expect(evidenceOnly()).toBe(true);
    expect(evidenceOnly(shortfallSnapshot({ venue_bill_applied: true }))).toBe(false);
    // Written before it was recorded: a large bill there proves nothing either way.
    expect(evidenceOnly(shortfallSnapshot({ venue_bill_applied: null }))).toBe(false);
    expect(evidenceOnly(shortfallSnapshot({ venue_bill: 0 }))).toBe(false);
    expect(evidenceOnly(shortfallSnapshot({ version: 1 }))).toBe(false);
  });
});

describe('PaymentReleaseDetailPage — the shortfall warning', () => {
  it('says how much the payouts exceed what the pod collected, in plain words, while they wait', async () => {
    await mountReleaseDetail(shortfallDetail());
    const alert = screen.getByTestId('release-funding-shortfall');
    expect(within(alert).getByText('These payouts are ₹15.89 more than the pod collected')).toBeInTheDocument();
    expect(alert).toHaveTextContent(
      'The host’s share came to less than zero, but the venue and any club admin are still paid in full, so this amount has to come from outside the pod’s takings.',
    );
    expect(alert).toHaveTextContent(NEEDS_NOTE);
  });

  it('raises no warning on a request whose pod paid its way', async () => {
    await mountReleaseDetail(makeReleaseDetail());
    expect(screen.queryByTestId('release-funding-shortfall')).not.toBeInTheDocument();
  });

  it('shows the recorded funding note on every approved payout, and stops asking for one', async () => {
    await mountReleaseDetail(fundedDetail());
    for (const kind of ['VENUE_BILLING', 'HOST_PAYMENT', 'CLUB_ADMIN'] as const) {
      expect(within(payout(kind)).getByTestId(`release-funding-note-${kind}`)).toHaveTextContent(
        'Shortfall funding: Duncit marketing budget',
      );
    }
    const alert = screen.getByTestId('release-funding-shortfall');
    expect(alert).toHaveTextContent('These payouts are ₹15.89 more than the pod collected');
    expect(alert).not.toHaveTextContent(NEEDS_NOTE);
    expect(screen.queryByTestId('release-approve-all')).not.toBeInTheDocument();
  });

  it('shows no funding note on a payout approved without one', async () => {
    await mountReleaseDetail(makeReleaseDetail());
    expect(within(payout('CLUB_ADMIN')).getByText('Approved amount: ₹40.00')).toBeInTheDocument();
    expect(screen.queryByText(/^Shortfall funding:/)).not.toBeInTheDocument();
  });
});

describe('PaymentReleaseDetailPage — a venue bill recorded as evidence only', () => {
  it('labels the bill as not paid, beside the booked price the venue is paid', async () => {
    await mountReleaseDetail(shortfallDetail());
    expect(billLine('slot-price')).toBe('Agreed booking amount₹40.00');
    expect(billLine('final-bill')).toBe('Final bill uploaded (recorded as evidence only, not paid)₹9999.00');
    expect(billLine('venue-total')).toBe('Venue total₹40.00');
  });

  it.each([
    ['set the venue’s money', true],
    ['was written before this was recorded', null],
  ])('keeps the plain label on a bill that %s', async (_case, applied) => {
    const breakdown = makeDetailBreakdown({ venue_bill_applied: applied });
    await mountReleaseDetail(makeReleaseDetail([makeDetailRelease({ breakdown })]));
    expect(billLine('final-bill')).toBe('Final bill uploaded₹450.00');
  });
});
