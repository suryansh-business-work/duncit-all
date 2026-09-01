import { describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { Route } from 'react-router';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import BrandReviewDetailPage from '../../src/pages/ecomm/BrandReviewDetailPage';
import { renderWithProviders } from '../testkit';
import { ecommBrandMock, makeEcommBrand } from '../mocks/ecommBrand.mock';

const nav = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => nav.fn,
}));
vi.mock('../../src/pages/ecomm/BrandProductsTable', () => ({
  default: () => <div>PRODUCTS TABLE</div>,
}));
vi.mock('../../src/pages/ecomm/BrandPickupPanel', () => ({
  default: () => <div>PICKUP PANEL</div>,
}));
vi.mock('@duncit/ui', () => ({ StatusChip: ({ status }: { status: string }) => <span>{status}</span> }));

const renderPage = (mocks: MockedResponse[]) =>
  renderWithProviders(<></>, {
    mocks,
    initialEntries: ['/ecomm/brands/b1'],
    routes: <Route path="/ecomm/brands/:brandId" element={<BrandReviewDetailPage />} />,
  });

describe('BrandReviewDetailPage', () => {
  it('renders the brand card, tables and back navigation', async () => {
    renderPage([ecommBrandMock(makeEcommBrand())]);
    await waitFor(() => expect(screen.getByText('Acme')).toBeInTheDocument());
    expect(screen.getByText('5 approved products')).toBeInTheDocument();
    expect(screen.getByText('Pune, MH · sales@acme.com')).toBeInTheDocument();
    expect(screen.getByText('PRODUCTS TABLE')).toBeInTheDocument();
    expect(screen.getByText('PICKUP PANEL')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Back to Brands Review/i }));
    expect(nav.fn).toHaveBeenCalledWith('/ecomm/brands');
  });

  it('opens a brand that is still awaiting review', async () => {
    // The whole point of the fix: a SUBMITTED brand is approved-only invisible
    // to the marketplace queries, so this page must not use them.
    renderPage([ecommBrandMock(makeEcommBrand({ brand_name: 'Pending Co', status: 'SUBMITTED' }))]);
    await waitFor(() => expect(screen.getByText('Pending Co')).toBeInTheDocument());
    expect(screen.getByText('SUBMITTED')).toBeInTheDocument();
  });

  it('falls back to dashes and a placeholder avatar when fields are missing', async () => {
    renderPage([
      ecommBrandMock(
        makeEcommBrand({
          brand_name: '',
          logo_url: 'http://img/l.png',
          city: '',
          state: '',
          contact_email: '',
          contact_phone: '',
        }),
      ),
    ]);
    await waitFor(() => expect(screen.getByText(/— · No contact/)).toBeInTheDocument());
  });

  it('shows a not-found message when the brand does not exist', async () => {
    renderPage([ecommBrandMock(null)]);
    await waitFor(() => expect(screen.getByText(/Brand not found/i)).toBeInTheDocument());
  });
});
