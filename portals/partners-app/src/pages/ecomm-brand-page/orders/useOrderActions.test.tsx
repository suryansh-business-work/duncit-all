import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { useOrderActions, type OrderAction } from './useOrderActions';
import { orderRow } from './__tests__/fixtures';
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

/** Runs one action on order o1 and shows what the hook reported. */
function Runner({ action }: Readonly<{ action: OrderAction }>) {
  const { run, busy } = useOrderActions(onUpdated);
  return (
    <>
      <output data-testid="busy">{busy ?? 'idle'}</output>
      <button
        type="button"
        onClick={() => {
          run(action, 'o1', action === 'cancel' ? { reason: 'Out of stock' } : undefined).then((done) => {
            outcome = done;
          }, () => undefined);
        }}
      >
        run
      </button>
    </>
  );
}

const mount = (action: OrderAction, answers: Record<string, ScriptedAnswer>, sent: SentOperation[] = []) => {
  onUpdated.mockClear();
  outcome = null;
  renderWithProviders(<Runner action={action} />, { link: scriptedLink(answers, sent) });
  fireEvent.click(screen.getByRole('button', { name: 'run' }));
};

describe('useOrderActions', () => {
  it('books a shipment, says so, hands back the updated order and is idle again', async () => {
    const sent: SentOperation[] = [];
    const updated = orderRow({ last_error: '' });
    mount('book', { PartnerBookProductOrderShipment: { brandBookProductOrderShipment: updated } }, sent);
    await waitFor(() => expect(messages()).toContain('Shipment booked with ShipRocket.'));
    expect(onUpdated).toHaveBeenCalledWith(expect.objectContaining({ id: 'o1' }));
    expect(sent.find((op) => op.name === 'PartnerBookProductOrderShipment')?.variables).toEqual({ id: 'o1' });
    await waitFor(() => expect(screen.getByTestId('busy').textContent).toBe('idle'));
    expect(outcome).toBe(true);
  });

  it('reports ShipRocket’s reason when a booking stops part-way without the call failing', async () => {
    mount('book', {
      PartnerBookProductOrderShipment: { brandBookProductOrderShipment: orderRow({ last_error: 'Pincode not serviceable' }) },
    });
    await waitFor(() => expect(messages()).toContain('ShipRocket could not book the shipment: Pincode not serviceable'));
    expect(messages()).not.toContain('Shipment booked with ShipRocket.');
    expect(onUpdated).toHaveBeenCalledTimes(1);
  });

  it('refreshes tracking', async () => {
    mount('refresh', { PartnerRefreshProductOrderTracking: { brandRefreshProductOrderTracking: orderRow() } });
    await waitFor(() => expect(messages()).toContain('Tracking updated.'));
  });

  it('cancels with the reason it was given', async () => {
    const sent: SentOperation[] = [];
    mount('cancel', { PartnerCancelProductOrder: { brandCancelProductOrder: orderRow() } }, sent);
    await waitFor(() => expect(messages()).toContain('Order cancelled. The buyer’s refund has started.'));
    expect(sent.find((op) => op.name === 'PartnerCancelProductOrder')?.variables).toEqual({ id: 'o1', reason: 'Out of stock' });
  });

  it('succeeds without handing anything back when the answer carries no order', async () => {
    mount('refresh', { PartnerRefreshProductOrderTracking: { brandRefreshProductOrderTracking: null } });
    await waitFor(() => expect(messages()).toContain('Tracking updated.'));
    expect(onUpdated).not.toHaveBeenCalled();
    expect(outcome).toBe(true);
  });

  it('reports a refusal, hands back nothing and is idle again', async () => {
    mount('cancel', { PartnerCancelProductOrder: new Error('Already shipped') });
    await waitFor(() => expect(messages()).toContain('Already shipped'));
    expect(onUpdated).not.toHaveBeenCalled();
    await waitFor(() => expect(outcome).toBe(false));
    expect(screen.getByTestId('busy').textContent).toBe('idle');
  });
});
