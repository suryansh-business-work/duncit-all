import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import OrderFulfilmentPanel from '../../src/pages/orders/OrderFulfilmentPanel';
import { renderWithProviders } from '../testkit';

const shipOrder = (over: Record<string, unknown> = {}) => ({
  id: 'o1',
  fulfilment_method: 'SHIP',
  fulfilment_status: 'PENDING',
  shiprocket: { shipment_id: 'S1', awb: 'AWB1', courier_name: 'BlueDart', tracking_status: 'In transit' },
  last_error: null,
  ...over,
});

const handlers = () => ({
  onSetMethod: vi.fn(),
  onAdvance: vi.fn(),
  onCreateShipment: vi.fn(),
  onRefreshTracking: vi.fn(),
});

describe('OrderFulfilmentPanel', () => {
  it('renders the ship flow with an existing shipment', () => {
    const h = handlers();
    renderWithProviders(<OrderFulfilmentPanel order={shipOrder()} busy={false} {...h} />);
    expect(screen.getByText('Fulfilment')).toBeInTheDocument();
    // A courier is assigned, so there is nothing left to book.
    expect(screen.queryByRole('button', { name: /Create shipment|Retry booking/i })).not.toBeInTheDocument();
    expect(screen.getByText('AWB AWB1')).toBeInTheDocument();
    expect(screen.getByText('BlueDart')).toBeInTheDocument();
    expect(screen.getByText('In transit')).toBeInTheDocument();
    // With an AWB the label can be printed.
    const label = screen.getByRole('group', { name: 'Label' });
    expect(within(label).getByRole('button', { name: 'Print' })).toBeEnabled();
    // Sync tracking is enabled because the shipment is booked.
    expect(screen.getByRole('button', { name: /Sync tracking/i })).toBeEnabled();
  });

  it('retries a stopped booking and refreshes tracking', () => {
    const h = handlers();
    renderWithProviders(
      <OrderFulfilmentPanel order={shipOrder({ shiprocket: { shipment_id: 'S1' } })} busy={false} {...h} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Retry booking/i }));
    fireEvent.click(screen.getByRole('button', { name: /Sync tracking/i }));
    expect(h.onCreateShipment).toHaveBeenCalledTimes(1);
    expect(h.onRefreshTracking).toHaveBeenCalledTimes(1);
  });

  it('shows the no-shipment state and disables sync until booked', () => {
    const h = handlers();
    renderWithProviders(
      <OrderFulfilmentPanel order={shipOrder({ shiprocket: {} })} busy={false} {...h} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Create shipment/i }));
    expect(h.onCreateShipment).toHaveBeenCalledTimes(1);
    expect(screen.getByText('No shipment created yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sync tracking/i })).toBeDisabled();
    expect(screen.queryByText('Documents')).not.toBeInTheDocument();
  });

  it('hides the ship section, booking error included, for pickup orders', () => {
    const h = handlers();
    renderWithProviders(
      <OrderFulfilmentPanel
        order={shipOrder({ fulfilment_method: 'PICKUP', shiprocket: null, last_error: 'boom' })}
        busy={false}
        {...h}
      />,
    );
    expect(screen.queryByRole('button', { name: /Create shipment/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sync tracking/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/boom/)).not.toBeInTheDocument();
  });

  it('shows the last booking error on a ship order', () => {
    const h = handlers();
    renderWithProviders(
      <OrderFulfilmentPanel order={shipOrder({ shiprocket: {}, last_error: 'boom' })} busy={false} {...h} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('boom');
  });

  it('dates the booking error once a sync attempt is recorded', () => {
    const h = handlers();
    renderWithProviders(
      <OrderFulfilmentPanel
        order={shipOrder({
          shiprocket: { shipment_id: 'S1', last_synced_at: '2026-09-01T10:00:00.000Z' },
          last_error: 'boom',
        })}
        busy={false}
        {...h}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/^Last booking attempt \(.+\): boom$/);
  });

  it('shows courier/tracking fallbacks when booked without a courier yet', () => {
    const h = handlers();
    renderWithProviders(
      <OrderFulfilmentPanel order={shipOrder({ shiprocket: { shipment_id: 'S2' } })} busy={false} {...h} />,
    );
    expect(screen.getByText('Courier pending')).toBeInTheDocument();
    expect(screen.getByText('Awaiting first scan')).toBeInTheDocument();
    // Label needs an AWB; the invoice only needs the booking.
    const label = screen.getByRole('group', { name: 'Label' });
    expect(within(label).getByRole('button', { name: 'Print' })).toBeDisabled();
    const invoice = screen.getByRole('group', { name: 'Invoice' });
    expect(within(invoice).getByRole('button', { name: 'Print' })).toBeEnabled();
  });

  it('switches the fulfilment method and ignores re-selecting the current one', () => {
    const h = handlers();
    renderWithProviders(<OrderFulfilmentPanel order={shipOrder()} busy={false} {...h} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pickup' }));
    expect(h.onSetMethod).toHaveBeenCalledWith('PICKUP');
    // Clicking the already-selected method yields a null value and is ignored.
    fireEvent.click(screen.getByRole('button', { name: 'Ship' }));
    expect(h.onSetMethod).toHaveBeenCalledTimes(1);
  });

  it('advances the status once a different target is chosen', async () => {
    const h = handlers();
    renderWithProviders(<OrderFulfilmentPanel order={shipOrder()} busy={false} {...h} />);
    // Update is disabled while target === current status.
    expect(screen.getByRole('button', { name: 'Update status' })).toBeDisabled();
    fireEvent.mouseDown(screen.getByLabelText('Set status to'));
    const listbox = await screen.findByRole('listbox');
    // humaniseStatus goes through the shared statusLabel now, so the option
    // reads as translated copy rather than the raw enum.
    fireEvent.click(within(listbox).getByText('Shipped'));
    const note = screen.getByLabelText(/Note/i);
    fireEvent.change(note, { target: { value: 'go' } });
    const update = screen.getByRole('button', { name: 'Update status' });
    expect(update).toBeEnabled();
    fireEvent.click(update);
    expect(h.onAdvance).toHaveBeenCalledWith('SHIPPED', 'go');
  });
});
