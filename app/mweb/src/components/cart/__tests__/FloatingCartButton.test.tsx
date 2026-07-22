import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import FloatingCartButton from '../FloatingCartButton';
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

function renderAt(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <CartProvider>
        <Routes>
          <Route path="*" element={<FloatingCartButton />} />
        </Routes>
        <LocationProbe />
      </CartProvider>
    </MemoryRouter>,
  );
}

describe('FloatingCartButton', () => {
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

  it('renders the fab with the aggregated item count and badge when populated', () => {
    seedCart([makeLine({ quantity: 2 }), makeLine({ product_id: 'prod-2', quantity: 3 })]);
    renderAt('/home');
    const button = screen.getByRole('button', { name: 'Open cart (5 items)' });
    expect(button).toBeInTheDocument();
    // Badge content reflects the total count.
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('navigates to /cart when clicked', () => {
    seedCart([makeLine({ quantity: 1 })]);
    renderAt('/home');
    expect(screen.getByTestId('pathname')).toHaveTextContent('/home');
    fireEvent.click(screen.getByRole('button', { name: /open cart/i }));
    expect(screen.getByTestId('pathname')).toHaveTextContent('/cart');
  });
});
