import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MockedProvider } from '@apollo/client/testing/react';
import { PUBLIC_FEATURE_FLAGS } from '@duncit/app-settings';
import HeaderCartButton from '../HeaderCartButton';
import { CartProvider, type CartLine } from '../CartContext';

const STORAGE_KEY = 'mweb_cart_lines';

const makeLine = (overrides: Partial<CartLine> = {}): CartLine => ({
  pod_id: 'pod-1',
  pod_title: 'Pod One',
  club_slug: 'club-one',
  product_id: 'prod-1',
  variant_id: 'var-1',
  variant_label: 'Small',
  product_name: 'Widget',
  image_url: 'https://example.com/img.png',
  unit_cost: 100,
  quantity: 2,
  max_quantity: 10,
  ...overrides,
});

function seedCart(lines: CartLine[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
}

function LocationProbe() {
  const { pathname } = useLocation();
  return <div data-testid="pathname">{pathname}</div>;
}

/** The button rides on the product system flag — off, and there is no cart. */
const flagsMock = (enabled: boolean) => ({
  request: { query: PUBLIC_FEATURE_FLAGS },
  result: { data: { publicFeatureFlags: [{ key: 'is_product_visible', enabled }] } },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

function renderAt(initialPath: string, productsVisible = true) {
  return render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[flagsMock(productsVisible)]}>
      <MemoryRouter initialEntries={[initialPath]}>
        <CartProvider>
          <Routes>
            <Route path="*" element={<HeaderCartButton />} />
          </Routes>
          <LocationProbe />
        </CartProvider>
      </MemoryRouter>
    </MockedProvider>,
  );
}

describe('HeaderCartButton', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it('renders nothing when the cart is empty', () => {
    renderAt('/home');
    expect(screen.queryByRole('button', { name: /open cart/i })).not.toBeInTheDocument();
  });

  it('renders nothing on the /cart page even with items', () => {
    seedCart([makeLine()]);
    renderAt('/cart');
    expect(screen.queryByRole('button', { name: /open cart/i })).not.toBeInTheDocument();
  });

  it('renders nothing on any /checkout path even with items', () => {
    seedCart([makeLine()]);
    renderAt('/checkout/pod-1');
    expect(screen.queryByRole('button', { name: /open cart/i })).not.toBeInTheDocument();
  });

  it('renders nothing on the combined product checkout either', () => {
    seedCart([makeLine()]);
    renderAt('/product-checkout');
    expect(screen.queryByRole('button', { name: /open cart/i })).not.toBeInTheDocument();
  });

  it('renders nothing at all once products are switched off', async () => {
    seedCart([makeLine({ quantity: 2 })]);
    renderAt('/home', false);
    // Given a tick to settle, so this is the answered flag and not the pending one.
    expect(await screen.findByTestId('pathname')).toHaveTextContent('/home');
    expect(screen.queryByRole('button', { name: /open cart/i })).not.toBeInTheDocument();
  });

  it('renders the button with the aggregated item count and badge when populated', async () => {
    seedCart([makeLine({ quantity: 2 }), makeLine({ product_id: 'prod-2', quantity: 3 })]);
    renderAt('/home');
    const button = await screen.findByRole('button', { name: 'Open cart (5 items)' });
    expect(button).toBeInTheDocument();
    // Badge content reflects the total count.
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('caps the badge at 99+', async () => {
    seedCart([makeLine({ quantity: 120, max_quantity: 200 })]);
    renderAt('/home');
    expect(await screen.findByText('99+')).toBeInTheDocument();
  });

  it('now also shows on the Pod Shop, which no longer owns a cart of its own', async () => {
    seedCart([makeLine({ quantity: 1 })]);
    renderAt('/shop');
    expect(await screen.findByRole('button', { name: 'Open cart (1 items)' })).toBeInTheDocument();
  });

  it('navigates to /cart when clicked', async () => {
    seedCart([makeLine({ quantity: 1 })]);
    renderAt('/home');
    expect(screen.getByTestId('pathname')).toHaveTextContent('/home');
    fireEvent.click(await screen.findByRole('button', { name: /open cart/i }));
    expect(screen.getByTestId('pathname')).toHaveTextContent('/cart');
  });
});
