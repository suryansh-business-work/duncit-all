import { describe, expect, it } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import BrandRequestPage from '../../src/pages/ecomm/ecomm-requests/BrandRequestPage';
import ProductRequestPage from '../../src/pages/ecomm/ecomm-requests/ProductRequestPage';
import { renderWithProviders } from '../testkit';
import {
  makeRequestableBrand,
  myEcommChangeRequestsMock,
  requestBrandsMock,
  requestProductsMock,
  submitEcommChangeMock,
} from '../mocks/changeRequest.mock';

const selectEntity = async (label: string, option: string) => {
  fireEvent.mouseDown(screen.getByLabelText(label));
  const listbox = await screen.findByRole('listbox');
  fireEvent.click(within(listbox).getByText(option));
};

describe('BrandRequestPage / EcommRequestPage', () => {
  it('submits a brand change request after editing a field', async () => {
    renderWithProviders(<BrandRequestPage />, {
      mocks: [requestBrandsMock(), myEcommChangeRequestsMock('BRAND'), submitEcommChangeMock()],
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
    // Dismissing the notice covers the Snackbar onClose handler.
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByText(/Change request submitted for approval/i)).not.toBeInTheDocument(),
    );
  });

  it('warns when submitting with no field changes', async () => {
    renderWithProviders(<BrandRequestPage />, {
      mocks: [requestBrandsMock(), myEcommChangeRequestsMock('BRAND')],
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
      mocks: [
        requestBrandsMock(),
        myEcommChangeRequestsMock('BRAND'),
        submitEcommChangeMock({ fail: true }),
      ],
    });
    await selectEntity('Choose a brand', 'Acme');
    const nameField = await screen.findByLabelText('Brand name');
    fireEvent.change(nameField, { target: { value: 'Acme X' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit change request/i }));
    await waitFor(() => expect(screen.getByText('submit failed')).toBeInTheDocument());
  });

  it('falls back to a blank label when the chosen brand has no name', async () => {
    renderWithProviders(<BrandRequestPage />, {
      mocks: [
        requestBrandsMock([makeRequestableBrand({ id: 'b9', brand_name: null as unknown as string })]),
        myEcommChangeRequestsMock('BRAND'),
        submitEcommChangeMock(),
      ],
    });
    // The nameless option is still selectable by its (empty) value.
    fireEvent.mouseDown(screen.getByLabelText('Choose a brand'));
    const listbox = await screen.findByRole('listbox');
    const options = within(listbox).getAllByRole('option');
    // Index 0 is the "Select…" placeholder; index 1 is the nameless brand.
    fireEvent.click(options[1]);
    const nameField = await screen.findByLabelText('Brand name');
    fireEvent.change(nameField, { target: { value: 'Named Now' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit change request/i }));
    await waitFor(() =>
      expect(screen.getByText(/Change request submitted for approval/i)).toBeInTheDocument(),
    );
  });
});

describe('ProductRequestPage', () => {
  it('submits a numeric price change', async () => {
    renderWithProviders(<ProductRequestPage />, {
      mocks: [requestProductsMock(), myEcommChangeRequestsMock('PRODUCT'), submitEcommChangeMock()],
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
