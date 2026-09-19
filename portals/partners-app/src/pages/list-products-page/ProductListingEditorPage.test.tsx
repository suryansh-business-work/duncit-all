import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import ProductListingEditorPage from './ProductListingEditorPage';
import { MY_PRODUCT_LISTINGS } from './queries';
import { PRODUCT_ACCESS_MESSAGE, PRODUCT_LISTING_ACCESS } from './productAccess';
import { ECOMM_MANAGER, accessMock, listingRow, listingsMock } from '../../__tests__/groupB-fixtures';
import { renderWithProviders } from '../../__tests__/render';

// The wizard and the reviews panel have their own suites; the page decides
// WHICH product (if any) they get and where a save leads.
vi.mock('./list-products', () => ({
  ListProductsForm: ({
    brandId,
    product,
    onSaved,
  }: Readonly<{ brandId: string; product: { product_name: string } | null; onSaved: () => void }>) => (
    <div>
      <p>{`Form for ${brandId}: ${product ? product.product_name : 'new product'}`}</p>
      <button type="button" onClick={onSaved}>
        Finish saving
      </button>
    </div>
  ),
}));
vi.mock('./ProductReviewsPanel', () => ({
  default: ({ productId }: Readonly<{ productId: string }>) => <p>{`Reviews for ${productId}`}</p>,
}));

afterEach(cleanup);

const EDIT_PATH = '/ecomm-brand/:brandId/products/:productId';
const NEW_PATH = '/ecomm-brand/:brandId/products/new';

const renderEditor = (mocks: MockedResponse[], stateProduct?: Record<string, unknown>) =>
  renderWithProviders(<ProductListingEditorPage />, {
    mocks,
    path: EDIT_PATH,
    route: { pathname: '/ecomm-brand/b1/products/p1', state: stateProduct ? { product: stateProduct } : null },
  });

const renderNew = (mocks: MockedResponse[]) =>
  renderWithProviders(<ProductListingEditorPage />, { mocks, path: NEW_PATH, route: '/ecomm-brand/b1/products/new' });

describe('ProductListingEditorPage — new product', () => {
  it('shows a labelled spinner while the access check is in flight', () => {
    renderNew([accessMock([ECOMM_MANAGER])]);
    expect(screen.getByRole('progressbar', { name: 'Loading…' })).toBeTruthy();
  });

  it('opens a blank wizard without fetching any listing', async () => {
    renderNew([accessMock([ECOMM_MANAGER])]);

    expect(await screen.findByText('Form for b1: new product')).toBeTruthy();
    expect(screen.getByText('New product')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'Add Product' })).toBeTruthy();
    expect(screen.queryByText(/Reviews for/)).toBeNull();
  });

  it('returns to the product list once the wizard saves, replacing the editor in history', async () => {
    renderNew([accessMock([ECOMM_MANAGER])]);

    fireEvent.click(await screen.findByRole('button', { name: 'Finish saving' }));
    expect(screen.getByTestId('location').textContent).toBe('/ecomm-brand/b1/products');
  });

  it('keeps a partner without the Ecomm Manager role out of the wizard', async () => {
    renderNew([accessMock(['VENUE_MANAGER'])]);

    expect(await screen.findByText(PRODUCT_ACCESS_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(/Form for/)).toBeNull();
  });

  it('reports a failed access check', async () => {
    renderNew([{ request: { query: PRODUCT_LISTING_ACCESS }, result: { errors: [new GraphQLError('Session expired')] } }]);
    expect(await screen.findByText('Session expired')).toBeTruthy();
    expect(screen.getByText(PRODUCT_ACCESS_MESSAGE)).toBeTruthy();
  });
});

describe('ProductListingEditorPage — editing', () => {
  it('edits the row handed over by the table, with its reviews below', async () => {
    renderEditor([accessMock([ECOMM_MANAGER])], listingRow({ product_name: 'Beta Cap' }));

    expect(await screen.findByText('Form for b1: Beta Cap')).toBeTruthy();
    expect(screen.getByText('Edit product')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'Beta Cap' })).toBeTruthy();
    expect(screen.getByText('Reviews for p1')).toBeTruthy();
  });

  it('loads the product from the brand listing list on a direct visit', async () => {
    renderEditor([accessMock([ECOMM_MANAGER]), listingsMock([listingRow({ product_name: 'Gamma Mug' })])]);

    expect(screen.getByRole('progressbar', { name: 'Loading…' })).toBeTruthy();
    expect(await screen.findByText('Form for b1: Gamma Mug')).toBeTruthy();
  });

  it('says so when the product is not in the brand', async () => {
    renderEditor([accessMock([ECOMM_MANAGER]), listingsMock([listingRow({ id: 'p0' })])]);

    expect(await screen.findByText('Product listing was not found.')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'Product listing' })).toBeTruthy();
    expect(screen.queryByText(/Form for/)).toBeNull();
    expect(screen.queryByText(/Reviews for/)).toBeNull();
  });

  it('hides the reviews from a partner without the Ecomm Manager role', async () => {
    renderEditor([accessMock(['VENUE_MANAGER'])], listingRow());

    expect(await screen.findByText(PRODUCT_ACCESS_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(/Reviews for/)).toBeNull();
  });

  it('reports a failed listing fetch', async () => {
    renderEditor([
      accessMock([ECOMM_MANAGER]),
      {
        request: { query: MY_PRODUCT_LISTINGS, variables: { brand_id: 'b1' } },
        result: { errors: [new GraphQLError('Listings are unavailable')] },
      },
    ]);

    expect(await screen.findByText('Listings are unavailable')).toBeTruthy();
    expect(screen.getByText('Product listing was not found.')).toBeTruthy();
  });

  it('goes back to the brand product list', async () => {
    renderEditor([accessMock([ECOMM_MANAGER])], listingRow());

    fireEvent.click(await screen.findByRole('button', { name: 'Back' }));
    expect(screen.getByTestId('location').textContent).toBe('/ecomm-brand/b1/products');
  });
});
