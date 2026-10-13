import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
import ShopPage from '../index';
import { SHOP_PRODUCTS } from '../queries';
import { PODS_FOR_PRODUCT } from '../../ProductDetailPage';
import { SEARCH_CATEGORIES } from '../../search-page/queries';
import { CartProvider } from '../../../components/cart/CartContext';

const navigateMock = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
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
  pod_available_count: 5,
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
        { __typename: 'Category', id: 'sup-sports', name: 'Sports', slug: 'sports', icon: null, level: 'SUPER', parent_id: null },
        { __typename: 'Category', id: 'sup-food', name: 'Food', slug: 'food', icon: null, level: 'SUPER', parent_id: null },
        { __typename: 'Category', id: 'cat-1', name: 'Rackets', slug: 'rackets', icon: null, level: 'CATEGORY', parent_id: 'sup-sports' },
        { __typename: 'Category', id: 'cat-2', name: 'Snacks', slug: 'snacks', icon: null, level: 'CATEGORY', parent_id: 'sup-food' },
      ],
    },
  },
};

function renderPage(mocks: MockedResponse[] = [productsMock, categoriesMock]) {
  return render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <CartProvider>
        <MemoryRouter initialEntries={['/shop']}>
          <ShopPage />
        </MemoryRouter>
      </CartProvider>
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
    fireEvent.click(screen.getByLabelText('Filters'));
    fireEvent.click(screen.getByRole('button', { name: 'Sports' }));
    await waitFor(() => expect(screen.queryByText('Apple')).not.toBeInTheDocument());
    expect(screen.getByText('Banana')).toBeInTheDocument();
    expect(screen.getByText('Cherry')).toBeInTheDocument();
  });

  it('re-sorts by price ascending and descending', async () => {
    renderPage();
    await screen.findByText('Banana');
    fireEvent.click(screen.getByLabelText('Filters'));
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
    // A friendly message, never the raw error text.
    expect(await screen.findByText('Could not load the shop. Please try again.')).toBeInTheDocument();
    expect(screen.queryByText('boom')).toBeNull();
  });

  it('retries a failed load and shows the catalogue once it succeeds', async () => {
    renderPage([
      { request: { query: SHOP_PRODUCTS }, error: new Error('boom') },
      categoriesMock,
      productsMock,
    ]);
    fireEvent.click(await screen.findByTestId('shop-error-retry'));
    expect(await screen.findByText('Banana')).toBeInTheDocument();
    expect(screen.queryByTestId('shop-error')).toBeNull();
  });

  describe('cart control on a card', () => {
    const CART_KEY = 'mweb_cart_lines';
    const storedCart = () => JSON.parse(localStorage.getItem(CART_KEY) ?? '[]');
    const line = (over: Record<string, unknown> = {}) => ({
      pod_id: 'pod-1',
      pod_title: 'Pod One',
      club_slug: 'club',
      product_id: 'p1',
      variant_id: '',
      variant_label: '',
      product_name: 'Banana',
      image_url: '',
      unit_cost: 50,
      quantity: 2,
      max_quantity: 3,
      ...over,
    });
    const podsMock: MockedResponse = {
      request: { query: PODS_FOR_PRODUCT, variables: { id: 'p2' } },
      result: {
        data: {
          podsForProduct: [
            {
              pod_id: 'pod-9',
              pod_title: 'Pod Nine',
              club_slug: 'club',
              product_name: 'Apple',
              unit_cost: 30,
              available_count: 4,
              free_delivery_above: null,
              image_url: '',
            },
          ],
        },
      },
    };

    beforeEach(() => localStorage.clear());
    afterEach(() => localStorage.clear());

    it('shows what the cart already holds, without announcing it as just added', async () => {
      localStorage.setItem(CART_KEY, JSON.stringify([line()]));
      renderPage();
      await screen.findByText('Banana');

      expect(screen.getByTestId('shop-product-p1-qty')).toHaveTextContent('2');
      expect(screen.getByTestId('shop-product-p1-notice')).toHaveTextContent('');
      // A product the cart does not hold keeps its lone "+".
      expect(screen.getByTestId('shop-product-p2-add')).toBeInTheDocument();
      expect(screen.queryByTestId('shop-product-p2-qty')).not.toBeInTheDocument();
    });

    it('reads the base line only — a variant of the product is not this card’s quantity', async () => {
      localStorage.setItem(CART_KEY, JSON.stringify([line({ variant_id: 'v1', variant_label: 'Ripe' })]));
      renderPage();
      await screen.findByText('Banana');
      expect(screen.getByTestId('shop-product-p1-add')).toBeInTheDocument();
    });

    it('stops the plus at the line’s stock and steps down without a pod lookup', async () => {
      localStorage.setItem(CART_KEY, JSON.stringify([line({ quantity: 3 })]));
      renderPage();
      await screen.findByText('Banana');
      expect(screen.getByTestId('shop-product-p1-inc')).toBeDisabled();

      fireEvent.click(screen.getByRole('button', { name: 'Remove one Banana' }));
      expect(screen.getByTestId('shop-product-p1-qty')).toHaveTextContent('2');
      await waitFor(() => expect(storedCart()[0].quantity).toBe(2));
    });

    it('takes the line out of the cart from the bin and says so on the card', async () => {
      localStorage.setItem(CART_KEY, JSON.stringify([line({ quantity: 1 })]));
      renderPage();
      await screen.findByText('Banana');

      fireEvent.click(screen.getByRole('button', { name: 'Remove Banana' }));
      expect(screen.getByTestId('shop-product-p1-add')).toBeInTheDocument();
      expect(screen.queryByTestId('shop-product-p1-qty')).not.toBeInTheDocument();
      expect(screen.getByTestId('shop-product-p1-notice')).toHaveTextContent('Item removed');
      await waitFor(() => expect(storedCart()).toEqual([]));
    });

    it('adds through the cheapest pod, opens the pill and says "Item added" once', async () => {
      const notices: string[] = [];
      const onNotify = (event: Event) => notices.push((event as CustomEvent<{ message: string }>).detail.message);
      globalThis.addEventListener('duncit:notify', onNotify);
      try {
        renderPage([productsMock, categoriesMock, podsMock]);
        await screen.findByText('Apple');

        fireEvent.click(screen.getByRole('button', { name: 'Add Apple' }));
        expect(await screen.findByTestId('shop-product-p2-qty')).toHaveTextContent('1');
        expect(screen.getByTestId('shop-product-p2-notice')).toHaveTextContent('Item added');
        expect(storedCart()).toEqual([expect.objectContaining({ pod_id: 'pod-9', product_id: 'p2', quantity: 1 })]);
        // The card's own notice is the only one: no app-wide toast repeats it.
        expect(notices).toEqual([]);
        expect(navigateMock).not.toHaveBeenCalled();
      } finally {
        globalThis.removeEventListener('duncit:notify', onNotify);
      }
    });
  });
});
