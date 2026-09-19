import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import ProductDetailPage from './ProductDetailPage';
import { MY_PRODUCT_LISTINGS } from './queries';
import { PRODUCT_ACCESS_MESSAGE, PRODUCT_LISTING_ACCESS } from './productAccess';
import { ECOMM_MANAGER, accessMock, listingRow, listingsMock } from '../../__tests__/groupB-fixtures';
import { renderWithProviders } from '../../__tests__/render';

// The analytics and reviews panels run their own queries and have their own
// suites; here they only need to show which product they were handed.
vi.mock('./ProductAnalyticsPanel', () => ({
  default: ({ productId }: Readonly<{ productId: string }>) => <p>{`Analytics for ${productId}`}</p>,
}));
vi.mock('./ProductReviewsPanel', () => ({
  default: ({ productId }: Readonly<{ productId: string }>) => <p>{`Reviews for ${productId}`}</p>,
}));

afterEach(cleanup);

const VIEW_PATH = '/ecomm-brand/:brandId/products/:productId/view';
const VIEW_URL = '/ecomm-brand/b1/products/p1/view';

const renderPage = (mocks: MockedResponse[], stateProduct?: Record<string, unknown>) =>
  renderWithProviders(<ProductDetailPage />, {
    mocks,
    path: VIEW_PATH,
    route: { pathname: VIEW_URL, state: stateProduct ? { product: stateProduct } : null },
  });

describe('ProductDetailPage', () => {
  it('shows a labelled spinner while the access check is in flight', () => {
    renderPage([accessMock([ECOMM_MANAGER])], listingRow());
    expect(screen.getByRole('progressbar', { name: 'Loading…' })).toBeTruthy();
  });

  it('renders the row handed over by the table without refetching the brand list', async () => {
    // No listings mock: if the fallback query ran it would error out.
    renderPage([accessMock([ECOMM_MANAGER])], listingRow({ product_name: 'Beta Cap' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Beta Cap' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Beta Cap' })).toBeTruthy();
    expect(screen.getByText('Analytics for p1')).toBeTruthy();
    expect(screen.getByText('Reviews for p1')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('falls back to the brand listing list and picks the product by id', async () => {
    renderPage([
      accessMock([ECOMM_MANAGER]),
      listingsMock([listingRow({ id: 'p0', product_name: 'Other Tee' }), listingRow({ product_name: 'Gamma Mug' })]),
    ]);

    expect(await screen.findByRole('heading', { level: 1, name: 'Gamma Mug' })).toBeTruthy();
    expect(screen.queryByText('Other Tee')).toBeNull();
  });

  it('says so when the product is not in the brand', async () => {
    renderPage([accessMock([ECOMM_MANAGER]), listingsMock([listingRow({ id: 'p0' })])]);

    expect(await screen.findByText('Product listing was not found.')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'Product listing' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
  });

  it('opens the editor with the product in router state', async () => {
    renderPage([accessMock([ECOMM_MANAGER])], listingRow());

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(screen.getByTestId('location').textContent).toBe('/ecomm-brand/b1/products/p1');
  });

  it('goes back to the brand product list', async () => {
    renderPage([accessMock([ECOMM_MANAGER])], listingRow());

    fireEvent.click(await screen.findByRole('button', { name: 'Back' }));
    expect(screen.getByTestId('location').textContent).toBe('/ecomm-brand/b1/products');
  });

  it('keeps a partner without the Ecomm Manager role out of the details', async () => {
    renderPage([accessMock(['VENUE_MANAGER'])], listingRow());

    expect(await screen.findByText(PRODUCT_ACCESS_MESSAGE)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(screen.queryByText('Analytics for p1')).toBeNull();
  });

  it('reports a failed access check and a failed listing fetch', async () => {
    renderPage([
      {
        request: { query: PRODUCT_LISTING_ACCESS },
        result: { errors: [new GraphQLError('Session expired')] },
      },
      {
        request: { query: MY_PRODUCT_LISTINGS, variables: { brand_id: 'b1' } },
        result: { errors: [new GraphQLError('Listings are unavailable')] },
      },
    ]);

    expect(await screen.findByText('Session expired')).toBeTruthy();
    expect(await screen.findByText('Listings are unavailable')).toBeTruthy();
    expect(screen.getByText(PRODUCT_ACCESS_MESSAGE)).toBeTruthy();
  });
});
