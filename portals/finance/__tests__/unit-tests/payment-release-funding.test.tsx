/**
 * Payment Release — approving payouts that send out more than the pod
 * collected. The server refuses them without a note saying who funds the
 * difference, so "Approve all" asks for that note instead of a plain yes, and
 * the single-payout review asks for it only when approving one that has a
 * shortfall. Either way the note travels with the approval.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { notifyError, notifySuccess } from './mocks/dialogs';
import { fundingNoteField, mountRelease, mountReleaseDetail, openFundingDialog, openReview } from '../payment-release-dom';
import {
  approvePodPaymentReleaseMock,
  approvedDetail,
  makeReleaseDetail,
  podPaymentReleaseMock,
  reviewPaymentReleaseMock,
  type ReleaseDetailMock,
} from '../mocks/payment-release.mock';
import { FUNDING_NOTE, fundedDetail, shortfallDetail } from '../mocks/payment-release-shortfall.mock';

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

const TOO_SHORT = 'Say who funds the shortfall in at least 10 characters.';
const APPROVED_TOAST = 'Payouts approved and credited to the wallets.';
const FUNDING_DIALOG = { name: 'Who funds the shortfall?' };

/** The request as it is now, read once, then as it reads back after the decision. */
const mountTwoReads = async (now: ReleaseDetailMock, after: ReleaseDetailMock, extra: MockedResponse[]) => {
  const reread = podPaymentReleaseMock(after);
  mountRelease([podPaymentReleaseMock(now, { uses: 1 }).mock, reread.mock, ...extra]);
  await screen.findByRole('heading', { level: 1, name: 'Yoga' });
  return reread;
};

beforeEach(() => {
  notifySuccess.mockClear();
  notifyError.mockClear();
});

describe('PaymentReleaseDetailPage — approve all payouts', () => {
  it('keeps the plain confirmation, and sends no note, on a request whose pod paid its way', async () => {
    const approve = approvePodPaymentReleaseMock();
    await mountTwoReads(makeReleaseDetail(), approvedDetail(), [approve.mock]);
    fireEvent.click(screen.getByTestId('release-approve-all'));
    fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith(APPROVED_TOAST));
    expect(screen.queryByRole('dialog', FUNDING_DIALOG)).not.toBeInTheDocument();
    expect(approve.calls).toEqual([{ id: 'batch-1' }]);
  });

  it('asks who funds the shortfall instead of a plain yes, then approves with that note', async () => {
    const approve = approvePodPaymentReleaseMock({ result: fundedDetail() });
    const reread = await mountTwoReads(shortfallDetail(), fundedDetail(), [approve.mock]);

    const dialog = await openFundingDialog();
    // A plain yes would only be refused by the server.
    expect(screen.queryByTestId('confirm-dialog-confirm')).not.toBeInTheDocument();
    expect(dialog).toHaveTextContent('Approving these payouts (₹40.87 in total) sends out ₹15.89 more than the pod collected.');

    // Too short to say who: nothing is sent.
    fireEvent.change(fundingNoteField(dialog), { target: { value: 'Duncit' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Approve all payouts' }));
    expect(await within(dialog).findByText(TOO_SHORT)).toBeInTheDocument();
    expect(approve.calls).toEqual([]);

    fireEvent.change(fundingNoteField(dialog), { target: { value: `  ${FUNDING_NOTE}  ` } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Approve all payouts' }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith(APPROVED_TOAST));
    expect(approve.calls).toEqual([{ id: 'batch-1', shortfall_funding_note: FUNDING_NOTE }]);
    expect(screen.queryByRole('dialog', FUNDING_DIALOG)).not.toBeInTheDocument();
    await waitFor(() => expect(reread.state.reads).toBe(1));
    expect(notifyError).not.toHaveBeenCalled();
    // Recorded on every payout it approved, and nothing is left to approve.
    await waitFor(() => expect(screen.getAllByText('Shortfall funding: Duncit marketing budget')).toHaveLength(3));
    expect(screen.queryByTestId('release-approve-all')).not.toBeInTheDocument();
  });

  it('keeps the dialog open with the server’s reason when the approval fails, and still re-reads the request', async () => {
    const approve = approvePodPaymentReleaseMock({ fail: true });
    const reread = await mountTwoReads(shortfallDetail(), shortfallDetail(), [approve.mock]);

    const dialog = await openFundingDialog();
    fireEvent.change(fundingNoteField(dialog), { target: { value: FUNDING_NOTE } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Approve all payouts' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('approve failed');
    expect(approve.calls).toEqual([{ id: 'batch-1', shortfall_funding_note: FUNDING_NOTE }]);
    // Some payouts may have gone through before the failure.
    await waitFor(() => expect(reread.state.reads).toBe(1));
    expect(notifySuccess).not.toHaveBeenCalled();

    // Cancel sends nothing more, and the next attempt starts clean.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog', FUNDING_DIALOG)).not.toBeInTheDocument());
    const next = await openFundingDialog();
    expect(within(next).queryByRole('alert')).not.toBeInTheDocument();
    expect(fundingNoteField(next)).toHaveValue('');
    expect(approve.calls).toHaveLength(1);
  });
});

describe('PaymentReleaseDetailPage — review of one payout that carries a shortfall', () => {
  const submit = (dialog: HTMLElement) => fireEvent.click(within(dialog).getByRole('button', { name: /submit review/i }));

  it('requires a funding note to approve it, and sends that note with the review', async () => {
    const review = reviewPaymentReleaseMock({ approved_amount: 40 });
    await mountReleaseDetail(shortfallDetail(), [review.mock]);
    const dialog = await openReview('VENUE_BILLING');
    expect(within(dialog).getByTestId('review-funding-shortfall')).toHaveTextContent(
      'This request pays out ₹15.89 more than the pod collected. Approving this payout needs a note saying who funds that amount.',
    );
    submit(dialog);
    expect(await within(dialog).findByText(TOO_SHORT)).toBeInTheDocument();
    expect(review.calls).toEqual([]);

    fireEvent.change(fundingNoteField(dialog), { target: { value: FUNDING_NOTE } });
    submit(dialog);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const input = { status: 'APPROVED', approval_type: 'FULL', approved_amount: 40, shortfall_funding_note: FUNDING_NOTE };
    expect(review.calls).toEqual([{ id: 'rel-venue', input }]);
    expect(notifySuccess).toHaveBeenCalledWith('Review saved.');
  });

  it('asks for no funding note to reject it, and sends none', async () => {
    const review = reviewPaymentReleaseMock();
    await mountReleaseDetail(shortfallDetail(), [review.mock]);
    const dialog = await openReview('VENUE_BILLING');
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: 'Decision' }));
    fireEvent.click(screen.getByRole('option', { name: 'Reject' }));
    expect(within(dialog).queryByTestId('review-funding-shortfall')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('textbox', { name: /Funding note/ })).not.toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText('Reason'), { target: { value: 'Bill does not match' } });
    submit(dialog);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const input = { status: 'REJECTED', approved_amount: 40, approval_reason: 'Bill does not match' };
    expect(review.calls).toEqual([{ id: 'rel-venue', input }]);
  });

  it('asks nothing about funding on a payout the pod covered', async () => {
    await mountReleaseDetail(makeReleaseDetail());
    const dialog = await openReview('VENUE_BILLING');
    expect(within(dialog).queryByTestId('review-funding-shortfall')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('textbox', { name: /Funding note/ })).not.toBeInTheDocument();
  });

  // The host's ₹0 payout reopens with the same amount the closed dialog holds,
  // so only the payout itself changing can clear what was typed for it before.
  it('starts every review with an empty funding note, even reopening the same ₹0 payout', async () => {
    await mountReleaseDetail(shortfallDetail());
    const first = await openReview('HOST_PAYMENT');
    fireEvent.change(fundingNoteField(first), { target: { value: FUNDING_NOTE } });
    expect(fundingNoteField(first)).toHaveValue(FUNDING_NOTE);
    fireEvent.click(within(first).getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    const second = await openReview('HOST_PAYMENT');
    expect(fundingNoteField(second)).toHaveValue('');
  });
});
