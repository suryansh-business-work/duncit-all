import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GraphQLError } from 'graphql';
import BrandSettingsPage from './BrandSettingsPage';
import { MY_BRANDS } from '../queries';
import {
  DELETE_MY_WAREHOUSE,
  MY_BRAND_WAREHOUSES,
  SAVE_MY_WAREHOUSE,
  SET_DEFAULT_MY_WAREHOUSE,
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
    expect(screen.queryByText('Warehouses')).toBeNull();
  });

  it('titles the page with the brand name from the caller’s own brands', async () => {
    renderSettings([brandsMock(), warehousesMock()]);
    expect(await screen.findByText('Chai Point settings')).toBeTruthy();
  });

  it('falls back to a generic title when the brand has no name', async () => {
    renderSettings([brandsMock([brand({ brand_name: '' })]), warehousesMock()]);
    expect(await screen.findByText('Brand settings')).toBeTruthy();
  });

  it('warns and hides the warehouse card when the brand is not the caller’s', async () => {
    renderSettings([brandsMock([brand({ id: 'someone-else' })]), warehousesMock()]);
    expect(await screen.findByText('Brand was not found in your account.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add warehouse' })).toBeNull();
  });

  it('navigates back to the brands list', async () => {
    renderSettings([brandsMock(), warehousesMock()]);
    fireEvent.click(await screen.findByRole('button', { name: 'Back' }));
    expect(await screen.findByText('Brands list')).toBeTruthy();
  });

  it('surfaces a warehouse query failure', async () => {
    renderSettings([
      brandsMock(),
      {
        request: { query: MY_BRAND_WAREHOUSES, variables: { brand_doc_id: BRAND_ID } },
        result: { errors: [new GraphQLError('Warehouses are unavailable')] },
      },
    ]);
    expect(await screen.findByText('Warehouses are unavailable')).toBeTruthy();
  });
});

describe('BrandSettingsPage warehouse list', () => {
  it('shows the empty state and the review note', async () => {
    renderSettings([brandsMock(), warehousesMock()]);
    expect(
      await screen.findByText(/No warehouses yet — add the location your products ship from/),
    ).toBeTruthy();
    expect(screen.getByText(/is reviewed by the Duncit team/)).toBeTruthy();
  });

  it('renders a warehouse with its address, default and approval state', async () => {
    renderSettings([brandsMock(), warehousesMock([warehouse({ is_default: true })])]);
    expect(await screen.findByText('Delhi warehouse')).toBeTruthy();
    expect(
      screen.getByText('12 Industrial Area, Phase 2, New Delhi, Delhi, 110020'),
    ).toBeTruthy();
    expect(screen.getByText('Default')).toBeTruthy();
    expect(screen.getByText('Approved')).toBeTruthy();
    expect(screen.queryByText('Awaiting approval')).toBeNull();
  });

  it('flags a warehouse still awaiting approval, with the reason', async () => {
    renderSettings([brandsMock(), warehousesMock([warehouse({ review_status: 'PENDING' })])]);
    expect(await screen.findByText('Awaiting approval')).toBeTruthy();
    expect(
      screen.getByText(/Products cannot ship from this warehouse until the Duncit team approves it/),
    ).toBeTruthy();
    expect(screen.queryByText('Default')).toBeNull();
  });
});

describe('BrandSettingsPage warehouse dialog', () => {
  it('opens an empty New warehouse form from Add warehouse', async () => {
    renderSettings([brandsMock(), warehousesMock()]);
    fireEvent.click(await screen.findByRole('button', { name: 'Add warehouse' }));
    expect(await screen.findByText('New warehouse')).toBeTruthy();
    expect((screen.getByLabelText(/Warehouse name/) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText(/^Country/) as HTMLInputElement).value).toBe('India');
  });

  it('opens a prefilled Edit warehouse form and closes again', async () => {
    renderSettings([brandsMock(), warehousesMock([warehouse()])]);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Delhi warehouse' }));
    expect(await screen.findByText('Edit warehouse')).toBeTruthy();
    expect((screen.getByLabelText(/Warehouse name/) as HTMLInputElement).value).toBe(
      'Delhi warehouse',
    );
    expect((screen.getByLabelText(/Pincode/) as HTMLInputElement).value).toBe('110020');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText('Edit warehouse')).toBeNull());
  });

  it('saves an edited warehouse with owner_kind BRAND and the existing id', async () => {
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
    fireEvent.change(await screen.findByLabelText(/Warehouse name/), {
      target: { value: 'Delhi hub' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save warehouse' }));

    expect(await screen.findByText('Warehouse saved.')).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('Edit warehouse')).toBeNull());
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
      result: { errors: [new GraphQLError('A warehouse with that name already exists')] },
    };
    renderSettings([brandsMock(), warehousesMock([warehouse()]), saveMock]);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit Delhi warehouse' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Save warehouse' }));

    expect(await screen.findByText('A warehouse with that name already exists')).toBeTruthy();
    expect(screen.getByText('Edit warehouse')).toBeTruthy();
  });

  it('refuses to save an invalid pincode', async () => {
    renderSettings([brandsMock(), warehousesMock([warehouse()])]);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Delhi warehouse' }));
    fireEvent.change(await screen.findByLabelText(/Pincode/), { target: { value: '110' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save warehouse' }));

    expect(await screen.findByText('Enter a valid 6-digit pincode')).toBeTruthy();
    expect(screen.queryByText('Warehouse saved.')).toBeNull();
  });
});

describe('BrandSettingsPage delete and default', () => {
  it('confirms before deleting and reports the deletion', async () => {
    const deleteMock: MockedResponse = {
      request: { query: DELETE_MY_WAREHOUSE, variables: { brand_doc_id: BRAND_ID, id: 'w1' } },
      result: { data: { deleteMyBrandPickupLocation: true } },
    };
    renderSettings([brandsMock(), warehousesMock([warehouse()]), deleteMock]);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete Delhi warehouse' }));
    expect(
      await screen.findByText(
        'Delhi warehouse will be removed. Products still shipping from it must be moved first.',
      ),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Warehouse deleted.')).toBeTruthy();
  });

  it('reports why a deletion was refused and keeps the warehouse listed', async () => {
    const deleteMock: MockedResponse = {
      request: { query: DELETE_MY_WAREHOUSE, variables: { brand_doc_id: BRAND_ID, id: 'w1' } },
      result: { errors: [new GraphQLError('Products still ship from this warehouse')] },
    };
    renderSettings([brandsMock(), warehousesMock([warehouse()]), deleteMock]);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete Delhi warehouse' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Products still ship from this warehouse')).toBeTruthy();
    expect(screen.getByText('Delhi warehouse')).toBeTruthy();
  });

  it('abandons the deletion on Cancel without calling the mutation', async () => {
    renderSettings([brandsMock(), warehousesMock([warehouse()])]);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Delhi warehouse' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText('Delete warehouse')).toBeNull());
    expect(screen.queryByText('Warehouse deleted.')).toBeNull();
  });

  it('promotes a warehouse to default and names it in the confirmation', async () => {
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

    fireEvent.click(await screen.findByRole('button', { name: 'Make Delhi warehouse default' }));
    expect(
      await screen.findByText('Delhi warehouse is now the default warehouse.'),
    ).toBeTruthy();
  });

  it('cannot re-promote the warehouse that is already default', async () => {
    renderSettings([brandsMock(), warehousesMock([warehouse({ is_default: true })])]);
    const button = await screen.findByRole('button', { name: 'Make Delhi warehouse default' });
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('reports a failed set-default without crashing the page', async () => {
    const defaultMock: MockedResponse = {
      request: {
        query: SET_DEFAULT_MY_WAREHOUSE,
        variables: { brand_doc_id: BRAND_ID, id: 'w1' },
      },
      result: { errors: [new GraphQLError('Warehouse is not registered yet')] },
    };
    renderSettings([brandsMock(), warehousesMock([warehouse()]), defaultMock]);

    fireEvent.click(await screen.findByRole('button', { name: 'Make Delhi warehouse default' }));
    expect(await screen.findByText('Warehouse is not registered yet')).toBeTruthy();
    expect(screen.getByText('Delhi warehouse')).toBeTruthy();
  });
});
