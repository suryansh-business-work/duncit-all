import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, configure, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import BrandSettingsPage from './BrandSettingsPage';
import { MY_BRANDS } from '../queries';
import { DELETE_MY_WAREHOUSE, MY_BRAND_WAREHOUSES, MY_WAREHOUSE_USAGE, SAVE_MY_WAREHOUSE } from './warehouse.queries';
import { renderWithProviders } from '../../../__tests__/render';

configure({ asyncUtilTimeout: 5000 });
afterEach(cleanup);

const BRAND_ID = 'b1';

const brand = {
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
  is_active: true,
  reviewer_notes: '',
  submitted_at: null,
  approved_at: null,
};

const warehouse = {
  __typename: 'BrandPickupLocation',
  id: 'w1',
  owner_kind: 'BRAND',
  brand_id: BRAND_ID,
  review_status: 'APPROVED',
  nickname: 'Delhi warehouse',
  contact_name: 'Asha Rao',
  phone: '9876543210',
  email: 'asha@duncit.com',
  address_line1: '12 Industrial Area',
  address_line2: 'Phase 2',
  city: 'New Delhi',
  state: 'Delhi',
  pincode: '110020',
  country: 'India',
  is_default: false,
  is_active: true,
  shiprocket_registered: false,
  shiprocket_error: '',
  shiprocket_pickup_id: '',
  updated_at: '2026-07-01T00:00:00.000Z',
};

const brandsMock: MockedResponse = {
  request: { query: MY_BRANDS },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      me: { __typename: 'User', user_id: 'u1', full_name: 'Asha Rao', email: 'asha@duncit.com', roles: ['ECOMMERCE_BRAND'] },
      myEcommBrands: [brand],
    },
  },
};

const warehousesMock = (rows: unknown[]): MockedResponse => ({
  request: { query: MY_BRAND_WAREHOUSES, variables: { brand_doc_id: BRAND_ID } },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { myBrandPickupLocations: rows } },
});

const renderSettings = (mocks: MockedResponse[]) =>
  renderWithProviders(<BrandSettingsPage />, {
    mocks,
    route: `/ecomm-brand/${BRAND_ID}/settings`,
    path: '/ecomm-brand/:brandId/settings',
  });

const newWarehouseInput = {
  nickname: 'Pune hub',
  contact_name: 'Ravi Kumar',
  phone: '9123456780',
  email: 'ravi@duncit.com',
  address_line1: '4 Hinjewadi Phase 1',
  address_line2: '',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411057',
  country: 'India',
  is_default: true,
  owner_kind: 'BRAND',
};

describe('BrandSettingsPage adding a pickup address', () => {
  it('creates a new primary pickup address with no id, then lets the partner dismiss the confirmation', async () => {
    let sent: Record<string, unknown> | null = null;
    renderSettings([
      brandsMock,
      warehousesMock([]),
      {
        request: { query: SAVE_MY_WAREHOUSE, variables: { brand_doc_id: BRAND_ID, id: null, input: newWarehouseInput } },
        result: (variables) => {
          sent = variables as Record<string, unknown>;
          return {
            data: {
              saveMyBrandPickupLocation: {
                ...warehouse,
                id: 'w2',
                nickname: 'Pune hub',
                review_status: 'PENDING',
                is_default: true,
              },
            },
          };
        },
      },
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'Add pickup address' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('New pickup address')).toBeTruthy();
    fireEvent.change(within(dialog).getByLabelText(/Address nickname/), { target: { value: 'Pune hub' } });
    fireEvent.change(within(dialog).getByLabelText(/Contact name/), { target: { value: 'Ravi Kumar' } });
    fireEvent.change(within(dialog).getByLabelText(/Phone/), { target: { value: '9123456780' } });
    fireEvent.change(within(dialog).getByLabelText(/Email/), { target: { value: 'ravi@duncit.com' } });
    fireEvent.change(within(dialog).getByLabelText(/Address line 1/), { target: { value: '4 Hinjewadi Phase 1' } });
    fireEvent.change(within(dialog).getByLabelText(/City/), { target: { value: 'Pune' } });
    fireEvent.change(within(dialog).getByLabelText(/State/), { target: { value: 'Maharashtra' } });
    fireEvent.change(within(dialog).getByLabelText(/Pincode/), { target: { value: '411057' } });

    const makeDefault = within(dialog).getByRole('switch', { name: 'Use as the primary pickup address for this brand' });
    expect((makeDefault as HTMLInputElement).checked).toBe(false);
    fireEvent.click(makeDefault);
    expect((makeDefault as HTMLInputElement).checked).toBe(true);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save pickup address' }));

    expect(await screen.findByText('Pickup address saved.')).toBeTruthy();
    expect(sent).toEqual({ brand_doc_id: BRAND_ID, id: null, input: newWarehouseInput });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('Pickup address saved.')).toBeNull());
  });
});

describe('BrandSettingsPage delete dialog', () => {
  it('ignores a Delete click that lands while the cancelled dialog is closing', async () => {
    let deleted = false;
    renderSettings([
      brandsMock,
      warehousesMock([warehouse]),
      {
        // Nothing ships from it, so the dialog offers the deletion.
        request: { query: MY_WAREHOUSE_USAGE, variables: { brand_doc_id: BRAND_ID, id: 'w1' } },
        result: {
          data: { myBrandPickupLocationUsage: { __typename: 'BrandPickupUsage', count: 0, products: [] } },
        },
      },
      {
        request: { query: DELETE_MY_WAREHOUSE, variables: { brand_doc_id: BRAND_ID, id: 'w1' } },
        result: () => {
          deleted = true;
          return { data: { deleteMyBrandPickupLocation: true } };
        },
      },
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete Delhi warehouse' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByText('Delhi warehouse will be deleted. No product ships from it.');
    const confirm = within(dialog).getByRole('button', { name: 'Delete' });
    expect(confirm.hasAttribute('disabled')).toBe(false);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    // Still on screen while it fades out — a late click must not delete anything.
    fireEvent.click(confirm);

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(deleted).toBe(false);
    expect(screen.queryByText('Pickup address deleted.')).toBeNull();
    expect(screen.getByText('Delhi warehouse')).toBeTruthy();
  });
});

describe('BrandSettingsPage delete dialog when the usage check fails', () => {
  it('says what ships from the address could not be checked, and offers no way to confirm', async () => {
    renderSettings([
      brandsMock,
      warehousesMock([warehouse]),
      {
        request: { query: MY_WAREHOUSE_USAGE, variables: { brand_doc_id: BRAND_ID, id: 'w1' } },
        result: { errors: [new GraphQLError('Usage service is down')] },
      },
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete Delhi warehouse' }));
    const dialog = within(await screen.findByRole('dialog'));
    expect(await dialog.findByText(/Usage service is down/)).toBeTruthy();
    expect(dialog.getByTestId('pickup-removal-confirm').hasAttribute('disabled')).toBe(true);
  });
});

describe('BrandSettingsPage notices', () => {
  const deleteWith = (result: MockedResponse['result']): MockedResponse[] => [
    brandsMock,
    warehousesMock([warehouse]),
    {
      request: { query: MY_WAREHOUSE_USAGE, variables: { brand_doc_id: BRAND_ID, id: 'w1' } },
      result: { data: { myBrandPickupLocationUsage: { __typename: 'BrandPickupUsage', count: 0, products: [] } } },
    },
    { request: { query: DELETE_MY_WAREHOUSE, variables: { brand_doc_id: BRAND_ID, id: 'w1' } }, result },
  ];

  const deleteIt = async () => {
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Delhi warehouse' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByText('Delhi warehouse will be deleted. No product ships from it.');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
  };

  it('keeps a refusal on screen when the partner clicks elsewhere on the page', async () => {
    renderSettings(deleteWith({ errors: [new GraphQLError('Still used by a product')] }));
    await deleteIt();
    expect(await screen.findByText('Still used by a product')).toBeTruthy();
    fireEvent.click(document.body);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.getByText('Still used by a product')).toBeTruthy();
  });

  it('lets a click elsewhere dismiss a confirmation', async () => {
    renderSettings(deleteWith({ data: { deleteMyBrandPickupLocation: true } }));
    await deleteIt();
    expect(await screen.findByText('Pickup address deleted.')).toBeTruthy();
    fireEvent.click(document.body);
    await waitFor(() => expect(screen.queryByText('Pickup address deleted.')).toBeNull());
  });
});
