import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { mountReturns, openReturn, returnRow } from './__tests__/fixtures';
import { recordNotices } from '../../../__tests__/groupC-notices';
import type { SentOperation } from '../../../__tests__/groupC-link';

let notices: ReturnType<typeof recordNotices>;
beforeEach(() => {
  globalThis.localStorage.clear();
  notices = recordNotices();
});
afterEach(() => {
  notices.stop();
  cleanup();
});
const messages = () => notices.notices.map((n) => n.message);
const noteField = () => screen.getByTestId('return-decision-note').querySelector('textarea') as HTMLTextAreaElement;

describe('approving and rejecting a return', () => {
  it('approves with an optional note and moves the drawer to the new status', async () => {
    const sent: SentOperation[] = [];
    mountReturns(
      [returnRow()],
      { PartnerApprovePodShopReturn: { approvePodShopReturn: returnRow({ status: 'APPROVED', decision_note: 'Send it back' }) } },
      sent,
    );
    await openReturn('RET-1');
    fireEvent.click(screen.getByTestId('return-approve'));
    expect(await screen.findByText('Approve return RET-1')).toBeTruthy();
    fireEvent.change(noteField(), { target: { value: '  Send it back  ' } });
    fireEvent.click(screen.getByTestId('return-decision-submit'));

    await waitFor(() => expect(messages()).toContain('Return approved.'));
    expect(sent.find((op) => op.name === 'PartnerApprovePodShopReturn')?.variables).toEqual({ id: 'r1', note: 'Send it back' });
    await waitFor(() => expect(screen.queryByTestId('return-decision-approve')).toBeNull());
    expect(await screen.findByTestId('return-received')).toBeTruthy();
    expect(screen.queryByTestId('return-approve')).toBeNull();
  });

  it('approves with no note as null', async () => {
    const sent: SentOperation[] = [];
    mountReturns([returnRow()], { PartnerApprovePodShopReturn: { approvePodShopReturn: returnRow({ status: 'APPROVED' }) } }, sent);
    await openReturn('RET-1');
    fireEvent.click(screen.getByTestId('return-approve'));
    fireEvent.click(await screen.findByTestId('return-decision-submit'));
    await waitFor(() => expect(sent.some((op) => op.name === 'PartnerApprovePodShopReturn')).toBe(true));
    expect(sent.find((op) => op.name === 'PartnerApprovePodShopReturn')?.variables).toEqual({ id: 'r1', note: null });
  });

  it('will not reject without telling the buyer why', async () => {
    const sent: SentOperation[] = [];
    mountReturns([returnRow()], {}, sent);
    await openReturn('RET-1');
    fireEvent.click(screen.getByTestId('return-reject'));
    fireEvent.click(await screen.findByTestId('return-decision-submit'));
    expect(await screen.findByText('Tell the buyer why the return is rejected.')).toBeTruthy();
    expect(sent.some((op) => op.name === 'PartnerRejectPodShopReturn')).toBe(false);
  });

  it('rejects with the reason', async () => {
    const sent: SentOperation[] = [];
    mountReturns([returnRow()], { PartnerRejectPodShopReturn: { rejectPodShopReturn: returnRow({ status: 'REJECTED' }) } }, sent);
    await openReturn('RET-1');
    fireEvent.click(screen.getByTestId('return-reject'));
    await screen.findByText('Reject return RET-1');
    fireEvent.change(noteField(), { target: { value: 'Worn product' } });
    fireEvent.click(screen.getByTestId('return-decision-submit'));
    await waitFor(() => expect(messages()).toContain('Return rejected.'));
    expect(sent.find((op) => op.name === 'PartnerRejectPodShopReturn')?.variables).toEqual({ id: 'r1', note: 'Worn product' });
  });

  it('keeps the form open and shows the refusal when the server rejects the decision', async () => {
    mountReturns([returnRow()], { PartnerApprovePodShopReturn: new Error('Return already decided') });
    await openReturn('RET-1');
    fireEvent.click(screen.getByTestId('return-approve'));
    fireEvent.click(await screen.findByTestId('return-decision-submit'));
    await waitFor(() => expect(messages()).toContain('Return already decided'));
    expect(screen.getByTestId('return-decision-approve')).toBeTruthy();
    fireEvent.click(within(screen.getByTestId('return-decision-approve')).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByTestId('return-decision-approve')).toBeNull());
  });
});

describe('after approval', () => {
  const approved = returnRow({ status: 'APPROVED', pickup: { ...returnRow().pickup, last_error: 'Courier down' } });

  it('retries a failed pickup booking', async () => {
    mountReturns([approved], { PartnerRetryPodShopReturnPickup: { retryPodShopReturnPickup: returnRow({ status: 'PICKUP_SCHEDULED' }) } });
    await openReturn('RET-1');
    fireEvent.click(screen.getByTestId('return-retry-pickup'));
    await waitFor(() => expect(messages()).toContain('Pickup booking retried.'));
    await waitFor(() => expect(screen.queryByTestId('return-retry-pickup')).toBeNull());
  });

  it('marks the goods received and offers the refund', async () => {
    mountReturns([approved], { PartnerMarkPodShopReturnReceived: { markPodShopReturnReceived: returnRow({ status: 'RECEIVED' }) } });
    await openReturn('RET-1');
    fireEvent.click(screen.getByTestId('return-received'));
    await waitFor(() => expect(messages()).toContain('Return marked as received.'));
    expect(await screen.findByTestId('return-refund')).toBeTruthy();
  });
});

describe('refunding the buyer', () => {
  const received = returnRow({ status: 'RECEIVED' });

  it('asks before refunding, then sends the refund', async () => {
    const sent: SentOperation[] = [];
    mountReturns(
      [received],
      { PartnerRefundPodShopReturn: { refundPodShopReturn: returnRow({ status: 'REFUNDED', refund: { ...returnRow().refund, status: 'PROCESSED', amount: 600 } }) } },
      sent,
    );
    await openReturn('RET-1');
    fireEvent.click(screen.getByTestId('return-refund'));
    expect(await screen.findByText('Refund return RET-1?')).toBeTruthy();
    expect(sent.some((op) => op.name === 'PartnerRefundPodShopReturn')).toBe(false);
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Refund return RET-1?' })).getByRole('button', { name: 'Refund buyer' }));

    await waitFor(() => expect(messages()).toContain('Refund sent to the buyer.'));
    expect(sent.find((op) => op.name === 'PartnerRefundPodShopReturn')?.variables).toEqual({ id: 'r1' });
  });

  it('reports a refund Razorpay refused as an error and offers a retry', async () => {
    mountReturns(
      [received],
      {
        PartnerRefundPodShopReturn: {
          refundPodShopReturn: returnRow({ status: 'RECEIVED', refund: { ...returnRow().refund, status: 'FAILED', error: 'Insufficient balance' } }),
        },
      },
    );
    await openReturn('RET-1');
    fireEvent.click(screen.getByTestId('return-refund'));
    await screen.findByText('Refund return RET-1?');
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Refund return RET-1?' })).getByRole('button', { name: 'Refund buyer' }));

    await waitFor(() => expect(messages()).toContain('Razorpay could not refund the buyer: Insufficient balance'));
    expect(messages()).not.toContain('Refund sent to the buyer.');
    expect(await screen.findByTestId('return-retry-refund')).toBeTruthy();
  });

  it('retries a failed refund', async () => {
    mountReturns(
      [returnRow({ status: 'RECEIVED', refund: { ...returnRow().refund, status: 'FAILED', error: 'Timeout' } })],
      { PartnerRetryPodShopReturnRefund: { retryPodShopReturnRefund: returnRow({ status: 'REFUNDED', refund: { ...returnRow().refund, status: 'PROCESSED' } }) } },
    );
    await openReturn('RET-1');
    fireEvent.click(screen.getByTestId('return-retry-refund'));
    await waitFor(() => expect(messages()).toContain('Refund sent to the buyer.'));
  });
});
