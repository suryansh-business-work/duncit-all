import { describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import OrderShipmentDialog from '../../src/pages/orders/OrderShipmentDialog';
import { BRAND_PICKUP_LOCATIONS } from '../../src/pages/ecomm/queries';
import { renderWithProviders } from './testkit';

const locationsMock = (rows: unknown[]): MockedResponse => ({
  request: { query: BRAND_PICKUP_LOCATIONS },
  variableMatcher: () => true,
  result: { data: { brandPickupLocations: rows } },
  maxUsageCount: 10,
});

const duncitOrder = { line_items: [{ ownership: 'DUNCIT' }], pickup_location_id: null };
const brandOrder = {
  line_items: [{ ownership: 'BRAND', brand_id: 'br1' }],
  pickup_location_id: null,
};

const registered = { id: 'loc1', nickname: 'Main', city: 'Pune', is_default: true, shiprocket_registered: true };
const unregistered = { id: 'loc2', nickname: 'Second', city: 'Delhi', is_default: false, shiprocket_registered: false };
const unregisteredDefault = { id: 'loc2', nickname: 'Second', city: 'Delhi', is_default: true, shiprocket_registered: false };

describe('OrderShipmentDialog', () => {
  it('is not queried while closed', () => {
    renderWithProviders(
      <OrderShipmentDialog open={false} order={duncitOrder} onClose={vi.fn()} onConfirm={vi.fn()} />,
    );
    expect(screen.queryByText('Create ShipRocket shipment')).not.toBeInTheDocument();
  });

  it('preselects the default location and confirms it', async () => {
    const onConfirm = vi.fn();
    renderWithProviders(
      <OrderShipmentDialog open order={duncitOrder} onClose={vi.fn()} onConfirm={onConfirm} />,
      { mocks: [locationsMock([registered])] },
    );
    await waitFor(() => expect(screen.getByText(/Main — Pune/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Create shipment/i }));
    expect(onConfirm).toHaveBeenCalledWith('loc1');
  });

  it('warns and blocks confirm when the chosen location is not registered', async () => {
    renderWithProviders(
      <OrderShipmentDialog open order={brandOrder} onClose={vi.fn()} onConfirm={vi.fn()} />,
      { mocks: [locationsMock([unregisteredDefault])] },
    );
    await waitFor(() =>
      expect(screen.getByText(/not registered with ShipRocket yet/i)).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /Create shipment/i })).toBeDisabled();
  });

  it('honours an order that already has a pickup location', async () => {
    const onConfirm = vi.fn();
    renderWithProviders(
      <OrderShipmentDialog
        open
        order={{ line_items: [{ ownership: 'DUNCIT' }], pickup_location_id: 'loc2' }}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
      { mocks: [locationsMock([registered, unregistered])] },
    );
    // loc2 is preselected (from the order) but unregistered → confirm is blocked.
    await waitFor(() =>
      expect(screen.getByText(/not registered with ShipRocket yet/i)).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /Create shipment/i })).toBeDisabled();
  });

  it('shows a helper when there are no locations', async () => {
    renderWithProviders(
      <OrderShipmentDialog open order={duncitOrder} onClose={vi.fn()} onConfirm={vi.fn()} />,
      { mocks: [locationsMock([])] },
    );
    await waitFor(() =>
      expect(screen.getByText(/No pickup locations found for this owner/i)).toBeInTheDocument(),
    );
  });

  it('handles an order with no line items and shows the submitting label', async () => {
    renderWithProviders(
      <OrderShipmentDialog
        open
        submitting
        order={{ pickup_location_id: null }}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
      { mocks: [locationsMock([registered])] },
    );
    await waitFor(() => expect(screen.getByText(/Main — Pune/)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Creating/i })).toBeInTheDocument();
  });

  it('closes on cancel', async () => {
    const onClose = vi.fn();
    renderWithProviders(
      <OrderShipmentDialog open order={duncitOrder} onClose={onClose} onConfirm={vi.fn()} />,
      { mocks: [locationsMock([registered])] },
    );
    await waitFor(() => expect(screen.getByText(/Main — Pune/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});
