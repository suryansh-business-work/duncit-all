import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import PaymentDetailPage from '../../src/pages/finance/payment-detail-page';
import { renderWithProviders } from '../testkit';
import { resetTableControls } from './mocks/table';
import { notifyError, notifySuccess } from './mocks/dialogs';
import {
  REFUND_REFUSED,
  makePaymentDetail,
  makeRefundEntry,
  makeRefundEvent,
  makeRefundSection,
  makeRefundedDetail,
  paymentDetailMock,
  refundPaymentToSourceMock,
} from '../mocks/payment-detail.mock';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NOTE = 'Customer waited three days';

const mount = (mocks: readonly MockedResponse[]) =>
  renderWithProviders(<PaymentDetailPage />, { path: '/payment-logs/:id', entry: '/payment-logs/pd1', mocks });

const waitForPage = () => screen.findByRole('heading', { name: 'DUN-PAY-4821' });

/** A pod payment whose Finance refund is owed: one yellow accordion with a Refund button. */
const owedDetail = (over: Parameters<typeof makeRefundSection>[0] = {}, entry: Parameters<typeof makeRefundEntry>[0] = {}) =>
  makePaymentDetail({
    refunds: [makeRefundSection({ entries: [makeRefundEntry({ ref: 'RF-9001', ...entry })], ...over })],
  });

const openDialog = async (name = 'Refund RF-9001 to its original source') => {
  fireEvent.click(await screen.findByRole('button', { name }));
  return screen.findByRole('dialog', { name: 'Refund to original source' });
};

/** A mutation-variables matcher that notes what the page sent and accepts it. */
const record =
  <T,>(into: T[], pick: (input: Record<string, unknown>) => T) =>
  (input: Record<string, unknown>) => {
    into.push(pick(input));
    return true;
  };

const typeNote = (dialog: HTMLElement, value: string) =>
  fireEvent.change(within(dialog).getByRole('textbox', { name: /Note/ }), { target: { value } });

beforeEach(() => {
  resetTableControls();
  notifySuccess.mockClear();
  notifyError.mockClear();
});

describe('PaymentDetailPage — the Refund area', () => {
  it('has no Refund area on a payment that was never refunded', async () => {
    mount([paymentDetailMock()]);
    await waitForPage();
    expect(screen.queryByTestId('payment-refund-section')).not.toBeInTheDocument();
  });

  it('sits after the money cards and before the checkout pipeline', async () => {
    mount([paymentDetailMock(owedDetail())]);
    await waitForPage();

    const area = await screen.findByTestId('payment-refund-section');
    const pipeline = screen.getByRole('heading', { name: 'The payment itself' });
    const waterfall = screen.getByText('Coupon discount (YOGA10)');
    expect(waterfall.compareDocumentPosition(area) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(area.compareDocumentPosition(pipeline) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('Refund to source — the dialog', () => {
  it('says the money goes back to the same source, and shows what is being refunded', async () => {
    mount([paymentDetailMock(owedDetail())]);
    await waitForPage();

    const dialog = await openDialog();
    expect(within(dialog).getByText(/₹1000\.00 for Pod Payment Refund Information \(RF-9001\)/)).toBeInTheDocument();
    expect(within(dialog).getByText(/back to the same source the buyer paid with/)).toBeInTheDocument();
    expect(within(dialog).getByText(/cannot be taken back once Razorpay accepts it/)).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: /Note/ })).toBeRequired();
    expect(within(dialog).getByText(/saved on the payment’s trail/)).toBeInTheDocument();
  });

  it('names a row without a reference by its type', async () => {
    mount([paymentDetailMock(owedDetail({}, { ref: null }))]);
    await waitForPage();

    const dialog = await openDialog('Refund Finance refund to its original source');
    expect(within(dialog).getByText(/\(Finance refund\)/)).toBeInTheDocument();
  });

  it('will not send without a note, and says so', async () => {
    const sent: Record<string, unknown>[] = [];
    mount([
      paymentDetailMock(owedDetail()),
      refundPaymentToSourceMock({ variables: record(sent, (input) => input) }),
    ]);
    await waitForPage();

    const dialog = await openDialog();
    fireEvent.click(within(dialog).getByTestId('refund-to-source-confirm'));
    expect(await within(dialog).findByText('Add a note of at least 3 characters.')).toBeInTheDocument();

    // Two spaces and a letter is still not a reason.
    typeNote(dialog, '  a ');
    fireEvent.click(within(dialog).getByTestId('refund-to-source-confirm'));
    await waitFor(() => expect(within(dialog).getByText('Add a note of at least 3 characters.')).toBeInTheDocument());

    expect(sent).toEqual([]);
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('closes on Cancel and starts the next opening with an empty note', async () => {
    mount([paymentDetailMock(owedDetail())]);
    await waitForPage();

    const first = await openDialog();
    typeNote(first, 'half written');
    fireEvent.click(within(first).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    const second = await openDialog();
    expect(within(second).getByRole('textbox', { name: /Note/ })).toHaveValue('');
  });

  it('closes on Escape while idle', async () => {
    mount([paymentDetailMock(owedDetail())]);
    await waitForPage();

    const dialog = await openDialog();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('Refund to source — sending', () => {
  it.each([
    ['POD_PAYMENT', 'gr1', 'Pod Payment Refund Information'],
    ['RENTAL', 'rr7', 'Rented Items Refund Information'],
  ] as const)('sends the %s row with the trimmed note, then redraws the page from the reply', async (kind, entryId, title) => {
    const sent: Record<string, unknown>[] = [];
    const reply = makeRefundedDetail();
    reply.refunds[0].kind = kind;
    mount([
      paymentDetailMock(owedDetail({ kind }, { id: entryId })),
      refundPaymentToSourceMock({ detail: reply, variables: record(sent, (input) => input) }),
    ]);
    await waitForPage();

    const dialog = await openDialog();
    expect(within(dialog).getByText(new RegExp(title))).toBeInTheDocument();
    typeNote(dialog, `  ${NOTE}  `);
    fireEvent.click(within(dialog).getByTestId('refund-to-source-confirm'));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Refund sent to the original source.'));
    expect(sent).toEqual([
      {
        payment_doc_id: 'pd1',
        kind,
        entry_id: entryId,
        note: NOTE,
        client_request_id: expect.stringMatching(UUID),
      },
    ]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // The reply IS the new audit: the section is complete, has no button and carries the note.
    const accordion = screen.getByTestId(`payment-refund-${kind.toLowerCase().replaceAll('_', '-')}`);
    await waitFor(() => expect(accordion).toHaveAttribute('data-state', 'COMPLETED'));
    expect(within(screen.getByRole('button', { name: new RegExp(title) })).getByText('Refunded')).toBeInTheDocument();
    expect(screen.queryByTestId('payment-refund-to-source')).not.toBeInTheDocument();
    expect(screen.getByText('note: Customer waited three days')).toBeInTheDocument();
    expect(screen.getByText('Completed: 1')).toBeInTheDocument();
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('asks for a fresh key every time the dialog is opened', async () => {
    const keys: string[] = [];
    const remember = record(keys, (input) => String(input.client_request_id));
    mount([
      paymentDetailMock(owedDetail()),
      refundPaymentToSourceMock({ fail: true, variables: remember }),
      paymentDetailMock(owedDetail()),
      refundPaymentToSourceMock({ fail: true, variables: remember }),
      paymentDetailMock(owedDetail()),
    ]);
    await waitForPage();

    for (const attempt of [1, 2]) {
      const dialog = await openDialog();
      typeNote(dialog, NOTE);
      fireEvent.click(within(dialog).getByTestId('refund-to-source-confirm'));
      await waitFor(() => expect(keys).toHaveLength(attempt));
      await within(dialog).findByText(REFUND_REFUSED);
      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    }
    expect(keys[0]).toMatch(UUID);
    expect(keys[1]).toMatch(UUID);
    expect(keys[0]).not.toBe(keys[1]);
  });

  it('shows the refusal in the dialog, keeps it open and re-reads the audit', async () => {
    const afterRefusal = owedDetail(
      { state: 'FAILED' },
      { status: 'RECONCILIATION_REQUIRED', state: 'FAILED', error: 'Razorpay says it is already refunded', attempts: 3 },
    );
    mount([
      paymentDetailMock(owedDetail()),
      refundPaymentToSourceMock({ fail: true }),
      paymentDetailMock(afterRefusal),
    ]);
    await waitForPage();

    const dialog = await openDialog();
    typeNote(dialog, NOTE);
    fireEvent.click(within(dialog).getByTestId('refund-to-source-confirm'));

    expect(await within(dialog).findByText(REFUND_REFUSED)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(within(dialog).getByTestId('refund-to-source-confirm')).toBeEnabled();
    expect(notifySuccess).not.toHaveBeenCalled();

    // The refused attempt still wrote — the page shows what the server now says.
    expect(await screen.findByText('Razorpay says it is already refunded')).toBeInTheDocument();
    expect(screen.getByTestId('payment-refund-pod-payment')).toHaveAttribute('data-state', 'FAILED');
  });

  it('locks the dialog while the refund is on its way', async () => {
    mount([paymentDetailMock(owedDetail()), refundPaymentToSourceMock({ delay: 60_000 })]);
    await waitForPage();

    const dialog = await openDialog();
    typeNote(dialog, NOTE);
    fireEvent.click(within(dialog).getByTestId('refund-to-source-confirm'));

    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled());
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('Refund to source — what the reply replaces', () => {
  it('shows the reply’s activity under the kind it belongs to', async () => {
    const reply = makeRefundedDetail();
    reply.refunds[0].events = [makeRefundEvent({ id: 'ev9', type: 'REFUND_PROCESSED', actor_name: null, details: [] })];
    mount([paymentDetailMock(owedDetail()), refundPaymentToSourceMock({ detail: reply })]);
    await waitForPage();

    const dialog = await openDialog();
    typeNote(dialog, NOTE);
    fireEvent.click(within(dialog).getByTestId('refund-to-source-confirm'));

    const events = await screen.findByTestId('payment-refund-events');
    expect(within(events).getByText('REFUND_PROCESSED')).toBeInTheDocument();
  });
});
