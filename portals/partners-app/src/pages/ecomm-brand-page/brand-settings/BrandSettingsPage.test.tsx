import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { GraphQLError } from 'graphql';
import BrandSettingsPage from './BrandSettingsPage';
import { MY_BRANDS } from '../queries';
import {
  DELETE_MY_WAREHOUSE,
  MY_BRAND_WAREHOUSES,
  MY_WAREHOUSE_USAGE,
  SAVE_MY_WAREHOUSE,
  SET_DEFAULT_MY_WAREHOUSE,
  SET_MY_WAREHOUSE_ACTIVE,
  type PickupProductRef,
} from './warehouse.queries';

// Apollo + MUI transitions are slow on a loaded CI box.
configure({ asyncUtilTimeout: 5000 });
afterEach(cleanup);

const BRAND_ID = 'b1';

const brand = (over: Record<string, unknown> = {}) => ({
  __typename: 'EcommBrand',
  id: BRAND_ID,
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
  reviewer_notes: '',
  submitted_at: null,
  approved_at: null,
  ...over,
});

const warehouse = (over: Record<string, unknown> = {}) => ({
  __typename: 'BrandPickupLocation',
  id: 'w1',
  owner_kind: 'BRAND',
  brand_id: BRAND_ID,
  nickname: 'Delhi warehouse',
  contact_name: 'Asha Verma',
  phone: '9876543210',
  email: 'asha@brand.example.com',
  address_line1: '12 Industrial Area',
  address_line2: 'Phase 2',
  city: 'New Delhi',
  state: 'Delhi',
  pincode: '110020',
  country: 'India',
  is_default: false,
  is_active: true,
  review_status: 'APPROVED',
  shiprocket_registered: false,
  shiprocket_error: '',
  shiprocket_pickup_id: '',
  updated_at: '2026-07-01T00:00:00.000Z',
  ...over,
});

const brandsMock = (brands: ReturnType<typeof brand>[] = [brand()]): MockedResponse => ({
  request: { query: MY_BRANDS },
  maxUsageCount: 5,
  result: {
    data: {
      me: {
        __typename: 'User',
        user_id: 'u1',
        full_name: 'Asha Verma',
        email: 'asha@brand.example.com',
        roles: ['ECOMMERCE_BRAND'],
      },
      myEcommBrands: brands,
    },
  },
});

const warehousesMock = (
  warehouses: ReturnType<typeof warehouse>[] = [],
): MockedResponse => ({
  request: { query: MY_BRAND_WAREHOUSES, variables: { brand_doc_id: BRAND_ID } },
  maxUsageCount: 5,
  result: { data: { myBrandPickupLocations: warehouses } },
});

/** What the removal dialog reads before it lets the partner confirm: the products still shipping from w1. */
const usageMock = (products: PickupProductRef[] = [], count = products.length): MockedResponse => ({
  request: { query: MY_WAREHOUSE_USAGE, variables: { brand_doc_id: BRAND_ID, id: 'w1' } },
  result: {
    data: {
      myBrandPickupLocationUsage: {
        __typename: 'BrandPickupUsage',
        count,
        products: products.map((product) => ({ __typename: 'PickupProductRef', ...product })),
      },
    },
  },
});

const renderSettings = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <MemoryRouter initialEntries={[`/ecomm-brand/${BRAND_ID}/settings`]}>
        <Routes>
          <Route path="/ecomm-brand" element={<p>Brands list</p>} />
          <Route path="/ecomm-brand/:brandId/settings" element={<BrandSettingsPage />} />
        </Routes>
      </MemoryRouter>
    </MockedProvider>,
  );

describe('BrandSettingsPage shell', () => {
  it('shows only a spinner until both queries have answered', () => {
    renderSettings([brandsMock(), warehousesMock()]);
    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(screen.queryByText('Pickup Addresses')).toBeNull();
  });

  it('titles the page with the brand name from the caller’s own brands', async () => {
    renderSettings([brandsMock(), warehousesMock()]);
    expect(await screen.findByText('Chai Point settings')).toBeTruthy();
  });

  it('falls back to a generic title when the brand has no name', async () => {
    renderSettings([brandsMock([brand({ brand_name: '' })]), warehousesMock()]);
    expect(await screen.findByText('Brand settings')).toBeTruthy();
  });

  it('warns and hides the pickup address card when the brand is not the caller’s', async () => {
    renderSettings([brandsMock([brand({ id: 'someone-else' })]), warehousesMock()]);
    expect(await screen.findByText('Brand was not found in your account.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add pickup address' })).toBeNull();
    expect(screen.queryByText('Pickup Addresses')).toBeNull();
  });

  it('navigates back to the brands list', async () => {
    renderSettings([brandsMock(), warehousesMock()]);
    fireEvent.click(await screen.findByRole('button', { name: 'Back' }));
    expect(await screen.findByText('Brands list')).toBeTruthy();
  });

  it('surfaces a pickup address query failure', async () => {
    renderSettings([
      brandsMock(),
      {
        request: { query: MY_BRAND_WAREHOUSES, variables: { brand_doc_id: BRAND_ID } },
        result: { errors: [new GraphQLError('Pickup addresses are unavailable')] },
      },
    ]);
    expect(await screen.findByText('Pickup addresses are unavailable')).toBeTruthy();
  });
});

describe('BrandSettingsPage pickup address list', () => {
  it('shows the empty state and the review note', async () => {
    renderSettings([brandsMock(), warehousesMock()]);
    expect(
      await screen.findByText('No pickup addresses yet — add the address your products ship from.'),
    ).toBeTruthy();
    expect(screen.getByText(/is reviewed by the Duncit team/)).toBeTruthy();
  });

  it('renders a pickup address with its address, primary, active and approval state', async () => {
    renderSettings([brandsMock(), warehousesMock([warehouse({ is_default: true })])]);
    expect(await screen.findByText('Delhi warehouse')).toBeTruthy();
    expect(
      screen.getByText('12 Industrial Area, Phase 2, New Delhi, Delhi, 110020'),
    ).toBeTruthy();
    expect(screen.getByText('Primary')).toBeTruthy();
    expect(screen.getByText('Approved')).toBeTruthy();
    expect(screen.queryByText('Awaiting approval')).toBeNull();
    const active = screen.getByRole('switch', { name: 'Delhi warehouse is active — switch off to disable it' });
    expect((active as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByText('Inactive')).toBeNull();
  });

  it('flags a pickup address still awaiting approval, with the reason', async () => {
    renderSettings([brandsMock(), warehousesMock([warehouse({ review_status: 'PENDING' })])]);
    expect(await screen.findByText('Awaiting approval')).toBeTruthy();
    expect(
      screen.getByText('Products cannot ship from this pickup address until the Duncit team approves it.'),
    ).toBeTruthy();
    expect(screen.queryByText('Primary')).toBeNull();
  });

  it('marks an inactive pickup address, says what that means and will not make it primary', async () => {
    renderSettings([brandsMock(), warehousesMock([warehouse({ is_active: false })])]);
    const inactive = await screen.findByRole('switch', {
      name: 'Delhi warehouse is inactive — switch on to enable it',
    });
    expect((inactive as HTMLInputElement).checked).toBe(false);
    expect(
      screen.getByText('Inactive — it cannot be chosen for a product or made primary until you switch it on.'),
    ).toBeTruthy();
    const makePrimary = screen.getByRole('button', { name: 'Make Delhi warehouse the primary pickup address' });
    expect(makePrimary.hasAttribute('disabled')).toBe(true);
  });
});

describe('BrandSettingsPage pickup address dialog', () => {
  it('opens an empty New pickup address form from Add pickup address', async () => {
    renderSettings([brandsMock(), warehousesMock()]);
    fireEvent.click(await screen.findByRole('button', { name: 'Add pickup address' }));
    expect(await screen.findByText('New pickup address')).toBeTruthy();
    expect((screen.getByLabelText(/Address nickname/) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText(/^Country/) as HTMLInputElement).value).toBe('India');
  });

  it('opens a prefilled Edit pickup address form and closes again', async () => {
    renderSettings([brandsMock(), warehousesMock([warehouse()])]);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Delhi warehouse' }));
    expect(await screen.findByText('Edit pickup address')).toBeTruthy();
    expect((screen.getByLabelText(/Address nickname/) as HTMLInputElement).value).toBe(
      'Delhi warehouse',
    );
    expect((screen.getByLabelText(/Pincode/) as HTMLInputElement).value).toBe('110020');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText('Edit pickup address')).toBeNull());
  });

  it('saves an edited pickup address with owner_kind BRAND and the existing id', async () => {
    const edited = { ...warehouse(), nickname: 'Delhi hub' };
    const saveMock: MockedResponse = {
      request: {
        query: SAVE_MY_WAREHOUSE,
        variables: {
          brand_doc_id: BRAND_ID,
          id: 'w1',
          input: {
            nickname: 'Delhi hub',
            contact_name: 'Asha Verma',
            phone: '9876543210',
            email: 'asha@brand.example.com',
            address_line1: '12 Industrial Area',
            address_line2: 'Phase 2',
            city: 'New Delhi',
            state: 'Delhi',
            pincode: '110020',
            country: 'India',
            is_default: false,
            owner_kind: 'BRAND',
          },
        },
      },
      result: { data: { saveMyBrandPickupLocation: edited } },
    };
    renderSettings([brandsMock(), warehousesMock([warehouse()]), saveMock]);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit Delhi warehouse' }));
    fireEvent.change(await screen.findByLabelText(/Address nickname/), {
      target: { value: 'Delhi hub' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save pickup address' }));

    expect(await screen.findByText('Pickup address saved.')).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('Edit pickup address')).toBeNull());
  });

  it('keeps the dialog open and shows the server message when the save is rejected', async () => {
    const saveMock: MockedResponse = {
      request: {
        query: SAVE_MY_WAREHOUSE,
        variables: {
          brand_doc_id: BRAND_ID,
          id: 'w1',
          input: {
            nickname: 'Delhi warehouse',
            contact_name: 'Asha Verma',
            phone: '9876543210',
            email: 'asha@brand.example.com',
            address_line1: '12 Industrial Area',
            address_line2: 'Phase 2',
            city: 'New Delhi',
            state: 'Delhi',
            pincode: '110020',
            country: 'India',
            is_default: false,
            owner_kind: 'BRAND',
          },
        },
      },
      result: { errors: [new GraphQLError('A pickup address with this nickname already exists')] },
    };
    renderSettings([brandsMock(), warehousesMock([warehouse()]), saveMock]);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit Delhi warehouse' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Save pickup address' }));

    expect(await screen.findByText('A pickup address with this nickname already exists')).toBeTruthy();
    expect(screen.getByText('Edit pickup address')).toBeTruthy();
  });

  it('refuses to save an invalid pincode', async () => {
    renderSettings([brandsMock(), warehousesMock([warehouse()])]);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Delhi warehouse' }));
    fireEvent.change(await screen.findByLabelText(/Pincode/), { target: { value: '110' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save pickup address' }));

    expect(await screen.findByText('Enter a valid 6-digit pincode')).toBeTruthy();
    expect(screen.queryByText('Pickup address saved.')).toBeNull();
  });
});

/** The server's own refusal when a product was pointed at the address after the dialog had checked it. */
const IN_USE_REFUSAL =
  'This pickup address cannot be deleted — 1 product(s) ship from it. Move them to another pickup address first: Masala Chai.';

describe('BrandSettingsPage delete and primary', () => {
  it('checks what ships from the address, then confirms before deleting and reports the deletion', async () => {
    const deleteMock: MockedResponse = {
      request: { query: DELETE_MY_WAREHOUSE, variables: { brand_doc_id: BRAND_ID, id: 'w1' } },
      result: { data: { deleteMyBrandPickupLocation: true } },
    };
    renderSettings([brandsMock(), warehousesMock([warehouse()]), usageMock(), deleteMock]);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete Delhi warehouse' }));
    expect(await screen.findByText('Delete pickup address')).toBeTruthy();
    expect(await screen.findByText('Delhi warehouse will be deleted. No product ships from it.')).toBeTruthy();
    expect(screen.queryByTestId('pickup-removal-blocked')).toBeNull();

    const confirm = screen.getByRole('button', { name: 'Delete' });
    expect(confirm.hasAttribute('disabled')).toBe(false);
    fireEvent.click(confirm);
    expect(await screen.findByText('Pickup address deleted.')).toBeTruthy();
  });

  it('will not delete an address products still ship from, and links each product to move', async () => {
    renderSettings([
      brandsMock(),
      warehousesMock([warehouse()]),
      usageMock(
        [
          { id: 'p1', name: 'Masala Chai', status: 'ACTIVE' },
          { id: 'p2', name: 'Ginger Chai', status: 'PAUSED' },
        ],
        3,
      ),
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete Delhi warehouse' }));
    expect((await screen.findByTestId('pickup-removal-blocked')).textContent).toBe(
      '3 product(s) ship from Delhi warehouse. Move each one to another pickup address, then come back.',
    );
    const products = within(screen.getByTestId('pickup-removal-products'));
    expect(
      products.getByRole('link', { name: 'Open Masala Chai to change its pickup address' }).getAttribute('href'),
    ).toBe(`/ecomm-brand/${BRAND_ID}/products/p1`);
    expect(
      products.getByRole('link', { name: 'Open Ginger Chai to change its pickup address' }).getAttribute('href'),
    ).toBe(`/ecomm-brand/${BRAND_ID}/products/p2`);
    // Three ship from it and two are named: the rest are counted.
    expect(screen.getByText('…and 1 more.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete' }).hasAttribute('disabled')).toBe(true);
    expect(screen.queryByText('Delhi warehouse will be deleted. No product ships from it.')).toBeNull();
  });

  it('reports the server’s refusal and keeps the pickup address listed', async () => {
    const deleteMock: MockedResponse = {
      request: { query: DELETE_MY_WAREHOUSE, variables: { brand_doc_id: BRAND_ID, id: 'w1' } },
      result: { errors: [new GraphQLError(IN_USE_REFUSAL)] },
    };
    renderSettings([brandsMock(), warehousesMock([warehouse()]), usageMock(), deleteMock]);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete Delhi warehouse' }));
    await screen.findByText('Delhi warehouse will be deleted. No product ships from it.');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText(IN_USE_REFUSAL)).toBeTruthy();
    expect(screen.queryByText('Pickup address deleted.')).toBeNull();
    expect(screen.getByText('Delhi warehouse')).toBeTruthy();
  });

  it('abandons the deletion on Cancel without calling the mutation', async () => {
    renderSettings([brandsMock(), warehousesMock([warehouse()]), usageMock()]);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Delhi warehouse' }));
    await screen.findByText('Delhi warehouse will be deleted. No product ships from it.');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByText('Pickup address deleted.')).toBeNull();
    expect(screen.getByText('Delhi warehouse')).toBeTruthy();
  });

  it('asks before switching an address off, then disables it and says so', async () => {
    const disableMock: MockedResponse = {
      request: {
        query: SET_MY_WAREHOUSE_ACTIVE,
        variables: { brand_doc_id: BRAND_ID, id: 'w1', active: false },
      },
      result: { data: { setMyBrandPickupLocationActive: warehouse({ is_active: false }) } },
    };
    renderSettings([brandsMock(), warehousesMock([warehouse()]), usageMock(), disableMock]);

    fireEvent.click(
      await screen.findByRole('switch', { name: 'Delhi warehouse is active — switch off to disable it' }),
    );
    expect(await screen.findByText('Disable pickup address')).toBeTruthy();
    expect(
      await screen.findByText(
        'Delhi warehouse will be made inactive. It stays saved, but cannot be chosen for a product until you switch it on again.',
      ),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Disable' }));
    expect(
      await screen.findByText('Delhi warehouse is now inactive. It can no longer be chosen for a product.'),
    ).toBeTruthy();
  });

  it('will not disable the primary pickup address', async () => {
    renderSettings([brandsMock(), warehousesMock([warehouse({ is_default: true })]), usageMock()]);

    fireEvent.click(
      await screen.findByRole('switch', { name: 'Delhi warehouse is active — switch off to disable it' }),
    );
    expect((await screen.findByTestId('pickup-removal-blocked')).textContent).toBe(
      'Delhi warehouse is the primary pickup address. Make another one primary first, then disable it.',
    );
    expect(screen.getByRole('button', { name: 'Disable' }).hasAttribute('disabled')).toBe(true);
  });

  it('switches an inactive address back on straight away, with no confirmation', async () => {
    const enableMock: MockedResponse = {
      request: {
        query: SET_MY_WAREHOUSE_ACTIVE,
        variables: { brand_doc_id: BRAND_ID, id: 'w1', active: true },
      },
      result: { data: { setMyBrandPickupLocationActive: warehouse() } },
    };
    renderSettings([brandsMock(), warehousesMock([warehouse({ is_active: false })]), enableMock]);

    fireEvent.click(
      await screen.findByRole('switch', { name: 'Delhi warehouse is inactive — switch on to enable it' }),
    );
    expect(await screen.findByText('Delhi warehouse is active again.')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('promotes a pickup address to primary and names it in the confirmation', async () => {
    const defaultMock: MockedResponse = {
      request: {
        query: SET_DEFAULT_MY_WAREHOUSE,
        variables: { brand_doc_id: BRAND_ID, id: 'w1' },
      },
      result: {
        data: { setDefaultMyBrandPickupLocation: warehouse({ is_default: true }) },
      },
    };
    renderSettings([brandsMock(), warehousesMock([warehouse()]), defaultMock]);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Make Delhi warehouse the primary pickup address' }),
    );
    expect(
      await screen.findByText('Delhi warehouse is now the primary pickup address.'),
    ).toBeTruthy();
  });

  it('cannot re-promote the pickup address that is already primary', async () => {
    renderSettings([brandsMock(), warehousesMock([warehouse({ is_default: true })])]);
    const button = await screen.findByRole('button', { name: 'Make Delhi warehouse the primary pickup address' });
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('reports a failed make-primary without crashing the page', async () => {
    const defaultMock: MockedResponse = {
      request: {
        query: SET_DEFAULT_MY_WAREHOUSE,
        variables: { brand_doc_id: BRAND_ID, id: 'w1' },
      },
      result: { errors: [new GraphQLError('Enable this pickup address before making it the primary one')] },
    };
    renderSettings([brandsMock(), warehousesMock([warehouse()]), defaultMock]);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Make Delhi warehouse the primary pickup address' }),
    );
    expect(await screen.findByText('Enable this pickup address before making it the primary one')).toBeTruthy();
    expect(screen.getByText('Delhi warehouse')).toBeTruthy();
  });
});
