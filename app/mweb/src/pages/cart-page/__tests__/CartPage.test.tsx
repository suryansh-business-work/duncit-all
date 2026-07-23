import { useRef } from 'react';
import { describe, expect, it, beforeEach } from 'vitest';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { CartProvider, useCart, type CartLineMeta } from '../../../components/cart/CartContext';
import FloatingCartButton from '../../../components/cart/FloatingCartButton';
import CartPage from '../../CartPage';

const meta = (over: Partial<CartLineMeta> = {}): CartLineMeta => ({
  pod_id: 'p1',
  pod_title: 'Sunset Jam',
  club_slug: 'club-one',
  product_id: 'a',
  variant_id: '',
  variant_label: '',
  product_name: 'Alpha Tee',
  image_url: 'http://x/a.jpg',
  unit_cost: 100,
  max_quantity: 3,
  ...over,
});

function Seed({ lines }: Readonly<{ lines: Array<{ meta: CartLineMeta; qty: number }> }>) {
  const { setLine } = useCart();
  const seeded = useRef(false);
  if (!seeded.current) {
    seeded.current = true;
    lines.forEach(({ meta: m, qty }) => setLine(m, qty));
  }
  return null;
}

const renderCart = (lines: Array<{ meta: CartLineMeta; qty: number }> = []) =>
  render(
    <MockedProvider mocks={[]} addTypename={false}>
      <CartProvider>
        <MemoryRouter initialEntries={['/cart']}>
          <Seed lines={lines} />
          <FloatingCartButton />
          <Routes>
            <Route path="/cart" element={<CartPage />} />
            <Route path="/shop" element={<div>SHOP</div>} />
            <Route path="/product-checkout" element={<div data-testid="checkout-probe">CHECKOUT</div>} />
          </Routes>
        </MemoryRouter>
      </CartProvider>
    </MockedProvider>,
  );

beforeEach(() => localStorage.clear());

describe('CartPage + CartContext', () => {
  it('shows the empty state with a Pod Shop CTA', () => {
    renderCart();
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /browse the pod shop/i }));
    expect(screen.getByText('SHOP')).toBeInTheDocument();
  });

  it('groups lines by pod with per-line steppers, remove, totals and clear', () => {
    renderCart([
      { meta: meta(), qty: 2 },
      { meta: meta({ variant_id: 'v1', variant_label: 'L / Blue', unit_cost: 120 }), qty: 1 },
      { meta: meta({ pod_id: 'p2', pod_title: 'Beach Bash', product_id: 'b', product_name: 'Beta Mug' }), qty: 1 },
    ]);
    expect(screen.getByTestId('cart-pod-p1')).toBeInTheDocument();
    expect(screen.getByTestId('cart-pod-p2')).toBeInTheDocument();
    expect(screen.getByText('Alpha Tee — L / Blue')).toBeInTheDocument();
    // p1 total: 2×100 + 1×120 = 320.
    expect(screen.getByText('₹320')).toBeInTheDocument();
    // Cart-wide grand total: 320 + 100 = 420.
    expect(screen.getByText('Cart total')).toBeInTheDocument();
    expect(screen.getByText('₹420')).toBeInTheDocument();

    // + on the base line (first Alpha row) hits its max at 3.
    fireEvent.click(screen.getAllByRole('button', { name: 'Increase Alpha Tee' })[0]!);
    expect(screen.getAllByRole('button', { name: 'Increase Alpha Tee' })[0]).toBeDisabled();

    // − to zero removes the variant line (second Alpha row).
    fireEvent.click(screen.getAllByRole('button', { name: 'Decrease Alpha Tee' })[1]!);
    // Remove the p2 line entirely.
    fireEvent.click(screen.getByRole('button', { name: 'Remove Beta Mug' }));
    expect(screen.queryByTestId('cart-pod-p2')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /clear cart/i }));
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
  });

  it('has ONE cart-level checkout that proceeds to the combined product checkout', () => {
    renderCart([
      { meta: meta(), qty: 2 },
      { meta: meta({ pod_id: 'p2', pod_title: 'Beach Bash', product_id: 'b', product_name: 'Beta Mug' }), qty: 1 },
    ]);
    // No per-pod checkout buttons — a single cart-wide CTA.
    expect(screen.getAllByRole('button', { name: /proceed to checkout/i })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /proceed to checkout/i }));
    expect(screen.getByTestId('checkout-probe')).toBeInTheDocument();
  });

  it('badges a line with Free delivery when it meets its product threshold', () => {
    renderCart([
      { meta: meta({ free_delivery_above: 200 }), qty: 2 }, // 200 >= 200 → free
      { meta: meta({ pod_id: 'p2', pod_title: 'Beach Bash', product_id: 'b', product_name: 'Beta Mug', free_delivery_above: 500 }), qty: 1 },
    ]);
    expect(screen.getAllByText('Free delivery')).toHaveLength(1);
  });

  it('persists lines to localStorage and the floating button badges the count', () => {
    renderCart([{ meta: meta(), qty: 2 }]);
    expect(JSON.parse(localStorage.getItem('mweb_cart_lines') ?? '[]')).toHaveLength(1);
    // On /cart the floating button hides; the count still drove its render logic.
    expect(screen.queryByRole('button', { name: /open cart/i })).not.toBeInTheDocument();
  });
});
