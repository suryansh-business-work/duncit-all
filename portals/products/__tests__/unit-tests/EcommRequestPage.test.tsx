import { describe, expect, it } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import BrandRequestPage from '../../src/pages/ecomm/ecomm-requests/BrandRequestPage';
import ProductRequestPage from '../../src/pages/ecomm/ecomm-requests/ProductRequestPage';
import {
  MY_ECOMM_CHANGE_REQUESTS,
  REQUEST_BRANDS,
  REQUEST_PRODUCTS,
  SUBMIT_ECOMM_CHANGE,
} from '../../src/pages/ecomm/ecomm-requests/queries';
import { renderWithProviders } from './testkit';

const brand = { id: 'b1', brand_name: 'Acme', tagline: 'Old', description: '', website_url: '' };
const product = {
  id: 'p1',
  product_name: 'Mug',
  short_description: 'Nice',
  description: '',
  selling_price: 100,
};

const brandsMock: MockedResponse = {
  request: { query: REQUEST_BRANDS },
  result: { data: { marketplaceBrands: [brand] } },
  maxUsageCount: 10,
};
const productsMock: MockedResponse = {
  request: { query: REQUEST_PRODUCTS },
  result: { data: { inventoryProducts: [product] } },
  maxUsageCount: 10,
};
const changeReqMock = (kind: string): MockedResponse => ({
  request: { query: MY_ECOMM_CHANGE_REQUESTS, variables: { kind } },
  result: { data: { myEcommChangeRequests: [] } },
  maxUsageCount: 10,
});
const submitMock = (fail = false): MockedResponse => ({
  request: { query: SUBMIT_ECOMM_CHANGE },
  variableMatcher: () => true,
  result: fail
    ? { errors: [{ message: 'submit failed' }] }
    : { data: { submitEcommChangeRequest: { id: 'cr1', status: 'PENDING' } } },
  maxUsageCount: 10,
});

const selectEntity = async (label: string, option: string) => {
  fireEvent.mouseDown(screen.getByLabelText(label));
  const listbox = await screen.findByRole('listbox');
  fireEvent.click(within(listbox).getByText(option));
};

describe('BrandRequestPage / EcommRequestPage', () => {
  it('submits a brand change request after editing a field', async () => {
    renderWithProviders(<BrandRequestPage />, {
      mocks: [brandsMock, changeReqMock('BRAND'), submitMock()],
    });
    expect(screen.getByText('Brand Request')).toBeInTheDocument();
    await selectEntity('Choose a brand', 'Acme');
    // The brand name field is now seeded from the selected brand.
    const nameField = await screen.findByLabelText('Brand name');
    fireEvent.change(nameField, { target: { value: 'Acme Renamed' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit change request/i }));
    await waitFor(() =>
      expect(screen.getByText(/Change request submitted for approval/i)).toBeInTheDocument(),
    );
  });

  it('warns when submitting with no field changes', async () => {
    renderWithProviders(<BrandRequestPage />, {
      mocks: [brandsMock, changeReqMock('BRAND')],
    });
    await selectEntity('Choose a brand', 'Acme');
    await screen.findByLabelText('Brand name');
    fireEvent.click(screen.getByRole('button', { name: /Submit change request/i }));
    await waitFor(() =>
      expect(screen.getByText(/Change at least one field/i)).toBeInTheDocument(),
    );
  });

  it('surfaces a submit error', async () => {
    renderWithProviders(<BrandRequestPage />, {
      mocks: [brandsMock, changeReqMock('BRAND'), submitMock(true)],
    });
    await selectEntity('Choose a brand', 'Acme');
    const nameField = await screen.findByLabelText('Brand name');
    fireEvent.change(nameField, { target: { value: 'Acme X' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit change request/i }));
    await waitFor(() => expect(screen.getByText('submit failed')).toBeInTheDocument());
  });
});

describe('ProductRequestPage', () => {
  it('submits a numeric price change', async () => {
    renderWithProviders(<ProductRequestPage />, {
      mocks: [productsMock, changeReqMock('PRODUCT'), submitMock()],
    });
    expect(screen.getByText('Product Request')).toBeInTheDocument();
    await selectEntity('Choose a product', 'Mug');
    const priceField = await screen.findByLabelText(/Selling price/i);
    fireEvent.change(priceField, { target: { value: '150' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit change request/i }));
    await waitFor(() =>
      expect(screen.getByText(/Change request submitted for approval/i)).toBeInTheDocument(),
    );
  });
});
