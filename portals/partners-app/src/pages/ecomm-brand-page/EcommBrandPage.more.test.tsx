import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, configure, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import EcommBrandPage from './EcommBrandPage';
import { MY_BRANDS, SAVE_BRAND, SET_MY_BRAND_ACTIVE, type EcommBrandRow } from './queries';
import { renderWithProviders } from '../../__tests__/render';

const stub = vi.hoisted(() => ({
  rows: [] as EcommBrandRow[],
  refetchRows: vi.fn(),
}));

/** Stands in for the ag-grid table (it has its own suite): the page only needs
 * a row to be paused/reactivated or opened, and the reload handle published. */
vi.mock('./PartnerBrandsTable', () => ({
  default: ({
    toolbarActions,
    refetchRef,
    onOpen,
    onToggleActive,
  }: Readonly<{
    toolbarActions?: ReactNode;
    refetchRef: { current: (() => void) | null };
    onOpen: (row: EcommBrandRow) => void;
    onToggleActive: (row: EcommBrandRow) => void;
  }>) => {
    refetchRef.current = stub.refetchRows;
    return (
      <div>
        {toolbarActions}
        {stub.rows.map((row) => (
          <div key={row.id}>
            <button type="button" onClick={() => onOpen(row)}>{`Open ${row.brand_name}`}</button>
            <button type="button" onClick={() => onToggleActive(row)}>{`Toggle ${row.brand_name}`}</button>
          </div>
        ))}
      </div>
    );
  },
}));

configure({ asyncUtilTimeout: 5000 });
afterEach(cleanup);
beforeEach(() => {
  stub.rows = [];
  stub.refetchRows.mockClear();
});

const ACCOUNT_EMAIL = 'asha@duncit.com';

const brand = (over: Partial<EcommBrandRow> = {}) => ({
  __typename: 'EcommBrand',
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
  status: 'APPROVED' as const,
  is_active: true,
  reviewer_notes: '',
  submitted_at: null,
  approved_at: null,
  ...over,
});

const brandsMock = (brands: ReturnType<typeof brand>[]): MockedResponse => {
  stub.rows = brands;
  return {
    request: { query: MY_BRANDS },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: {
      data: {
        me: { __typename: 'User', user_id: 'u1', full_name: 'Asha Rao', email: ACCOUNT_EMAIL, roles: ['ECOMMERCE_BRAND'] },
        myEcommBrands: brands,
      },
    },
  };
};

/** The input a draft brand named "Chai Point" with no other edits saves. */
const saveInput = {
  brand_name: 'Chai Point',
  tagline: '',
  description: '',
  logo_url: '',
  cover_image_url: '',
  product_categories: [],
  website_url: '',
  instagram_url: '',
  contact_person: '',
  contact_email: ACCOUNT_EMAIL,
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
};

const renderPage = (mocks: MockedResponse[]) =>
  renderWithProviders(<EcommBrandPage />, { mocks, route: '/ecomm-brand', path: '/ecomm-brand' });

describe('EcommBrandPage pause', () => {
  it('deactivates an approved brand, confirms it and reloads the table', async () => {
    let sent = false;
    renderPage([
      brandsMock([brand()]),
      {
        request: { query: SET_MY_BRAND_ACTIVE, variables: { brand_doc_id: 'b1', active: false } },
        result: () => {
          sent = true;
          return { data: { setMyEcommBrandActive: { __typename: 'EcommBrand', id: 'b1', is_active: false } } };
        },
      },
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'Toggle Chai Point' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Temporarily deactivate brand')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Deactivate' }));

    expect(await screen.findByText('Brand visibility updated.')).toBeTruthy();
    expect(sent).toBe(true);
    expect(stub.refetchRows).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('dismisses the confirmation message with Escape', async () => {
    renderPage([
      brandsMock([brand({ is_active: false })]),
      {
        request: { query: SET_MY_BRAND_ACTIVE, variables: { brand_doc_id: 'b1', active: true } },
        result: { data: { setMyEcommBrandActive: { __typename: 'EcommBrand', id: 'b1', is_active: true } } },
      },
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'Toggle Chai Point' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Reactivate' }));
    expect(await screen.findByText('Brand visibility updated.')).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('Brand visibility updated.')).toBeNull());
  });

  it('closes the pause dialog on Cancel', async () => {
    renderPage([brandsMock([brand()])]);

    fireEvent.click(await screen.findByRole('button', { name: 'Toggle Chai Point' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(stub.refetchRows).not.toHaveBeenCalled();
  });
});

describe('EcommBrandPage save failing after the dialog closed', () => {
  it('shows the late error on the page itself, where it can be dismissed', async () => {
    renderPage([
      brandsMock([brand({ status: 'DRAFT' })]),
      {
        request: { query: SAVE_BRAND, variables: { brand_doc_id: 'b1', input: saveInput } },
        delay: 150,
        result: { errors: [new GraphQLError('Brand name already taken')] },
      },
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'Open Chai Point' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Save draft' }));
    // The partner closes the dialog before the server answers.
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Brand name already taken');
    fireEvent.click(within(alert).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('Brand name already taken')).toBeNull());
  });
});
