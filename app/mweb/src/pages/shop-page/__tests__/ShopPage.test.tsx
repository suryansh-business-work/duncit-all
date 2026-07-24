import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ShopPage from '../index';
import { SHOP_PRODUCTS } from '../queries';
import { SEARCH_CATEGORIES } from '../../search-page/queries';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

const product = (over: Record<string, unknown>) => ({
  __typename: 'Product',
  id: 'p',
  product_name: 'Item',
  brand_name: null,
  image_url: null,
  images: [],
  unit_cost: 10,
  category_id: null,
  super_category_id: null,
  sub_category_id: null,
  created_at: '2026-01-01T00:00:00.000Z',
  review_summary: { __typename: 'ProductReviewSummary', average_rating: 0, total: 0 },
  ...over,
});

const productsMock: MockedResponse = {
  request: { query: SHOP_PRODUCTS },
  result: {
    data: {
      availablePodProducts: [
        product({ id: 'p1', product_name: 'Banana', brand_name: 'Acme', unit_cost: 50, category_id: 'cat-1', image_url: 'http://x/a.jpg' }),
        product({ id: 'p2', product_name: 'Apple', brand_name: 'Zeta', unit_cost: 30, category_id: 'cat-2', images: ['http://x/b.jpg'] }),
        product({ id: 'p3', product_name: 'Cherry', brand_name: null, unit_cost: 70, category_id: 'cat-1' }),
      ],
    },
  },
};

const categoriesMock: MockedResponse = {
  request: { query: SEARCH_CATEGORIES },
  result: {
    data: {
      categories: [
        { __typename: 'Category', id: 'cat-1', name: 'Sports', slug: 'sports', icon: null, level: 'CATEGORY', parent_id: null },
        { __typename: 'Category', id: 'cat-2', name: 'Food', slug: 'food', icon: null, level: 'CATEGORY', parent_id: null },
      ],
    },
  },
};

function renderPage(mocks: MockedResponse[] = [productsMock, categoriesMock]) {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <MemoryRouter initialEntries={['/shop']}>
        <ShopPage />
      </MemoryRouter>
    </MockedProvider>,
  );
}

const grid = () => screen.getByText('Banana').closest('.MuiCard-root')!.parentElement!;

beforeEach(() => navigateMock.mockClear());

describe('ShopPage', () => {
  it('shows the loading spinner before data arrives', () => {
    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders the catalogue sorted by name (A–Z) by default', async () => {
    renderPage();
    expect(await screen.findByText('Banana')).toBeInTheDocument();
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Cherry')).toBeInTheDocument();
    // Header + brand names render
    expect(screen.getByText('Pod Shop')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
    // A–Z order: Apple before Banana in the grid
    const apple = screen.getByText('Apple');
    const banana = screen.getByText('Banana');
    expect(apple.compareDocumentPosition(banana) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('filters by the debounced search term', async () => {
    renderPage();
    await screen.findByText('Banana');
    fireEvent.change(screen.getByPlaceholderText('Search products or brands…'), { target: { value: 'apple' } });
    await waitFor(() => expect(screen.queryByText('Banana')).not.toBeInTheDocument());
    expect(screen.getByText('Apple')).toBeInTheDocument();
  });

  it('matches the brand name in search too', async () => {
    renderPage();
    await screen.findByText('Banana');
    fireEvent.change(screen.getByPlaceholderText('Search products or brands…'), { target: { value: 'zeta' } });
    await waitFor(() => expect(screen.queryByText('Cherry')).not.toBeInTheDocument());
    expect(screen.getByText('Apple')).toBeInTheDocument();
  });

  it('shows the empty state when nothing matches', async () => {
    renderPage();
    await screen.findByText('Banana');
    fireEvent.change(screen.getByPlaceholderText('Search products or brands…'), { target: { value: 'zzzznope' } });
    expect(await screen.findByText('No products match your filters.')).toBeInTheDocument();
  });

  it('filters by category chip selection', async () => {
    renderPage();
    await screen.findByText('Banana');
    fireEvent.click(screen.getByRole('button', { name: 'Sports' }));
    await waitFor(() => expect(screen.queryByText('Apple')).not.toBeInTheDocument());
    expect(screen.getByText('Banana')).toBeInTheDocument();
    expect(screen.getByText('Cherry')).toBeInTheDocument();
  });

  it('re-sorts by price ascending and descending', async () => {
    renderPage();
    await screen.findByText('Banana');
    const combo = screen.getByRole('combobox');
    fireEvent.mouseDown(combo);
    fireEvent.click(await screen.findByText('Price: low to high'));
    await waitFor(() => {
      const cards = within(grid()).getAllByText(/Apple|Banana|Cherry/);
      expect(cards[0]).toHaveTextContent('Apple'); // 30 cheapest
    });

    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(await screen.findByText('Price: high to low'));
    await waitFor(() => {
      const cards = within(grid()).getAllByText(/Apple|Banana|Cherry/);
      expect(cards[0]).toHaveTextContent('Cherry'); // 70 dearest
    });
  });

  it('navigates to the product detail page on tap', async () => {
    renderPage();
    await screen.findByText('Banana');
    fireEvent.click(screen.getByRole('button', { name: 'View Banana' }));
    expect(navigateMock).toHaveBeenCalledWith('/product/p1');
  });

  it('renders an error alert when the query fails', async () => {
    renderPage([
      { request: { query: SHOP_PRODUCTS }, error: new Error('boom') },
      categoriesMock,
    ]);
    expect(await screen.findByText('boom')).toBeInTheDocument();
  });
});
