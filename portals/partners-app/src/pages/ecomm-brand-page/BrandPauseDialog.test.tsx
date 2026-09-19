import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import BrandPauseDialog from './BrandPauseDialog';
import { SET_MY_BRAND_ACTIVE, type EcommBrandRow } from './queries';
import { renderWithProviders } from '../../__tests__/render';

afterEach(cleanup);

const brand = (over: Partial<EcommBrandRow> = {}): EcommBrandRow => ({
  id: 'b1',
  brand_name: 'Chai Point',
  logo_url: '',
  cover_image_url: '',
  tagline: '',
  description: '',
  product_categories: [],
  website_url: '',
  instagram_url: '',
  contact_person: '',
  contact_email: '',
  contact_phone: '',
  registered_business_name: '',
  gstin: '',
  pan: '',
  established_year: null,
  address_line1: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'India',
  account_holder_name: '',
  account_number: '',
  ifsc_code: '',
  upi_id: '',
  documents: [],
  tags: [],
  status: 'APPROVED',
  is_active: true,
  reviewer_notes: '',
  submitted_at: null,
  approved_at: null,
  ...over,
});

const activeMock = (active: boolean, capture?: () => void): MockedResponse => ({
  request: { query: SET_MY_BRAND_ACTIVE, variables: { brand_doc_id: 'b1', active } },
  result: () => {
    capture?.();
    return { data: { setMyEcommBrandActive: { __typename: 'EcommBrand', id: 'b1', is_active: active } } };
  },
});

const renderDialog = (target: EcommBrandRow | null, mocks: MockedResponse[] = []) => {
  const onClose = vi.fn();
  const onDone = vi.fn();
  const view = renderWithProviders(<BrandPauseDialog target={target} onClose={onClose} onDone={onDone} />, { mocks });
  return { ...view, onClose, onDone };
};

describe('BrandPauseDialog', () => {
  it('stays closed while no brand is picked', () => {
    renderDialog(null);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('explains that deactivating hides the brand and every product from the shop', async () => {
    let sent = false;
    const { onDone, onClose } = renderDialog(brand(), [
      activeMock(false, () => {
        sent = true;
      }),
    ]);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Temporarily deactivate brand')).toBeTruthy();
    expect(
      within(dialog).getByText(
        'Chai Point and all of its products will be hidden from the shop until you reactivate it. Orders already placed are not affected.',
      ),
    ).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Deactivate' }));

    await waitFor(() => expect(onDone).toHaveBeenCalledWith('Brand visibility updated.'));
    expect(sent).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('reactivates a paused brand', async () => {
    const { onDone, onClose } = renderDialog(brand({ is_active: false }), [activeMock(true)]);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Reactivate brand')).toBeTruthy();
    expect(within(dialog).getByText('Chai Point and its products will be visible in the shop again.')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reactivate' }));

    await waitFor(() => expect(onDone).toHaveBeenCalledWith('Brand visibility updated.'));
    expect(onClose).toHaveBeenCalled();
  });

  it('names an untitled brand generically', async () => {
    renderDialog(brand({ brand_name: '' }));
    expect(
      await screen.findByText(
        'This brand and all of its products will be hidden from the shop until you reactivate it. Orders already placed are not affected.',
      ),
    ).toBeTruthy();
  });

  it('reports a refused toggle and still closes', async () => {
    const { onDone, onClose } = renderDialog(brand(), [
      {
        request: { query: SET_MY_BRAND_ACTIVE, variables: { brand_doc_id: 'b1', active: false } },
        result: { errors: [new GraphQLError('Brand has an open settlement')] },
      },
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'Deactivate' }));

    await waitFor(() => expect(onDone).toHaveBeenCalledWith('Brand has an open settlement'));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Cancel without touching the brand', async () => {
    const { onDone, onClose } = renderDialog(brand());

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('ignores a confirm click that lands while the dialog is closing', async () => {
    let sent = false;
    const { onDone, rerenderWith } = renderDialog(brand(), [
      activeMock(false, () => {
        sent = true;
      }),
    ]);
    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'Deactivate' });

    // The parent cleared the target (Cancel) — the dialog fades out, and a
    // late click on its confirm button must not act on a brand any more.
    rerenderWith(<BrandPauseDialog target={null} onClose={vi.fn()} onDone={onDone} />);
    fireEvent.click(confirm);

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onDone).not.toHaveBeenCalled();
    expect(sent).toBe(false);
  });
});
