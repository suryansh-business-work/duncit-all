import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { useReturnActions, type ReturnAction } from './useReturnActions';
import { returnRow } from './__tests__/fixtures';
import { renderWithProviders } from '../../../__tests__/render';
import { recordNotices } from '../../../__tests__/groupC-notices';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../../../__tests__/groupC-link';

let notices: ReturnType<typeof recordNotices>;
beforeEach(() => {
  notices = recordNotices();
});
afterEach(() => {
  notices.stop();
  cleanup();
});
const messages = () => notices.notices.map((n) => n.message);

const onUpdated = vi.fn();
let outcome: boolean | null = null;

/** Runs one action on return r1 and shows what the hook reported. */
function Runner({ action, note }: Readonly<{ action: ReturnAction; note?: string | null }>) {
  const { run, busy } = useReturnActions(onUpdated);
  return (
    <>
      <output data-testid="busy">{busy ?? 'idle'}</output>
      <button
        type="button"
        onClick={() => {
          run(action, 'r1', note).then(
            (done) => {
              outcome = done;
            },
            () => undefined,
          );
        }}
      >
        run
      </button>
    </>
  );
}

const mount = (action: ReturnAction, answers: Record<string, ScriptedAnswer>, sent: SentOperation[] = [], note?: string | null) => {
  onUpdated.mockClear();
  outcome = null;
  renderWithProviders(<Runner action={action} note={note} />, { link: scriptedLink(answers, sent) });
  fireEvent.click(screen.getByRole('button', { name: 'run' }));
};

const failedRefund = returnRow({
  refund: { __typename: 'OrderRefund', status: 'FAILED', amount: 600, coins: 0, error: 'Insufficient balance' },
});

describe('useReturnActions', () => {
  it('approves with the note it was given and hands back the updated return', async () => {
    const sent: SentOperation[] = [];
    mount('approve', { PartnerApprovePodShopReturn: { approvePodShopReturn: returnRow({ status: 'APPROVED' }) } }, sent, 'Ship it back');
    await waitFor(() => expect(messages()).toContain('Return approved.'));
    expect(sent.find((op) => op.name === 'PartnerApprovePodShopReturn')?.variables).toEqual({ id: 'r1', note: 'Ship it back' });
    expect(onUpdated).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1' }));
    await waitFor(() => expect(screen.getByTestId('busy').textContent).toBe('idle'));
    expect(outcome).toBe(true);
  });

  it('sends only the id for an action that takes no note', async () => {
    const sent: SentOperation[] = [];
    mount('received', { PartnerMarkPodShopReturnReceived: { markPodShopReturnReceived: returnRow({ status: 'RECEIVED' }) } }, sent);
    await waitFor(() => expect(sent.some((op) => op.name === 'PartnerMarkPodShopReturnReceived')).toBe(true));
    expect(sent.find((op) => op.name === 'PartnerMarkPodShopReturnReceived')?.variables).toEqual({ id: 'r1' });
  });

  it('says the refund went out', async () => {
    mount('refund', {
      PartnerRefundPodShopReturn: {
        refundPodShopReturn: returnRow({ refund: { __typename: 'OrderRefund', status: 'PROCESSED', amount: 600, coins: 0, error: '' } }),
      },
    });
    await waitFor(() => expect(messages()).toContain('Refund sent to the buyer.'));
  });

  it('reports the reason from the payment provider when a refund fails without the call failing', async () => {
    mount('refund', { PartnerRefundPodShopReturn: { refundPodShopReturn: failedRefund } });
    await waitFor(() => expect(messages()).toContain('Razorpay could not refund the buyer: Insufficient balance'));
    expect(messages()).not.toContain('Refund sent to the buyer.');
    expect(onUpdated).toHaveBeenCalledTimes(1);
  });

  it('reports the same failure for a retried refund', async () => {
    mount('retryRefund', { PartnerRetryPodShopReturnRefund: { retryPodShopReturnRefund: failedRefund } });
    await waitFor(() => expect(messages()).toContain('Razorpay could not refund the buyer: Insufficient balance'));
  });

  it('does not treat a failed refund state on another action as a refund failure', async () => {
    mount('approve', { PartnerApprovePodShopReturn: { approvePodShopReturn: failedRefund } });
    await waitFor(() => expect(messages()).toContain('Return approved.'));
  });

  it('succeeds without handing anything back when the answer carries no return', async () => {
    mount('retryPickup', { PartnerRetryPodShopReturnPickup: { retryPodShopReturnPickup: null } });
    await waitFor(() => expect(messages()).toContain('Pickup booking retried.'));
    expect(onUpdated).not.toHaveBeenCalled();
    expect(outcome).toBe(true);
  });

  it('reports a refusal, hands back nothing and is idle again', async () => {
    mount('reject', { PartnerRejectPodShopReturn: new Error('Return already closed') }, [], 'No');
    await waitFor(() => expect(messages()).toContain('Return already closed'));
    expect(onUpdated).not.toHaveBeenCalled();
    await waitFor(() => expect(outcome).toBe(false));
    expect(screen.getByTestId('busy').textContent).toBe('idle');
  });
});
