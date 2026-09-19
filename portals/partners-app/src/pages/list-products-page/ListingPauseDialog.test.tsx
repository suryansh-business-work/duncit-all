import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import ListingPauseDialog from './ListingPauseDialog';
import { SET_LISTING_ACTIVE, type ProductListingRow } from './queries';
import { renderWithProviders } from '../../__tests__/render';

afterEach(cleanup);

const listing = (over: Partial<ProductListingRow> = {}): ProductListingRow => ({
  id: 'p1',
  product_name: 'Alpha Tee',
  listing_review_status: 'APPROVED',
  status: 'ACTIVE',
  is_active: true,
  ...over,
});

const activeMock = (active: boolean, capture?: () => void): MockedResponse => ({
  request: { query: SET_LISTING_ACTIVE, variables: { product_doc_id: 'p1', active } },
  result: () => {
    capture?.();
    return { data: { setMyProductListingActive: { __typename: 'InventoryProduct', id: 'p1', is_active: active } } };
  },
});

const renderDialog = (target: ProductListingRow | null, mocks: MockedResponse[] = []) => {
  const onClose = vi.fn();
  const onDone = vi.fn();
  const view = renderWithProviders(<ListingPauseDialog target={target} onClose={onClose} onDone={onDone} />, { mocks });
  return { ...view, onClose, onDone };
};

describe('ListingPauseDialog', () => {
  it('stays closed while no listing is picked', () => {
    renderDialog(null);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('hides a live listing from the shop after confirmation', async () => {
    let sent = false;
    const { onDone, onClose } = renderDialog(listing(), [
      activeMock(false, () => {
        sent = true;
      }),
    ]);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Temporarily deactivate product')).toBeTruthy();
    expect(
      within(dialog).getByText(
        'Alpha Tee will be hidden from the shop until you reactivate it. Orders already placed are not affected.',
      ),
    ).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Deactivate' }));

    await waitFor(() => expect(onDone).toHaveBeenCalledWith('Product visibility updated.'));
    expect(sent).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('puts a paused listing back on sale', async () => {
    const { onDone } = renderDialog(listing({ is_active: false }), [activeMock(true)]);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Reactivate product')).toBeTruthy();
    expect(within(dialog).getByText('Alpha Tee will be visible and purchasable in the shop again.')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reactivate' }));

    await waitFor(() => expect(onDone).toHaveBeenCalledWith('Product visibility updated.'));
  });

  it('reports a refused toggle and still closes', async () => {
    const { onDone, onClose } = renderDialog(listing(), [
      {
        request: { query: SET_LISTING_ACTIVE, variables: { product_doc_id: 'p1', active: false } },
        result: { errors: [new GraphQLError('Listing is under review')] },
      },
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'Deactivate' }));

    await waitFor(() => expect(onDone).toHaveBeenCalledWith('Listing is under review'));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Cancel without touching the listing', async () => {
    const { onDone, onClose } = renderDialog(listing());

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('ignores a confirm click that lands while the dialog is closing', async () => {
    let sent = false;
    const { onDone, rerenderWith } = renderDialog(listing(), [
      activeMock(false, () => {
        sent = true;
      }),
    ]);
    const confirm = within(await screen.findByRole('dialog')).getByRole('button', { name: 'Deactivate' });

    rerenderWith(<ListingPauseDialog target={null} onClose={vi.fn()} onDone={onDone} />);
    fireEvent.click(confirm);

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onDone).not.toHaveBeenCalled();
    expect(sent).toBe(false);
  });
});
