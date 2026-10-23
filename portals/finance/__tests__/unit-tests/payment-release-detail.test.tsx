import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, renderHook, screen, waitFor, within } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { Route } from 'react-router';
import { ConfirmProvider } from '../../../../packages/dialogs/src/useConfirm';
import PaymentReleaseDetailPage from '../../src/pages/finance/payment-release-page/detail/PaymentReleaseDetailPage';
import ReleaseMediaGallery from '../../src/pages/finance/payment-release-page/detail/ReleaseMediaGallery';
import { usePodPaymentRelease } from '../../src/pages/finance/payment-release-page/detail/usePodPaymentRelease';
import { POD_FINANCE_BREAKDOWN } from '../../src/pages/finance/pod-finance-page/queries';
import { notifyError, notifySuccess } from './mocks/dialogs';
import { renderWithProviders } from '../testkit';
import { makePodBreakdown } from '../mocks/pod-finance.mock';
import {
  approvePodPaymentReleaseMock,
  approvedDetail,
  makeClubAdminDetailRelease,
  makeDetailBreakdown,
  makeDetailRelease,
  makeHostDetailRelease,
  makeReleaseDetail,
  podPaymentReleaseErrorMock,
  podPaymentReleaseMock,
  publicFinanceSettingsMock,
  reviewPaymentReleaseMock,
  type DetailReleaseMock,
  type ReleaseDetailMock,
} from '../mocks/payment-release.mock';

// The stub's useConfirm always says yes. "Approve all payouts" credits wallets
// and cannot be undone, so the Cancel that resolves false is half of what is
// tested here — swap the real one in and mount its provider around the page.
vi.mock('./mocks/dialogs', async (importOriginal) => {
  const stub = await importOriginal<typeof import('./mocks/dialogs')>();
  const { useConfirm } = await import('../../../../packages/dialogs/src/useConfirm');
  return { ...stub, useConfirm };
});

// The stub QueryGuard has no not-found branch, and a request that is not there
// has to SAY so rather than render an empty page — so the guard is the real one.
vi.mock('./mocks/ui', async (importOriginal) => {
  const stub = await importOriginal<typeof import('./mocks/ui')>();
  const { QueryGuard } = await import('../../../../packages/ui/src/QueryGuard');
  return { ...stub, QueryGuard };
});

const BILL_URL = 'https://cdn.test/bill.pdf';

/**
 * The frozen waterfall the Settlement section reads, with the live coin and
 * discount totals the review dialog's notes read off the same cache entry.
 */
const podBreakdownMock = (present = true): MockedResponse => ({
  request: { query: POD_FINANCE_BREAKDOWN, variables: { podId: 'pod1' } },
  result: {
    data: {
      podFinanceBreakdown: present
        ? { ...makePodBreakdown(), coins_redeemed_total: 50, coins_earned_total: 12, ticket_discount_total: 120 }
        : null,
    },
  },
  maxUsageCount: 20,
});

const mount = (mocks: MockedResponse[], entry = '/payment-release/batch-1') =>
  renderWithProviders(
    <ConfirmProvider>
      <PaymentReleaseDetailPage />
    </ConfirmProvider>,
    {
      path: '/payment-release/:requestId',
      entry,
      mocks: [...mocks, podBreakdownMock(), publicFinanceSettingsMock()],
      extra: <Route path="/payment-release" element={<div data-testid="list-probe">list</div>} />,
    },
  );

/** Mounts one request and waits for it to be on screen. */
const mountDetail = async (detail: ReleaseDetailMock = makeReleaseDetail(), extra: MockedResponse[] = []) => {
  const read = podPaymentReleaseMock(detail);
  mount([read.mock, ...extra]);
  await screen.findByRole('heading', { level: 1, name: detail.summary.pod_title });
  return read;
};

const payout = (kind: DetailReleaseMock['kind']) => screen.getByTestId(`release-payout-${kind}`);
const billLine = (key: string) => screen.getByTestId(`venue-bill-line-${key}`).textContent;
const openReview = async (kind: DetailReleaseMock['kind'] = 'VENUE_BILLING') => {
  fireEvent.click(within(payout(kind)).getByRole('button', { name: 'Review' }));
  return screen.findByRole('dialog');
};

beforeEach(() => {
  notifySuccess.mockClear();
  notifyError.mockClear();
});

describe('PaymentReleaseDetailPage', () => {
  it('waits on the request rather than drawing a page it does not have', () => {
    mount([podPaymentReleaseMock(makeReleaseDetail(), { delay: 60_000 }).mock]);
    expect(screen.getByTestId('loader')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('heads the page with the pod, where the request stands and what it asks for', async () => {
    await mountDetail();
    expect(screen.getByRole('heading', { level: 1, name: 'Yoga' })).toBeInTheDocument();
    expect(screen.getByText(/^Total requested: ₹1040\.50 · /)).toBeInTheDocument();
    // The request's own status, then one per payout.
    expect(screen.getAllByTestId('status-chip').map((chip) => chip.textContent)).toEqual([
      'PENDING',
      'PENDING',
      'PENDING',
      'APPROVED',
    ]);
  });

  it('goes back to the Payment Release list', async () => {
    await mountDetail();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Payment Release' }));
    expect(await screen.findByTestId('list-probe')).toBeInTheDocument();
  });

  it('says the request was not found when the read comes back empty', async () => {
    mount([podPaymentReleaseMock(null).mock]);
    expect(await screen.findByTestId('query-guard-not-found')).toHaveTextContent(
      'Payment release request not found.',
    );
    expect(screen.queryByTestId('release-approve-all')).not.toBeInTheDocument();
  });

  it('states the server’s reason when the request could not be read', async () => {
    mount([podPaymentReleaseErrorMock('Payment release request not found')]);
    expect(await screen.findByTestId('query-guard-error')).toHaveTextContent('Payment release request not found');
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('asks for nothing and says not found when the route carries no request id', async () => {
    const read = podPaymentReleaseMock();
    renderWithProviders(
      <ConfirmProvider>
        <PaymentReleaseDetailPage />
      </ConfirmProvider>,
      { path: '/payment-release-orphan', entry: '/payment-release-orphan', mocks: [read.mock] },
    );
    expect(await screen.findByTestId('query-guard-not-found')).toBeInTheDocument();
    expect(read.state.reads).toBe(0);
  });
});

describe('PaymentReleaseDetailPage venue bill', () => {
  it('shows what the venue’s side came to: attendance, the slot price, the bill and their total', async () => {
    await mountDetail();
    expect(screen.getByRole('heading', { level: 2, name: 'Venue bill' })).toBeInTheDocument();
    expect(billLine('attendees')).toBe('Total attendees8 of 10 seats');
    expect(billLine('slot-price')).toBe('Agreed booking amount₹300.00');
    expect(billLine('final-bill')).toBe('Final bill uploaded₹450.00');
    expect(billLine('venue-total')).toBe('Venue total (agreed amount + bill)₹750.00');
    const bill = screen.getByRole('link', { name: 'View bill' });
    expect(bill).toHaveAttribute('href', BILL_URL);
    expect(bill).toHaveAttribute('target', '_blank');
  });

  it('totals the bill alone when it replaced the slot price', async () => {
    const breakdown = makeDetailBreakdown({ include_slot_price: false, share_amount: 450 });
    await mountDetail(makeReleaseDetail([makeDetailRelease({ breakdown }), makeHostDetailRelease({ breakdown })]));
    expect(billLine('final-bill')).toBe('Final bill uploaded₹450.00');
    expect(billLine('venue-total')).toBe('Venue total₹450.00');
  });

  it('says no bill was entered and links none, when the venue is paid its slot price', async () => {
    const breakdown = makeDetailBreakdown({ venue_bill: 0, include_slot_price: false, share_amount: 300 });
    await mountDetail(makeReleaseDetail([makeDetailRelease({ bill_url: null, breakdown })]));
    expect(billLine('final-bill')).toBe('Final bill uploadedNone');
    expect(billLine('venue-total')).toBe('Venue total₹300.00');
    expect(screen.queryByRole('link', { name: 'View bill' })).not.toBeInTheDocument();
  });

  // No venue payout, no bill: the slot price and a venue total would describe
  // a venue that is not there, so only who came is stated.
  it('keeps only the attendance line on a pod with no venue behind it', async () => {
    const breakdown = makeDetailBreakdown({ venue_bill: 0, venue_slot_price: 0, include_slot_price: false });
    await mountDetail(makeReleaseDetail([makeHostDetailRelease({ breakdown })]));
    expect(billLine('attendees')).toBe('Total attendees8 of 10 seats');
    expect(screen.getAllByTestId(/^venue-bill-line-/)).toHaveLength(1);
  });

  it('still shows a bill recorded on a request that carries no venue payout', async () => {
    const breakdown = makeDetailBreakdown({ venue_slot_price: 0, include_slot_price: false });
    await mountDetail(makeReleaseDetail([makeHostDetailRelease({ breakdown })]));
    expect(billLine('final-bill')).toBe('Final bill uploaded₹450.00');
  });

  // A release from before the settlement snapshot carried these terms has
  // nothing to arrange — the section is left out rather than filled with zeros.
  it.each([
    ['a legacy v1 snapshot', makeDetailBreakdown({ version: 1 })],
    ['no snapshot at all', null],
  ])('has no venue bill section on a request with %s', async (_case, breakdown) => {
    await mountDetail(makeReleaseDetail([makeDetailRelease({ breakdown })]));
    expect(screen.getByRole('heading', { level: 2, name: 'Payouts' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Venue bill' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('venue-bill-summary')).not.toBeInTheDocument();
  });
});

describe('PaymentReleaseDetailPage payouts, settlement, media and notes', () => {
  it('lists every payout with who it goes to, how much, and where it stands', async () => {
    await mountDetail();
    const venue = within(payout('VENUE_BILLING'));
    expect(venue.getByText('Venue Billing')).toBeInTheDocument();
    expect(venue.getByText('Venue Co')).toBeInTheDocument();
    expect(venue.getByText('v@x.com · REL-1')).toBeInTheDocument();
    expect(venue.getByText('₹675.00')).toBeInTheDocument();
    expect(venue.getByTestId('status-chip')).toHaveTextContent('PENDING');
    expect(venue.getByRole('button', { name: 'Review' })).toBeInTheDocument();

    const host = within(payout('HOST_PAYMENT'));
    expect(host.getByText('Host H')).toBeInTheDocument();
    expect(host.getByText('₹325.50')).toBeInTheDocument();
    expect(host.getByRole('button', { name: 'Review' })).toBeInTheDocument();

    // A decided payout says what was approved and is no longer open to review.
    const club = within(payout('CLUB_ADMIN'));
    expect(club.getByTestId('status-chip')).toHaveTextContent('APPROVED');
    expect(club.getByText('Approved amount: ₹40.00')).toBeInTheDocument();
    expect(club.queryByRole('button', { name: 'Review' })).not.toBeInTheDocument();
  });

  it('states no approved amount for a rejected payout, or an approved one that recorded none', async () => {
    await mountDetail(
      makeReleaseDetail([
        makeDetailRelease({ status: 'REJECTED', approval_reason: 'Bill does not match' }),
        makeClubAdminDetailRelease({ approved_amount: null }),
      ]),
    );
    expect(screen.queryByText(/Approved amount/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Review' })).not.toBeInTheDocument();
    expect(within(payout('VENUE_BILLING')).getByTestId('status-chip')).toHaveTextContent('REJECTED');
  });

  it('shows the amounts bare when Finance settings carry no currency symbol', async () => {
    mount([podPaymentReleaseMock(makeReleaseDetail(), { symbol: null }).mock]);
    await screen.findByRole('heading', { level: 1, name: 'Yoga' });
    expect(within(payout('VENUE_BILLING')).getByText('675.00')).toBeInTheDocument();
    expect(billLine('venue-total')).toBe('Venue total (agreed amount + bill)750.00');
  });

  it('draws the settlement the payouts were cut from, host first', async () => {
    await mountDetail();
    expect(await screen.findByRole('heading', { level: 2, name: 'Settlement' })).toBeInTheDocument();
    // makeWaterfall: the host receives ₹368 of the ₹1,000 collected.
    expect(screen.getByRole('button', { name: 'Host Earning' })).toBeInTheDocument();
    expect(screen.getByText('₹368.00')).toBeInTheDocument();
  });

  it('leaves the settlement section out when the pod has no breakdown to show', async () => {
    const read = podPaymentReleaseMock();
    renderWithProviders(
      <ConfirmProvider>
        <PaymentReleaseDetailPage />
      </ConfirmProvider>,
      {
        path: '/payment-release/:requestId',
        entry: '/payment-release/batch-1',
        mocks: [read.mock, podBreakdownMock(false)],
      },
    );
    await screen.findByRole('heading', { level: 1, name: 'Yoga' });
    await waitFor(() => expect(read.state.reads).toBe(1));
    expect(screen.queryByRole('heading', { level: 2, name: 'Settlement' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Pod media' })).toBeInTheDocument();
  });

  // Every payout of one completion carries the same media and the same note.
  it('shows the pod’s media once each, opening full-size in a new tab', async () => {
    await mountDetail();
    const gallery = within(screen.getByTestId('release-media-gallery'));
    expect(gallery.getAllByRole('listitem')).toHaveLength(2);
    const photo = gallery.getByRole('link', { name: 'Open media 1 in a new tab' });
    expect(photo).toHaveAttribute('href', 'https://cdn.test/a.jpg');
    expect(photo).toHaveAttribute('target', '_blank');
    expect(photo).toHaveAttribute('rel', 'noreferrer');
    const clip = gallery.getByLabelText('Open media 2 in a new tab');
    expect(clip.tagName).toBe('VIDEO');
    expect(clip).toHaveAttribute('src', 'https://cdn.test/clip.mp4');
    expect(clip).toHaveAttribute('controls');
  });

  it('says so when no media rode on the request', async () => {
    await mountDetail(makeReleaseDetail([makeDetailRelease({ evidence_media: null })]));
    expect(screen.getByText('No media was uploaded for this pod.')).toBeInTheDocument();
    expect(screen.queryByTestId('release-media-gallery')).not.toBeInTheDocument();
  });

  it('shows the completion note once, and no notes section without one', async () => {
    await mountDetail();
    expect(screen.getByRole('heading', { level: 2, name: 'Notes' })).toBeInTheDocument();
    expect(screen.getAllByText('Paid in cash')).toHaveLength(1);
  });

  it('has no notes section on a request nobody left a note on', async () => {
    await mountDetail(makeReleaseDetail([makeDetailRelease({ notes: '  ' }), makeClubAdminDetailRelease()]));
    expect(screen.queryByRole('heading', { level: 2, name: 'Notes' })).not.toBeInTheDocument();
  });
});

describe('ReleaseMediaGallery', () => {
  it('numbers each item for the screen reader in the order given', () => {
    renderWithProviders(
      <ReleaseMediaGallery
        media={[
          { url: 'https://cdn.test/clip.mp4', type: 'VIDEO' },
          { url: 'https://cdn.test/a.jpg', type: 'IMAGE' },
        ]}
      />,
    );
    expect(screen.getByLabelText('Open media 1 in a new tab').tagName).toBe('VIDEO');
    expect(screen.getByRole('link', { name: 'Open media 2 in a new tab' })).toHaveAttribute(
      'href',
      'https://cdn.test/a.jpg',
    );
  });
});

describe('PaymentReleaseDetailPage approve all payouts', () => {
  /** The request as it is now, then as it reads back after the decision. */
  const twoReads = (after: ReleaseDetailMock) => {
    const before = podPaymentReleaseMock(makeReleaseDetail(), { uses: 1 });
    const reread = podPaymentReleaseMock(after);
    return { before, reread };
  };

  const pressApproveAll = async () => {
    fireEvent.click(screen.getByTestId('release-approve-all'));
    return screen.findByTestId('confirm-dialog-confirm');
  };

  it('approves every pending payout once confirmed, toasts and re-reads the request', async () => {
    const { before, reread } = twoReads(approvedDetail());
    const approve = approvePodPaymentReleaseMock();
    mount([before.mock, reread.mock, approve.mock]);
    await screen.findByRole('heading', { level: 1, name: 'Yoga' });

    const confirm = await pressApproveAll();
    // The two payouts still waiting: ₹675 + ₹325.50. The approved ₹40 is not asked again.
    expect(screen.getByText('Approve this pod’s payouts?')).toBeInTheDocument();
    expect(screen.getByText(/Every pending payout on this request — ₹1000\.50 in total — is approved in full/)).toBeInTheDocument();
    expect(confirm).toHaveTextContent('Approve all payouts');
    expect(approve.calls).toEqual([]);

    fireEvent.click(confirm);
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Payouts approved and credited to the wallets.'));
    expect(approve.calls).toEqual([{ id: 'batch-1' }]);
    await waitFor(() => expect(reread.state.reads).toBe(1));
    expect(notifyError).not.toHaveBeenCalled();
    // Nothing is left to approve, together or one at a time.
    await waitFor(() => expect(screen.queryByTestId('release-approve-all')).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Review' })).not.toBeInTheDocument();
    expect(within(payout('VENUE_BILLING')).getByText('Approved amount: ₹675.00')).toBeInTheDocument();
  });

  it('approves nothing when the confirmation is cancelled', async () => {
    const read = podPaymentReleaseMock();
    const approve = approvePodPaymentReleaseMock();
    mount([read.mock, approve.mock]);
    await screen.findByRole('heading', { level: 1, name: 'Yoga' });

    await pressApproveAll();
    fireEvent.click(screen.getByTestId('confirm-dialog-cancel'));
    await waitFor(() => expect(screen.queryByTestId('confirm-dialog-confirm')).not.toBeInTheDocument());

    expect(approve.calls).toEqual([]);
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(read.state.reads).toBe(1);
    expect(screen.getByTestId('release-approve-all')).toBeInTheDocument();
  });

  // Some payouts may have gone through before the failure, so the request is
  // read again either way rather than left showing what it showed before.
  it('shows why an approval failed and still re-reads the request', async () => {
    const { before, reread } = twoReads(makeReleaseDetail());
    const approve = approvePodPaymentReleaseMock({ fail: true });
    mount([before.mock, reread.mock, approve.mock]);
    await screen.findByRole('heading', { level: 1, name: 'Yoga' });

    fireEvent.click(await pressApproveAll());
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('approve failed'));
    await waitFor(() => expect(reread.state.reads).toBe(1));
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(screen.getByTestId('release-approve-all')).toBeInTheDocument();
  });

  it('offers no bulk approval when nothing on the request is pending', async () => {
    await mountDetail(approvedDetail());
    expect(screen.queryByTestId('release-approve-all')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Review' })).not.toBeInTheDocument();
    expect(screen.getAllByText(/^Approved amount: /)).toHaveLength(3);
  });
});

describe('PaymentReleaseDetailPage review of one payout', () => {
  it('approves a single pending payout in full, toasts and re-reads the request', async () => {
    const afterReview = makeReleaseDetail([
      makeDetailRelease({ status: 'APPROVED', approval_type: 'FULL', approved_amount: 675 }),
      makeHostDetailRelease(),
      makeClubAdminDetailRelease(),
    ]);
    const before = podPaymentReleaseMock(makeReleaseDetail(), { uses: 1 });
    const reread = podPaymentReleaseMock(afterReview);
    const review = reviewPaymentReleaseMock();
    mount([before.mock, reread.mock, review.mock]);
    await screen.findByRole('heading', { level: 1, name: 'Yoga' });

    const dialog = await openReview();
    expect(within(dialog).getByText('Review Payment Release')).toBeInTheDocument();
    expect(within(dialog).getByText('Settlement breakdown')).toBeInTheDocument();
    expect(within(dialog).getByText('Venue amount (agreed booking amount and/or final bill)')).toBeInTheDocument();
    expect(within(dialog).getByText('Requested Rs 675.00')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /submit review/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(review.calls).toEqual([
      { id: 'rel-venue', input: { status: 'APPROVED', approval_type: 'FULL', approved_amount: 675 } },
    ]);
    expect(notifySuccess).toHaveBeenCalledWith('Review saved.');
    await waitFor(() => expect(reread.state.reads).toBe(1));
    // The venue's payout is decided; the host's is still open, so the bulk action stays.
    await waitFor(() =>
      expect(within(payout('VENUE_BILLING')).queryByRole('button', { name: 'Review' })).not.toBeInTheDocument(),
    );
    expect(within(payout('HOST_PAYMENT')).getByRole('button', { name: 'Review' })).toBeInTheDocument();
    expect(screen.getByTestId('release-approve-all')).toBeInTheDocument();
  });

  it('validates the reason for a rejection and can cancel', async () => {
    const review = reviewPaymentReleaseMock();
    await mountDetail(makeReleaseDetail(), [review.mock]);
    const dialog = await openReview();

    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: 'Decision' }));
    fireEvent.click(screen.getByRole('option', { name: 'Reject' }));
    fireEvent.click(within(dialog).getByRole('button', { name: /submit review/i }));
    expect(await within(dialog).findByText('Reason is required')).toBeInTheDocument();
    expect(review.calls).toEqual([]);

    fireEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('sends a partial release with its reason, and shows why it could not be saved', async () => {
    const review = reviewPaymentReleaseMock({ fail: true });
    const read = await mountDetail(makeReleaseDetail(), [review.mock]);
    const dialog = await openReview();

    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: 'Release type' }));
    fireEvent.click(screen.getByRole('option', { name: 'Partial Release' }));
    const amount = within(dialog).getByLabelText('Approved amount');
    fireEvent.change(amount, { target: { value: '' } });
    fireEvent.change(amount, { target: { value: '250' } });
    fireEvent.change(within(dialog).getByLabelText('Reason'), { target: { value: 'partial payout' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /submit review/i }));

    expect(await within(dialog).findByText('review failed')).toBeInTheDocument();
    expect(review.calls).toEqual([
      {
        id: 'rel-venue',
        input: { status: 'APPROVED', approval_type: 'PARTIAL', approved_amount: 250, approval_reason: 'partial payout' },
      },
    ]);
    // Nothing was saved: no toast, no re-read, and the dialog stays for another try.
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(read.state.reads).toBe(1);

    // The failure belongs to that attempt — opening another payout starts clean.
    fireEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const next = await openReview('HOST_PAYMENT');
    expect(within(next).queryByText('review failed')).not.toBeInTheDocument();
    expect(within(next).getByText('Host amount (pool remainder)')).toBeInTheDocument();
  });

  it('resets the amount when switching the release type back to Full', async () => {
    await mountDetail();
    const dialog = await openReview();
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: 'Release type' }));
    fireEvent.click(screen.getByRole('option', { name: 'Partial Release' }));
    const amount = within(dialog).getByLabelText('Approved amount');
    expect(amount).not.toBeDisabled();
    fireEvent.change(amount, { target: { value: '100' } });
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: 'Release type' }));
    fireEvent.click(screen.getByRole('option', { name: 'Full Release' }));
    expect(within(dialog).getByLabelText('Approved amount')).toBeDisabled();
    expect(within(dialog).getByLabelText('Approved amount')).toHaveValue(675);
  });

  it('reviews a zero-amount payout', async () => {
    const review = reviewPaymentReleaseMock({ id: 'rel-host', approved_amount: 0 });
    await mountDetail(makeReleaseDetail([makeHostDetailRelease({ amount_requested: 0 })]), [review.mock]);
    const dialog = await openReview('HOST_PAYMENT');
    fireEvent.click(within(dialog).getByRole('button', { name: /submit review/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(review.calls).toEqual([
      { id: 'rel-host', input: { status: 'APPROVED', approval_type: 'FULL', approved_amount: 0 } },
    ]);
  });

  it('shows the busy state while the review is being saved', async () => {
    await mountDetail(makeReleaseDetail(), [reviewPaymentReleaseMock({ delay: 60_000 }).mock]);
    const dialog = await openReview();
    fireEvent.click(within(dialog).getByRole('button', { name: /submit review/i }));
    await waitFor(() => expect(within(dialog).getByRole('button', { name: /saving/i })).toBeDisabled());
    expect(within(dialog).getByRole('button', { name: /cancel/i })).toBeDisabled();
  });
});

describe('usePodPaymentRelease', () => {
  // The dialog only submits while a payout is open, but the write must not
  // depend on that: a submit with nothing open is a no-op, not a blind review.
  it('ignores a review submitted while no payout is open for review', async () => {
    const read = podPaymentReleaseMock();
    const review = reviewPaymentReleaseMock();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[read.mock, review.mock]}>
        <ConfirmProvider>{children}</ConfirmProvider>
      </MockedProvider>
    );
    const { result } = renderHook(() => usePodPaymentRelease('batch-1'), { wrapper });
    await waitFor(() => expect(result.current.detail?.summary.pod_title).toBe('Yoga'));
    expect(result.current.symbol).toBe('₹');

    await act(async () => {
      await result.current.submitReview({
        status: 'APPROVED',
        approval_type: 'FULL',
        approved_amount: 675,
        approval_reason: '',
      });
    });

    expect(review.calls).toEqual([]);
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(result.current.reviewError).toBeNull();
    expect(read.state.reads).toBe(1);
  });
});
