import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import ListProductsPage from './ListProductsPage';
import type { ProductListingRow } from './queries';
import { PRODUCT_ACCESS_MESSAGE, PRODUCT_LISTING_ACCESS } from './productAccess';
import { ECOMM_MANAGER, accessMock } from '../../__tests__/groupB-fixtures';
import { renderWithProviders } from '../../__tests__/render';

const { stubRow } = vi.hoisted(() => {
  const row: ProductListingRow = { id: 'p1', product_name: 'Alpha Tee', listing_review_status: 'APPROVED' };
  return { stubRow: row };
});

// The ag-grid table has its own suites; the page hands it the brand, the
// permission and the three row callbacks.
vi.mock('./ProductListingsTable', () => ({
  default: ({
    brandId,
    canManageProducts,
    onEdit,
    onView,
    onSettings,
  }: Readonly<{
    brandId: string;
    canManageProducts: boolean;
    onEdit: (row: ProductListingRow) => void;
    onView: (row: ProductListingRow) => void;
    onSettings: (row: ProductListingRow) => void;
  }>) => (
    <div>
      <p>{`Listings of ${brandId} (${canManageProducts ? 'manageable' : 'read-only'})`}</p>
      <button type="button" onClick={() => onEdit(stubRow)}>Edit row</button>
      <button type="button" onClick={() => onView(stubRow)}>View row</button>
      <button type="button" onClick={() => onSettings(stubRow)}>Settings row</button>
    </div>
  ),
}));

afterEach(cleanup);

const renderPage = (mocks: MockedResponse[]) =>
  renderWithProviders(<ListProductsPage />, {
    mocks,
    path: '/ecomm-brand/:brandId/products',
    route: '/ecomm-brand/b1/products',
  });

describe('ListProductsPage', () => {
  it('lets an Ecomm Manager add products and manage the brand listings', async () => {
    renderPage([accessMock([ECOMM_MANAGER])]);

    expect(screen.getByRole('heading', { level: 1, name: 'Brand products' })).toBeTruthy();
    expect(await screen.findByText('Listings of b1 (manageable)')).toBeTruthy();
    const add = screen.getByRole('link', { name: 'Add Product' });
    expect(add.getAttribute('href')).toBe('/ecomm-brand/b1/products/new');
    expect(screen.queryByText(PRODUCT_ACCESS_MESSAGE)).toBeNull();
  });

  it('locks adding for a partner without the role and says why', async () => {
    renderPage([accessMock(['VENUE_MANAGER'])]);

    expect(await screen.findByText(PRODUCT_ACCESS_MESSAGE)).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Add Product' })).toBeNull();
    expect((screen.getByRole('button', { name: 'Add Product' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Listings of b1 (read-only)')).toBeTruthy();
  });

  it('does not warn about access while the role check is still running', () => {
    renderPage([accessMock([ECOMM_MANAGER])]);
    expect(screen.queryByText(PRODUCT_ACCESS_MESSAGE)).toBeNull();
  });

  it('reports a failed role check', async () => {
    renderPage([{ request: { query: PRODUCT_LISTING_ACCESS }, result: { errors: [new GraphQLError('Session expired')] } }]);
    expect(await screen.findByText('Session expired')).toBeTruthy();
    expect(screen.getByText(PRODUCT_ACCESS_MESSAGE)).toBeTruthy();
  });

  it('routes each row action to its own screen', async () => {
    renderPage([accessMock([ECOMM_MANAGER])]);
    await screen.findByText('Listings of b1 (manageable)');

    fireEvent.click(screen.getByRole('button', { name: 'Edit row' }));
    expect(screen.getByTestId('location').textContent).toBe('/ecomm-brand/b1/products/p1');
  });

  it('opens the detail view of a row', async () => {
    renderPage([accessMock([ECOMM_MANAGER])]);
    fireEvent.click(await screen.findByRole('button', { name: 'View row' }));
    expect(screen.getByTestId('location').textContent).toBe('/ecomm-brand/b1/products/p1/view');
  });

  it('opens the settings of a row', async () => {
    renderPage([accessMock([ECOMM_MANAGER])]);
    fireEvent.click(await screen.findByRole('button', { name: 'Settings row' }));
    expect(screen.getByTestId('location').textContent).toBe('/ecomm-brand/b1/products/p1/settings');
  });

  it('goes back to the brands list', async () => {
    renderPage([accessMock([ECOMM_MANAGER])]);
    fireEvent.click(await screen.findByRole('button', { name: 'Back to brands' }));
    expect(screen.getByTestId('location').textContent).toBe('/ecomm-brand');
  });
});
