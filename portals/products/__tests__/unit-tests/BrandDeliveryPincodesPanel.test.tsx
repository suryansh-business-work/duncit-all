import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import BrandDeliveryPincodesPanel from '../../src/pages/catalog-brands/delivery-pincodes/BrandDeliveryPincodesPanel';
import {
  ADD_BRAND_DELIVERY_PINCODES,
  REMOVE_BRAND_DELIVERY_PINCODES,
  SYNC_BRAND_DELIVERY_PINCODES,
} from '../../src/pages/catalog-brands/delivery-pincodes/queries';
import { renderWithProviders } from '../testkit';
import { __setTableRows } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));
const dialogs = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifySuccess: (...a: unknown[]) => dialogs.success(...a),
  notifyError: (...a: unknown[]) => dialogs.error(...a),
}));

const ROW = {
  id: 'r1',
  pincode: '411001',
  serviceable: true,
  courier_name: 'Delhivery',
  etd: '3 days',
  checked_at: null,
  sync_error: '',
};

const ADD_VARIABLES = { brandId: 'b1', pincodes: ['411001', '560001'] };
const syncResult = { checked: 4, serviceable: 3, unserviceable: 1, failed: 0, total: 4, unchecked: 0 };

const renderPanel = (mocks: MockedResponse[]) =>
  renderWithProviders(<BrandDeliveryPincodesPanel brandId="b1" />, { mocks });

const typeAndAdd = () => {
  fireEvent.change(screen.getByRole('textbox', { name: /Add pincodes/i }), { target: { value: '411001, 560001' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add pincodes' }));
};

const syncMock = (over: Partial<MockedResponse>): MockedResponse => ({
  request: { query: SYNC_BRAND_DELIVERY_PINCODES, variables: { brandId: 'b1' } },
  ...over,
});
const removeMock = (over: Partial<MockedResponse>): MockedResponse => ({
  request: { query: REMOVE_BRAND_DELIVERY_PINCODES, variables: { brandId: 'b1', ids: ['r1'] } },
  ...over,
});

beforeEach(() => {
  dialogs.success.mockReset();
  dialogs.error.mockReset();
  __setTableRows([ROW]);
});

describe('BrandDeliveryPincodesPanel', () => {
  it('adds pincodes, reports the counts and clears the box', async () => {
    renderPanel([
      {
        request: { query: ADD_BRAND_DELIVERY_PINCODES, variables: ADD_VARIABLES },
        result: { data: { addBrandDeliveryPincodes: { __typename: 'AddPincodesResult', added: 2, duplicates: 1, invalid: [] } } },
      },
    ]);
    typeAndAdd();
    await waitFor(() => expect(dialogs.success).toHaveBeenCalledWith('2 pincode(s) added, 1 already listed'));
    expect(screen.getByRole('textbox', { name: /Add pincodes/i })).toHaveValue('');
  });

  it('reports zero counts when the server answers without a result', async () => {
    renderPanel([
      {
        request: { query: ADD_BRAND_DELIVERY_PINCODES, variables: ADD_VARIABLES },
        result: { data: { addBrandDeliveryPincodes: null } },
      },
    ]);
    typeAndAdd();
    await waitFor(() => expect(dialogs.success).toHaveBeenCalledWith('0 pincode(s) added, 0 already listed'));
  });

  it('keeps the typed pincodes and reports the reason when adding fails', async () => {
    renderPanel([
      { request: { query: ADD_BRAND_DELIVERY_PINCODES, variables: ADD_VARIABLES }, error: new Error('Too many pincodes') },
    ]);
    typeAndAdd();
    await waitFor(() => expect(dialogs.error).toHaveBeenCalledWith('Too many pincodes'));
    expect(dialogs.success).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: /Add pincodes/i })).toHaveValue('411001, 560001');
  });

  it('syncs with ShipRocket and summarises the check', async () => {
    renderPanel([
      syncMock({ result: { data: { syncBrandDeliveryPincodes: { __typename: 'SyncResult', ...syncResult } } } }),
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Sync with ShipRocket' }));
    await waitFor(() =>
      expect(dialogs.success).toHaveBeenCalledWith('Checked 4: 3 serviceable, 1 not serviceable, 0 failed. 0 still unchecked.'),
    );
  });

  it('says nothing when a sync returns no result, and shows the busy label while it runs', async () => {
    renderPanel([syncMock({ result: { data: { syncBrandDeliveryPincodes: null } }, delay: 30 })]);
    fireEvent.click(screen.getByRole('button', { name: 'Sync with ShipRocket' }));
    expect(await screen.findByRole('button', { name: /Syncing/ })).toBeDisabled();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sync with ShipRocket' })).toBeEnabled());
    expect(dialogs.success).not.toHaveBeenCalled();
    expect(dialogs.error).not.toHaveBeenCalled();
  });

  it('reports the reason when a sync fails', async () => {
    renderPanel([syncMock({ error: new Error('ShipRocket is down') })]);
    fireEvent.click(screen.getByRole('button', { name: 'Sync with ShipRocket' }));
    await waitFor(() => expect(dialogs.error).toHaveBeenCalledWith('ShipRocket is down'));
  });

  const openRemove = async () => {
    fireEvent.click(await screen.findByRole('button', { name: 'Delete 411001' }));
    return within(await screen.findByRole('dialog'));
  };

  it('asks before removing, then removes the chosen pincode', async () => {
    renderPanel([removeMock({ result: { data: { removeBrandDeliveryPincodes: true } } })]);
    const dialog = await openRemove();
    expect(dialog.getByText('Remove pincode 411001?')).toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(dialogs.success).toHaveBeenCalledWith('Pincode 411001 removed'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('closes the confirmation without removing when cancelled', async () => {
    renderPanel([]);
    const dialog = await openRemove();
    fireEvent.click(dialog.getByRole('button', { name: /Cancel/ }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(dialogs.success).not.toHaveBeenCalled();
    expect(dialogs.error).not.toHaveBeenCalled();
  });

  it('reports the reason and closes the dialog when removing fails', async () => {
    renderPanel([removeMock({ error: new Error('Not allowed') })]);
    const dialog = await openRemove();
    fireEvent.click(dialog.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(dialogs.error).toHaveBeenCalledWith('Not allowed'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
