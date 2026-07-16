import { describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { Route } from 'react-router-dom';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import EcommBrandDetailPage from '../../src/pages/ecomm/EcommBrandDetailPage';
import { MARKETPLACE_BRANDS } from '../../src/pages/ecomm/queries';
import { renderWithProviders } from './testkit';

const nav = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => nav.fn,
}));
vi.mock('../../src/pages/ecomm/BrandProductsTable', () => ({
  default: () => <div>PRODUCTS TABLE</div>,
}));
vi.mock('../../src/pages/ecomm/BrandPickupPanel', () => ({
  default: () => <div>PICKUP PANEL</div>,
}));
vi.mock('@duncit/ui', () => ({ StatusChip: ({ status }: { status: string }) => <span>{status}</span> }));

const brandsMock = (rows: unknown[]): MockedResponse => ({
  request: { query: MARKETPLACE_BRANDS },
  variableMatcher: () => true,
  result: { data: { marketplaceBrands: rows } },
});

const brand = {
  id: 'b1',
  brand_name: 'Acme',
  logo_url: '',
  status: 'APPROVED',
  approved_product_count: 5,
  city: 'Pune',
  state: 'MH',
  contact_email: 'sales@acme.com',
  contact_phone: '',
};

const renderPage = (mocks: MockedResponse[]) =>
  renderWithProviders(<></>, {
    mocks,
    initialEntries: ['/ecomm/brands/b1'],
    routes: <Route path="/ecomm/brands/:brandId" element={<EcommBrandDetailPage />} />,
  });

describe('EcommBrandDetailPage', () => {
  it('renders the brand card, tables and back navigation', async () => {
    renderPage([brandsMock([brand])]);
    await waitFor(() => expect(screen.getByText('Acme')).toBeInTheDocument());
    expect(screen.getByText('5 approved products')).toBeInTheDocument();
    expect(screen.getByText('Pune, MH · sales@acme.com')).toBeInTheDocument();
    expect(screen.getByText('PRODUCTS TABLE')).toBeInTheDocument();
    expect(screen.getByText('PICKUP PANEL')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Back to brands/i }));
    expect(nav.fn).toHaveBeenCalledWith('/ecomm/brands');
  });

  it('falls back to dashes and a placeholder avatar when fields are missing', async () => {
    renderPage([
      brandsMock([
        {
          ...brand,
          brand_name: '',
          logo_url: 'http://img/l.png',
          city: '',
          state: '',
          contact_email: '',
          contact_phone: '',
        },
      ]),
    ]);
    await waitFor(() => expect(screen.getByText(/— · No contact/)).toBeInTheDocument());
  });

  it('shows a not-found message when the brand is not listed', async () => {
    renderPage([brandsMock([])]);
    await waitFor(() =>
      expect(screen.getByText(/Brand not found or not currently listed/i)).toBeInTheDocument(),
    );
  });
});
