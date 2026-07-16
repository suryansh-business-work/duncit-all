import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import OrderFulfilmentPanel from '../../src/pages/orders/OrderFulfilmentPanel';
import { renderWithProviders } from '../testkit';

const shipOrder = (over: Record<string, unknown> = {}) => ({
  fulfilment_method: 'SHIP',
  fulfilment_status: 'PENDING',
  shiprocket: { awb: 'AWB1', courier_name: 'BlueDart', tracking_status: 'In transit', label_url: 'http://x/label' },
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
    expect(screen.getByRole('button', { name: /Recreate shipment/i })).toBeInTheDocument();
    expect(screen.getByText('AWB AWB1')).toBeInTheDocument();
    expect(screen.getByText('BlueDart')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Download shipping label/i })).toBeInTheDocument();
    // Sync tracking is enabled because an AWB exists.
    expect(screen.getByRole('button', { name: /Sync tracking/i })).toBeEnabled();
  });

  it('creates a shipment and refreshes tracking', () => {
    const h = handlers();
    renderWithProviders(<OrderFulfilmentPanel order={shipOrder()} busy={false} {...h} />);
    fireEvent.click(screen.getByRole('button', { name: /Recreate shipment/i }));
    fireEvent.click(screen.getByRole('button', { name: /Sync tracking/i }));
    expect(h.onCreateShipment).toHaveBeenCalled();
    expect(h.onRefreshTracking).toHaveBeenCalled();
  });

  it('shows the no-shipment state and disables sync without an AWB', () => {
    const h = handlers();
    renderWithProviders(
      <OrderFulfilmentPanel order={shipOrder({ shiprocket: {} })} busy={false} {...h} />,
    );
    expect(screen.getByRole('button', { name: /Create shipment/i })).toBeInTheDocument();
    expect(screen.getByText('No shipment created yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sync tracking/i })).toBeDisabled();
  });

  it('hides the ship section for pickup orders and shows the last error', () => {
    const h = handlers();
    renderWithProviders(
      <OrderFulfilmentPanel
        order={shipOrder({ fulfilment_method: 'PICKUP', shiprocket: null, last_error: 'boom' })}
        busy={false}
        {...h}
      />,
    );
    expect(screen.queryByRole('button', { name: /Create shipment/i })).not.toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('shows courier/tracking fallbacks when only an AWB is present', () => {
    const h = handlers();
    renderWithProviders(
      <OrderFulfilmentPanel order={shipOrder({ shiprocket: { awb: 'A2' } })} busy={false} {...h} />,
    );
    expect(screen.getByText('Courier pending')).toBeInTheDocument();
    expect(screen.getByText('Awaiting first scan')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Download shipping label/i })).not.toBeInTheDocument();
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
    // humaniseStatus leaves already-upper-case statuses upper-cased.
    fireEvent.click(within(listbox).getByText('SHIPPED'));
    const note = screen.getByLabelText(/Note/i);
    fireEvent.change(note, { target: { value: 'go' } });
    const update = screen.getByRole('button', { name: 'Update status' });
    expect(update).toBeEnabled();
    fireEvent.click(update);
    expect(h.onAdvance).toHaveBeenCalledWith('SHIPPED', 'go');
  });
});
