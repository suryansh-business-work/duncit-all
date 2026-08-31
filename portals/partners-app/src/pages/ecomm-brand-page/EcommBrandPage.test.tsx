import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GraphQLError } from 'graphql';
import EcommBrandPage from './EcommBrandPage';
import { MY_BRANDS, SAVE_BRAND, SUBMIT_BRAND, WITHDRAW_BRAND, type EcommBrandRow } from './queries';

type StubRow = Record<string, unknown> & { id: string; brand_name: string };

const stub = vi.hoisted(() => ({
  rows: [] as (Record<string, unknown> & { id: string; brand_name: string })[],
  pickedUrl: 'https://cdn.test/logo.png' as string | null,
  refetchRows: vi.fn(),
}));

/** Stands in for the ag-grid brands table: the page only cares that a row can
 * be opened, sent to products, or sent to settings. */
vi.mock('./PartnerBrandsTable', () => ({
  default: ({
    toolbarActions,
    refetchRef,
    onOpen,
    onManageProducts,
    onSettings,
  }: Readonly<{
    toolbarActions?: ReactNode;
    refetchRef: { current: (() => void) | null };
    onOpen: (row: EcommBrandRow) => void;
    onManageProducts: (row: EcommBrandRow) => void;
    onSettings: (row: EcommBrandRow) => void;
  }>) => {
    // The real DuncitTable publishes its reload handler the same way.
    refetchRef.current = stub.refetchRows;
    return (
    <div>
      {toolbarActions}
      {(stub.rows as StubRow[]).map((row) => (
        <div key={row.id}>
          <button type="button" onClick={() => onOpen(row as unknown as EcommBrandRow)}>
            {`Open ${row.brand_name}`}
          </button>
          <button type="button" onClick={() => onManageProducts(row as unknown as EcommBrandRow)}>
            {`Products ${row.brand_name}`}
          </button>
          <button type="button" onClick={() => onSettings(row as unknown as EcommBrandRow)}>
            {`Settings ${row.brand_name}`}
          </button>
        </div>
      ))}
    </div>
    );
  },
}));

/** The real picker is a MUI Dialog in a portal; the stub portals too so it is
 * not hidden behind the brand dialog's aria-hidden backdrop. */
vi.mock('../../components/MediaPickerDialog', () => ({
  default: ({
    open,
    onClose,
    onPicked,
  }: Readonly<{ open: boolean; onClose: () => void; onPicked: (url: string) => void }>) =>
    open
      ? createPortal(
          <div>
            <button type="button" onClick={() => onPicked(stub.pickedUrl ?? '')}>
              Confirm pick
            </button>
            <button type="button" onClick={onClose}>
              Dismiss picker
            </button>
          </div>,
          document.body,
        )
      : null,
}));

// Apollo + MUI transitions are slow on a loaded CI box.
configure({ asyncUtilTimeout: 5000 });
afterEach(cleanup);
beforeEach(() => {
  stub.rows = [];
  stub.pickedUrl = 'https://cdn.test/logo.png';
  stub.refetchRows.mockClear();
});

const ACCOUNT_EMAIL = 'asha@brand.example.com';

const brand = (over: Record<string, unknown> = {}) => ({
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
  status: 'DRAFT',
  reviewer_notes: '',
  submitted_at: null,
  approved_at: null,
  ...over,
});

/** The exact EcommBrandInput a blank form produces — spelled out so a renamed
 * or dropped field stops matching the mock and fails the test. */
const saveInput = (over: Record<string, unknown> = {}) => ({
  brand_name: '',
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
  ...over,
});

/** Mocks myEcommBrands AND seeds the stubbed table with the same rows, the way
 * the real server-paged table would list them. */
const brandsMock = (brands: ReturnType<typeof brand>[] = []): MockedResponse => {
  stub.rows = brands as StubRow[];
  return {
    request: { query: MY_BRANDS },
    maxUsageCount: 5,
    result: {
      data: {
        me: {
          __typename: 'User',
          user_id: 'u1',
          full_name: 'Asha Verma',
          email: ACCOUNT_EMAIL,
          roles: ['ECOMMERCE_BRAND'],
        },
        myEcommBrands: brands,
      },
    },
  };
};

const renderPage = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mocks={mocks}>
      <MemoryRouter initialEntries={['/ecomm-brand']}>
        <Routes>
          <Route path="/ecomm-brand" element={<EcommBrandPage />} />
          <Route path="/ecomm-brand/:brandId/products" element={<p>Product management</p>} />
          <Route path="/ecomm-brand/:brandId/settings" element={<p>Brand settings screen</p>} />
        </Routes>
      </MemoryRouter>
    </MockedProvider>,
  );

describe('EcommBrandPage shell', () => {
  it('shows a loading line before the first result', () => {
    renderPage([brandsMock()]);
    expect(screen.getByText('Loading…')).toBeTruthy();
    expect(screen.queryByText('E-Commerce Brands')).toBeNull();
  });

  it('renders the partner hero and the brands card', async () => {
    renderPage([brandsMock()]);
    expect(await screen.findByText('E-Commerce Brands')).toBeTruthy();
    expect(screen.getByText('Your brands')).toBeTruthy();
    expect(screen.getByText(/our onboarding team verifies each before it goes live/)).toBeTruthy();
  });

  it('routes the row actions to product management and brand settings', async () => {
    renderPage([brandsMock([brand()])]);
    fireEvent.click(await screen.findByRole('button', { name: 'Products Chai Point' }));
    expect(await screen.findByText('Product management')).toBeTruthy();

    cleanup();
    renderPage([brandsMock([brand()])]);
    fireEvent.click(await screen.findByRole('button', { name: 'Settings Chai Point' }));
    expect(await screen.findByText('Brand settings screen')).toBeTruthy();
  });
});

describe('EcommBrandPage dialog', () => {
  it('opens a blank New brand dialog prefilled with the account email', async () => {
    renderPage([brandsMock()]);
    fireEvent.click(await screen.findByRole('button', { name: 'New brand' }));
    expect(await screen.findByText('New brand', { selector: 'span' })).toBeTruthy();
    expect((screen.getByLabelText(/Brand name/) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText(/Contact email/) as HTMLInputElement).value).toBe(ACCOUNT_EMAIL);
  });

  it('titles an editable brand "Edit brand" and prefills it', async () => {
    renderPage([brandsMock([brand()])]);
    fireEvent.click(await screen.findByRole('button', { name: 'Open Chai Point' }));
    expect(await screen.findByText('Edit brand')).toBeTruthy();
    expect((screen.getByLabelText(/Brand name/) as HTMLInputElement).value).toBe('Chai Point');
  });

  it('closes the dialog from the close icon', async () => {
    renderPage([brandsMock()]);
    fireEvent.click(await screen.findByRole('button', { name: 'New brand' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByLabelText(/Brand name/)).toBeNull());
  });
});

describe('EcommBrandPage review states', () => {
  it('locks a submitted brand behind an under-review notice', async () => {
    renderPage([brandsMock([brand({ status: 'SUBMITTED' })])]);
    fireEvent.click(await screen.findByRole('button', { name: 'Open Chai Point' }));
    expect(await screen.findByText('Brand details')).toBeTruthy();
    expect(screen.getByText('This brand is under review.')).toBeTruthy();
    expect(screen.getByLabelText(/Brand name/).hasAttribute('disabled')).toBe(true);
    expect(screen.queryByRole('button', { name: 'Save draft' })).toBeNull();
  });

  it('locks an approved brand behind a verified notice', async () => {
    renderPage([brandsMock([brand({ status: 'APPROVED' })])]);
    fireEvent.click(await screen.findByRole('button', { name: 'Open Chai Point' }));
    expect(await screen.findByText('Approved — your brand is verified.')).toBeTruthy();
    expect(screen.getByText('Brand details')).toBeTruthy();
    expect(screen.getByLabelText(/Brand name/).hasAttribute('disabled')).toBe(true);
  });

  it('shows the reviewer notes on a rejected brand and keeps it editable', async () => {
    renderPage([brandsMock([brand({ status: 'REJECTED', reviewer_notes: 'GSTIN mismatch' })])]);
    fireEvent.click(await screen.findByRole('button', { name: 'Open Chai Point' }));
    expect(await screen.findByText(/GSTIN mismatch/)).toBeTruthy();
    expect(screen.getByText('Edit brand')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeTruthy();
  });

  it('falls back to a generic rejection line when there are no notes', async () => {
    renderPage([brandsMock([brand({ status: 'REJECTED', reviewer_notes: '' })])]);
    fireEvent.click(await screen.findByRole('button', { name: 'Open Chai Point' }));
    expect(await screen.findByText(/Rejected: See notes\./)).toBeTruthy();
  });

  it('withdraws a submitted brand back to draft and unlocks the form in place', async () => {
    renderPage([
      brandsMock([brand({ status: 'SUBMITTED' })]),
      {
        request: { query: WITHDRAW_BRAND, variables: { brand_doc_id: 'b1' } },
        result: {
          data: {
            withdrawEcommBrand: { __typename: 'EcommBrand', id: 'b1', status: 'DRAFT' },
          },
        },
      },
    ]);
    fireEvent.click(await screen.findByRole('button', { name: 'Open Chai Point' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));

    expect(await screen.findByText('Brand moved back to draft.')).toBeTruthy();
    expect(stub.refetchRows).toHaveBeenCalled();
    expect(screen.queryByText('This brand is under review.')).toBeNull();
    expect(screen.getByLabelText(/Brand name/).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeTruthy();
  });

  it('reports a failed withdrawal inside the dialog', async () => {
    renderPage([
      brandsMock([brand({ status: 'SUBMITTED' })]),
      {
        request: { query: WITHDRAW_BRAND, variables: { brand_doc_id: 'b1' } },
        result: { errors: [new GraphQLError('Review already started')] },
      },
    ]);
    fireEvent.click(await screen.findByRole('button', { name: 'Open Chai Point' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(await screen.findByText('Review already started')).toBeTruthy();
    expect(screen.getByText('This brand is under review.')).toBeTruthy();
  });
});

describe('EcommBrandPage saving', () => {
  it('creates a brand with a null brand_doc_id and closes on success', async () => {
    renderPage([
      brandsMock(),
      {
        request: {
          query: SAVE_BRAND,
          variables: { brand_doc_id: null, input: saveInput({ brand_name: 'Filter Co' }) },
        },
        result: {
          data: { saveEcommBrand: brand({ id: 'b2', brand_name: 'Filter Co' }) },
        },
      },
    ]);
    fireEvent.click(await screen.findByRole('button', { name: 'New brand' }));
    fireEvent.change(await screen.findByLabelText(/Brand name/), {
      target: { value: 'Filter Co' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await screen.findByText('Brand saved.')).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('New brand', { selector: 'span' })).toBeNull());
    expect(stub.refetchRows).toHaveBeenCalled();
  });

  it('saves an existing brand against its own id', async () => {
    renderPage([
      brandsMock([brand()]),
      {
        request: {
          query: SAVE_BRAND,
          variables: {
            brand_doc_id: 'b1',
            input: saveInput({ brand_name: 'Chai Point', tagline: 'Chai, delivered' }),
          },
        },
        result: { data: { saveEcommBrand: brand({ tagline: 'Chai, delivered' }) } },
      },
    ]);
    fireEvent.click(await screen.findByRole('button', { name: 'Open Chai Point' }));
    fireEvent.change(await screen.findByLabelText(/Tagline/), {
      target: { value: 'Chai, delivered' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByText('Brand saved.')).toBeTruthy();
  });

  it('surfaces a save failure without closing the dialog', async () => {
    renderPage([
      brandsMock(),
      {
        request: {
          query: SAVE_BRAND,
          variables: { brand_doc_id: null, input: saveInput({ brand_name: 'Filter Co' }) },
        },
        result: { errors: [new GraphQLError('Brand name already taken')] },
      },
    ]);
    fireEvent.click(await screen.findByRole('button', { name: 'New brand' }));
    fireEvent.change(await screen.findByLabelText(/Brand name/), {
      target: { value: 'Filter Co' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await screen.findByText('Brand name already taken')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeTruthy();
  });

  it('submits a brand new for review using the id returned by the save', async () => {
    renderPage([
      brandsMock(),
      {
        request: {
          query: SAVE_BRAND,
          variables: { brand_doc_id: null, input: saveInput({ brand_name: 'Filter Co' }) },
        },
        result: { data: { saveEcommBrand: brand({ id: 'b7', brand_name: 'Filter Co' }) } },
      },
      {
        request: { query: SUBMIT_BRAND, variables: { brand_doc_id: 'b7' } },
        result: {
          data: {
            submitEcommBrand: {
              __typename: 'EcommBrand',
              id: 'b7',
              status: 'SUBMITTED',
              submitted_at: '2026-07-01T00:00:00.000Z',
            },
          },
        },
      },
    ]);
    fireEvent.click(await screen.findByRole('button', { name: 'New brand' }));
    fireEvent.change(await screen.findByLabelText(/Brand name/), {
      target: { value: 'Filter Co' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Submit for review/ }));

    expect(await screen.findByText('Brand submitted for review.')).toBeTruthy();
    expect(stub.refetchRows).toHaveBeenCalled();
  });

  it('submits an existing brand for review against its own id', async () => {
    renderPage([
      brandsMock([brand()]),
      {
        request: {
          query: SAVE_BRAND,
          variables: { brand_doc_id: 'b1', input: saveInput({ brand_name: 'Chai Point' }) },
        },
        result: { data: { saveEcommBrand: brand() } },
      },
      {
        request: { query: SUBMIT_BRAND, variables: { brand_doc_id: 'b1' } },
        result: {
          data: {
            submitEcommBrand: {
              __typename: 'EcommBrand',
              id: 'b1',
              status: 'SUBMITTED',
              submitted_at: '2026-07-01T00:00:00.000Z',
            },
          },
        },
      },
    ]);
    fireEvent.click(await screen.findByRole('button', { name: 'Open Chai Point' }));
    fireEvent.click(await screen.findByRole('button', { name: /Submit for review/ }));
    expect(await screen.findByText('Brand submitted for review.')).toBeTruthy();
  });

  it('reports a rejected submit and leaves the brand in the dialog', async () => {
    renderPage([
      brandsMock([brand()]),
      {
        request: {
          query: SAVE_BRAND,
          variables: { brand_doc_id: 'b1', input: saveInput({ brand_name: 'Chai Point' }) },
        },
        result: { data: { saveEcommBrand: brand() } },
      },
      {
        request: { query: SUBMIT_BRAND, variables: { brand_doc_id: 'b1' } },
        result: { errors: [new GraphQLError('Add a description before submitting')] },
      },
    ]);
    fireEvent.click(await screen.findByRole('button', { name: 'Open Chai Point' }));
    fireEvent.click(await screen.findByRole('button', { name: /Submit for review/ }));
    expect(await screen.findByText('Add a description before submitting')).toBeTruthy();
    expect(screen.getByText('Edit brand')).toBeTruthy();
  });
});

describe('EcommBrandPage media picker plumbing', () => {
  it('resolves the form’s image request with the picked URL', async () => {
    renderPage([brandsMock()]);
    fireEvent.click(await screen.findByRole('button', { name: 'New brand' }));
    fireEvent.click((await screen.findAllByRole('button', { name: 'Upload' }))[0]);
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm pick' }));

    const logo = (await screen.findByAltText('Logo')) as HTMLImageElement;
    expect(logo.src).toBe('https://cdn.test/logo.png');
    expect(screen.queryByRole('button', { name: 'Confirm pick' })).toBeNull();
  });

  it('resolves with nothing when the picker is dismissed', async () => {
    renderPage([brandsMock()]);
    fireEvent.click(await screen.findByRole('button', { name: 'New brand' }));
    fireEvent.click((await screen.findAllByRole('button', { name: 'Upload' }))[0]);
    fireEvent.click(await screen.findByRole('button', { name: 'Dismiss picker' }));

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Dismiss picker' })).toBeNull());
    expect(screen.queryByAltText('Logo')).toBeNull();
  });
});
