import { fireEvent, render, screen, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BrandWarehousesPage from '..';
import { MY_BRAND_OPTIONS, MY_BRAND_WAREHOUSES, SYNC_MY_BRAND_WAREHOUSES } from '../queries';

const openPartnerPortal = vi.fn();
vi.mock('../../studio-options/openPartnerPortal', () => ({
  openPartnerPortal: (path: string) => openPartnerPortal(path),
}));

const warehouse = (id: string, over: Record<string, unknown> = {}) => ({
  __typename: 'BrandPickupLocation',
  id,
  nickname: `WH ${id}`,
  contact_name: 'Asha',
  phone: '9845012345',
  address_line1: '12 MG Road',
  address_line2: '',
  city: 'Pune',
  state: 'MH',
  pincode: '411001',
  is_default: false,
  review_status: 'APPROVED',
  shiprocket_registered: true,
  shiprocket_error: '',
  ...over,
});

const brandsMock = (brands: Array<{ id: string; brand_name: string }>): MockedResponse => ({
  request: { query: MY_BRAND_OPTIONS },
  result: { data: { myEcommBrands: brands.map((b) => ({ __typename: 'EcommBrand', ...b })) } },
});
const listMock = (brandId: string, rows: unknown[]): MockedResponse => ({
  request: { query: MY_BRAND_WAREHOUSES, variables: { brandId } },
  result: { data: { myBrandPickupLocations: rows } },
});
const syncMock = (brandId: string, result: Record<string, unknown>): MockedResponse => ({
  request: { query: SYNC_MY_BRAND_WAREHOUSES, variables: { brandId } },
  result: {
    data: { syncMyBrandPickupLocations: { __typename: 'BrandPickupSync', synced_at: 'now', warehouses: [], ...result } },
  },
});

function renderPage(mocks: MockedResponse[]) {
  return render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <MemoryRouter initialEntries={['/products/warehouses']}>
        <BrandWarehousesPage />
      </MemoryRouter>
    </MockedProvider>,
  );
}

afterEach(() => vi.clearAllMocks());

describe('BrandWarehousesPage', () => {
  it('lists the brand’s warehouses with their default, review and ShipRocket standing', async () => {
    renderPage([
      brandsMock([{ id: 'b1', brand_name: 'Paws' }]),
      listMock('b1', [
        warehouse('w1', { is_default: true }),
        warehouse('w2', { review_status: 'PENDING', shiprocket_error: 'Awaiting phone verification in ShipRocket' }),
        warehouse('w3', { shiprocket_registered: false }),
      ]),
    ]);
    const main = await screen.findByTestId('brand-warehouse-w1');
    expect(within(main).getByText('Default')).toBeInTheDocument();
    expect(main).toHaveTextContent('12 MG Road, Pune, MH, 411001');
    expect(screen.getByTestId('brand-warehouse-shiprocket-w1')).toHaveTextContent('Registered with ShipRocket');
    expect(screen.getByTestId('brand-warehouse-review-w2')).toHaveTextContent('Awaiting approval');
    expect(screen.getByTestId('brand-warehouse-shiprocket-w2')).toHaveTextContent('Awaiting verification in ShipRocket');
    expect(screen.getByTestId('brand-warehouse-error-w2')).toHaveTextContent('phone verification');
    expect(screen.getByTestId('brand-warehouse-shiprocket-w3')).toHaveTextContent('Not in ShipRocket');
    // One brand needs no picker.
    expect(screen.queryByTestId('brand-warehouses-brand')).toBeNull();
  });

  it('syncs with ShipRocket: the list takes in what it found, and says how many', async () => {
    renderPage([
      brandsMock([{ id: 'b1', brand_name: 'Paws' }]),
      listMock('b1', [warehouse('w1')]),
      syncMock('b1', { shiprocket_error: '', adopted: 1, warehouses: [warehouse('w1'), warehouse('w9')] }),
    ]);
    fireEvent.click(await screen.findByTestId('brand-warehouses-sync'));
    expect(await screen.findByTestId('brand-warehouses-synced')).toHaveTextContent(
      'Synced with ShipRocket. 1 pickup address taken in from your ShipRocket account.',
    );
    expect(await screen.findByTestId('brand-warehouse-w9')).toBeInTheDocument();
  });

  it('says why ShipRocket could not be read', async () => {
    renderPage([
      brandsMock([{ id: 'b1', brand_name: 'Paws' }]),
      listMock('b1', [warehouse('w1')]),
      syncMock('b1', { shiprocket_error: 'Bad token', adopted: 0, warehouses: [warehouse('w1')] }),
    ]);
    fireEvent.click(await screen.findByTestId('brand-warehouses-sync'));
    expect(await screen.findByTestId('brand-warehouses-sync-error')).toHaveTextContent('ShipRocket could not be read: Bad token');
  });

  it('opens the Partner app to add or edit warehouses', async () => {
    renderPage([brandsMock([{ id: 'b1', brand_name: 'Paws' }]), listMock('b1', [])]);
    expect(await screen.findByTestId('brand-warehouses-empty')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('brand-warehouses-manage'));
    expect(openPartnerPortal).toHaveBeenCalledWith('/ecomm-brand/warehouses');
  });

  it('tells a partner with no brand so, with nothing to sync', async () => {
    renderPage([brandsMock([])]);
    expect(await screen.findByTestId('brand-warehouses-no-brands')).toBeInTheDocument();
    expect(screen.queryByTestId('brand-warehouses-sync')).toBeNull();
  });

  it('says why the brands did not load', async () => {
    renderPage([{ request: { query: MY_BRAND_OPTIONS }, error: new Error('Network down') }]);
    expect(await screen.findByTestId('brand-warehouses-error')).toHaveTextContent('Network down');
  });
});
