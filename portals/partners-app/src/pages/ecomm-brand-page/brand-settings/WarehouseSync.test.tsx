import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { renderWithProviders } from '../../../__tests__/render';
import WarehouseSync from './WarehouseSync';
import { SYNC_MY_WAREHOUSES } from './warehouse.queries';

afterEach(cleanup);

const syncMock = (brandId: string, result: MockedResponse['result']): MockedResponse => ({
  request: { query: SYNC_MY_WAREHOUSES, variables: { brand_doc_id: brandId } },
  result,
});

const synced = (over: Record<string, unknown> = {}) => ({
  data: {
    syncMyBrandPickupLocations: {
      __typename: 'BrandPickupSync',
      warehouses: [],
      shiprocket_error: '',
      adopted: 0,
      synced_at: '2026-10-10T13:12:12.017Z',
      ...over,
    },
  },
});

describe('WarehouseSync', () => {
  it('syncs with ShipRocket as soon as it opens — there is no button — then has the list re-read', async () => {
    const onSynced = vi.fn();
    renderWithProviders(<WarehouseSync brandId="b1" onSynced={onSynced} />, { mocks: [syncMock('b1', synced())] });

    expect(screen.getByText('Checking your warehouses with ShipRocket…').closest('[role="status"]')).not.toBeNull();
    expect(screen.queryByRole('button')).toBeNull();

    expect((await screen.findByTestId('warehouse-synced-at')).textContent).toMatch(/^Last synced /);
    expect(onSynced).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('warehouse-sync-error')).toBeNull();
    expect(screen.queryByText('Checking your warehouses with ShipRocket…')).toBeNull();
  });

  it('runs once for a brand however often the page re-renders, and again for another brand', async () => {
    const onSynced = vi.fn();
    const view = renderWithProviders(<WarehouseSync brandId="b1" onSynced={onSynced} />, {
      // One answer per brand: a second request for b1 would have nothing to answer it and would show as an error.
      mocks: [syncMock('b1', synced()), syncMock('b2', synced({ synced_at: '2026-10-11T08:00:00.000Z' }))],
    });
    await screen.findByTestId('warehouse-synced-at');

    // The page hands a NEW callback on every render — that alone must not sync again.
    view.rerenderWith(<WarehouseSync brandId="b1" onSynced={() => onSynced()} />);
    await waitFor(() => expect(onSynced).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('warehouse-sync-error')).toBeNull();

    view.rerenderWith(<WarehouseSync brandId="b2" onSynced={onSynced} />);
    await waitFor(() => expect(onSynced).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId('warehouse-sync-error')).toBeNull();
  });

  it("shows ShipRocket's reason when the account could not be read, and still re-reads the list", async () => {
    const onSynced = vi.fn();
    renderWithProviders(<WarehouseSync brandId="b1" onSynced={onSynced} />, {
      mocks: [syncMock('b1', synced({ shiprocket_error: 'The Duncit courier is not set up.' }))],
    });

    expect((await screen.findByTestId('warehouse-sync-error')).textContent).toBe(
      'ShipRocket could not be read: The Duncit courier is not set up.',
    );
    expect(onSynced).toHaveBeenCalledTimes(1);
  });

  it('shows the error when the sync itself fails, without touching the list', async () => {
    const onSynced = vi.fn();
    renderWithProviders(<WarehouseSync brandId="b1" onSynced={onSynced} />, {
      mocks: [syncMock('b1', { errors: [new GraphQLError('Brand not found')] })],
    });

    expect((await screen.findByTestId('warehouse-sync-error')).textContent).toBe('ShipRocket could not be read: Brand not found');
    expect(onSynced).not.toHaveBeenCalled();
    expect(screen.queryByTestId('warehouse-synced-at')).toBeNull();
  });
});
