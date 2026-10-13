import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { recordNotices } from '../../__tests__/groupC-notices';
import type { SentOperation } from '../../__tests__/groupC-link';
import { PREVIEW, REQUEST, mount, openDialog, preview, request } from './__tests__/deleteHarness';

let notices: ReturnType<typeof recordNotices>;
beforeEach(() => {
  notices = recordNotices();
});
afterEach(() => {
  notices.stop();
  cleanup();
});
const messages = () => notices.notices.map((n) => n.message);


describe('BrandDeleteButton for an approved brand', () => {
  it('shows what is still running and sends a wait-for-orders request on the earliest day', async () => {
    const sent: SentOperation[] = [];
    const { onRequested } = mount({
      sent,
      answers: { [REQUEST]: { requestCatalogDeletion: request() } },
    });
    const dialog = await openDialog();

    expect(await dialog.findByText('Delete Chai Point')).toBeTruthy();
    expect((await dialog.findByTestId('deletion-impact')).textContent).toContain('3 running order(s) and 1 open return(s)');
    expect(dialog.getByText('ORD-77')).toBeTruthy();
    expect(dialog.getByText('Showing the oldest 1 of 3 running orders.')).toBeTruthy();
    expect(dialog.getByText('Masala Chai')).toBeTruthy();
    expect(dialog.getByText('Ginger Chai')).toBeTruthy();
    expect(dialog.getByText('Paused')).toBeTruthy();
    expect(dialog.getByText(/Deleting a brand deletes all of its products too/)).toBeTruthy();

    fireEvent.click(dialog.getByTestId('deletion-request-submit'));

    await waitFor(() => expect(messages()).toContain('Deletion request sent for Chai Point. It is off the shop while the Products team reviews it.'));
    expect(sent.find((op) => op.name === REQUEST)?.variables).toEqual({
      input: { kind: 'BRAND', target_id: 'b1', mode: 'WAIT_FOR_ORDERS', scheduled_for: '2026-08-01', reason: null },
    });
    expect(onRequested).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('sends the chosen cancel-and-refund mode with the trimmed reason', async () => {
    const sent: SentOperation[] = [];
    mount({ sent, answers: { [REQUEST]: { requestCatalogDeletion: request() } } });
    const dialog = await openDialog();
    const cancelMode = await dialog.findByTestId('deletion-mode-cancel');
    fireEvent.click(cancelMode.querySelector('input') as HTMLInputElement);
    fireEvent.change(dialog.getByTestId('deletion-request-reason').querySelector('textarea') as HTMLTextAreaElement, {
      target: { value: '  Closing the brand  ' },
    });
    fireEvent.click(dialog.getByTestId('deletion-request-submit'));

    await waitFor(() => expect(sent.some((op) => op.name === REQUEST)).toBe(true));
    expect(sent.find((op) => op.name === REQUEST)?.variables).toMatchObject({
      input: { mode: 'CANCEL_AND_REFUND', reason: 'Closing the brand' },
    });
  });

  it('says nothing is running when no order or return includes the brand', async () => {
    mount({ answers: { [PREVIEW]: preview({ open_orders: 0, open_returns: 0, orders: [], products: [] }) } });
    const dialog = await openDialog();
    expect((await dialog.findByTestId('deletion-impact')).textContent).toContain('Nothing is running right now');
    expect(dialog.queryByText('Running orders')).toBeNull();
  });

  it('keeps the dialog open and shows the refusal when the request is rejected', async () => {
    const { onRequested } = mount({ answers: { [REQUEST]: new Error('A request is already open') } });
    const dialog = await openDialog();
    fireEvent.click(await dialog.findByTestId('deletion-request-submit'));

    expect(await dialog.findByText('A request is already open')).toBeTruthy();
    expect(messages()).toContain('A request is already open');
    expect(onRequested).not.toHaveBeenCalled();
  });

  it('offers a retry when the impact preview cannot be loaded, and closes on Cancel', async () => {
    const sent: SentOperation[] = [];
    mount({ sent, answers: { [PREVIEW]: new Error('Preview is down') } });
    const dialog = await openDialog();
    expect(await dialog.findByText('Preview is down')).toBeTruthy();
    fireEvent.click(dialog.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(sent.filter((op) => op.name === PREVIEW).length).toBeGreaterThan(1));
    fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
