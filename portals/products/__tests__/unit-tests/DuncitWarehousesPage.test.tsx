import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import DuncitWarehousesPage from '../../src/pages/settings/DuncitWarehousesPage';
import { renderWithProviders } from '../testkit';
import { brandPickupLocationsMock, makeBrandPickupLocation } from '../mocks/pickup.mock';

vi.mock('@duncit/dialogs', () => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));

describe('DuncitWarehousesPage', () => {
  it('renders the settings header, ShipRocket note and the Duncit empty state', async () => {
    renderWithProviders(<DuncitWarehousesPage />, { mocks: [brandPickupLocationsMock([])] });
    expect(screen.getByText('Duncit Warehouse Locations')).toBeInTheDocument();
    expect(screen.getByText(/Each Duncit\s+product must select one/i)).toBeInTheDocument();
    expect(screen.getByText('Duncit warehouses')).toBeInTheDocument();
    expect(screen.getByText(/Registering a warehouse with ShipRocket/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText(/No Duncit warehouses yet/i)).toBeInTheDocument(),
    );
  });

  it('lists the Duncit-owned warehouses returned by the query', async () => {
    const location = makeBrandPickupLocation({ owner_kind: 'DUNCIT', brand_id: null, nickname: 'Duncit Central' });
    renderWithProviders(<DuncitWarehousesPage />, { mocks: [brandPickupLocationsMock([location])] });
    await waitFor(() => expect(screen.getByText('Duncit Central')).toBeInTheDocument());
  });
});
