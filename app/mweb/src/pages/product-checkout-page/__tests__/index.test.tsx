import '@testing-library/jest-dom/vitest';
import { useRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// lottie-react → lottie-web touches canvas getContext at import time (unavailable
// in jsdom); the confetti/success screens pull it in. Stub it out.
vi.mock('lottie-react', () => ({ default: () => null }));
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProductCheckoutPage from '../index';
import { CartProvider, useCart, type CartLineMeta } from '../../../components/cart/CartContext';
import {
  AVAILABLE_COUPONS,
  CHECKOUT_ME,
  DUMMY_PRODUCT_CHECKOUT,
  PREVIEW_COUPON,
  PRODUCT_SHIPPING_QUOTE,
  PUBLIC_FINANCE,
} from '../../checkout-page/queries';

const meta = (over: Partial<CartLineMeta> = {}): CartLineMeta => ({
  pod_id: 'POD1',
  pod_title: 'Sunset Jam',
  club_slug: 'club-one',
  product_id: 'a',
  variant_id: '',
  variant_label: '',
  product_name: 'Alpha Tee',
  image_url: '',
  unit_cost: 100,
  max_quantity: 5,
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

const financeMock = (over: Record<string, unknown> = {}): MockedResponse => ({
  request: { query: PUBLIC_FINANCE },
  result: {
    data: {
      publicFinanceSettings: {
        platform_fee_pct: 10,
        gst_pct: 18,
        currency_symbol: '₹',
        dummy_mode: true,
        razorpay_enabled: false,
        ...over,
      },
    },
  },
});

const meMock = (): MockedResponse => ({
  request: { query: CHECKOUT_ME },
  result: {
    data: {
      me: {
        user_id: 'u1',
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
        phone_number: '9876543210',
        phone_extension: '+91',
        address: {
          line1: '221B Baker Street',
          line2: '',
          landmark: '',
          city: 'London',
          state: 'LDN',
          pincode: '123456',
          country: 'India',
        },
      },
    },
  },
});

// The combined checkout is cart-wide — coupons are the GLOBAL set (pod_id null).
const couponsMock = (): MockedResponse => ({
  request: { query: AVAILABLE_COUPONS, variables: { pod_id: null } },
  result: { data: { availableCouponsForPod: [] } },
});

// Real server line shapes: one line per (pod, warehouse) group; free groups
// carry courier_name '' (no rate lookup ever ran).
const shippingMock = (): MockedResponse => ({
  request: { query: PRODUCT_SHIPPING_QUOTE },
  variableMatcher: () => true,
  result: {
    data: {
      productShippingQuote: {
        total: 80,
        currency_symbol: '₹',
        all_quoted: true,
        lines: [
          { pod_id: 'POD1', warehouse_id: 'w1', pickup_pincode: '560001', courier_name: 'BlueDart', charge: 80, quoted: true, free: false },
          { pod_id: 'POD2', warehouse_id: 'w2', pickup_pincode: '110001', courier_name: '', charge: 0, quoted: true, free: true },
        ],
      },
    },
  },
});

// Strict variables: the preview MUST be requested against the PRODUCT subtotal
// (250), never subtotal + shipping — the server discounts the subtotal only.
const couponPreviewMock = (): MockedResponse => ({
  request: {
    query: PREVIEW_COUPON,
    variables: { input: { code: 'SAVE10', pod_id: null, amount: 250 } },
  },
  result: {
    data: {
      previewCoupon: {
        ok: true,
        message: null,
        code: 'SAVE10',
        discount_pct: 10,
        original_total: 250,
        discount_amount: 25,
        final_total: 225,
        currency_symbol: '₹',
      },
    },
  },
});

const dummyMock = (): MockedResponse => ({
  request: { query: DUMMY_PRODUCT_CHECKOUT },
  variableMatcher: () => true,
  result: {
    data: {
      dummyProductCheckout: {
        id: 'pay1',
        payment_id: 'PAY-9',
        invoice_no: 'INV-9',
        total: 280,
        currency_symbol: '₹',
        status: 'SUCCESS',
        paid_at: '2026-08-01T10:05:00.000Z',
        created_at: '2026-08-01T10:05:00.000Z',
      },
    },
  },
});

function renderPage(mocks: MockedResponse[], lines: Array<{ meta: CartLineMeta; qty: number }> = []) {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <CartProvider>
        <MemoryRouter initialEntries={['/product-checkout']}>
          <Seed lines={lines} />
          <Routes>
            <Route path="/" element={<div>HOME</div>} />
            <Route path="/cart" element={<div>CART</div>} />
            <Route path="/orders" element={<div>ORDERS</div>} />
            <Route path="/product-checkout" element={<ProductCheckoutPage />} />
          </Routes>
        </MemoryRouter>
      </CartProvider>
    </MockedProvider>,
  );
}

beforeEach(() => localStorage.clear());

describe('ProductCheckoutPage', () => {
  it('shows the empty state when the cart has no lines', async () => {
    renderPage([financeMock(), meMock(), couponsMock()]);
    expect(await screen.findByText('Nothing to checkout')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /back to cart/i }));
    expect(screen.getByText('CART')).toBeInTheDocument();
  });

  it('renders ALL cart lines across pods with per-warehouse delivery rows and ONE Pay', async () => {
    renderPage(
      [financeMock(), meMock(), couponsMock(), shippingMock()],
      [
        { meta: meta(), qty: 2 },
        { meta: meta({ pod_id: 'POD2', pod_title: 'Beach Bash', product_id: 'b', product_name: 'Beta Mug', unit_cost: 50 }), qty: 1 },
      ],
    );
    expect(await screen.findByText('Complete your order')).toBeInTheDocument();
    expect(screen.getByText('Payment details')).toBeInTheDocument();
    // Lines from BOTH pods, grouped under pod sub-headers.
    expect(screen.getByText('Sunset Jam')).toBeInTheDocument();
    expect(screen.getByText('Beach Bash')).toBeInTheDocument();
    expect(screen.getByText('Alpha Tee × 2')).toBeInTheDocument();
    expect(screen.getByText('Beta Mug × 1')).toBeInTheDocument();
    expect(screen.getByText('Dummy')).toBeInTheDocument();
    // Per-(pod, warehouse) delivery rows (pod-title prefixed — the cart spans
    // two pods; the free group falls back to the "Delivery" label) + total.
    expect(await screen.findByText('Sunset Jam — BlueDart')).toBeInTheDocument();
    expect(screen.getByText('Beach Bash — Delivery')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Delivery total')).toBeInTheDocument();
    // ONE Pay button for the whole cart.
    expect(screen.getAllByRole('button', { name: /^pay/i })).toHaveLength(1);
    // Product summary — never a pod ticket line.
    expect(screen.queryByText(/Ticket/)).not.toBeInTheDocument();
  });

  it('previews the coupon against the PRODUCT subtotal and pays discounted subtotal + shipping', async () => {
    renderPage(
      [financeMock(), meMock(), couponsMock(), shippingMock(), couponPreviewMock()],
      [
        { meta: meta(), qty: 2 }, // 200
        { meta: meta({ pod_id: 'POD2', pod_title: 'Beach Bash', product_id: 'b', product_name: 'Beta Mug', unit_cost: 50 }), qty: 1 }, // 50
      ],
    );
    await screen.findByText('Complete your order');
    // Wait for the live quote (shipping 80) so the Pay total includes delivery.
    await screen.findByText('Sunset Jam — BlueDart');
    fireEvent.change(screen.getByLabelText('Coupon code'), { target: { value: 'SAVE10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    // The strict-variables mock only matches amount=250 (the product subtotal).
    expect(await screen.findByText('SAVE10 applied')).toBeInTheDocument();
    // Pay = discounted subtotal (225) + shipping (80) — never final_total alone.
    expect(screen.getByRole('button', { name: /^pay/i })).toHaveTextContent('Pay ₹305.00');
  });

  it('completes a dummy payment, clears the WHOLE cart, then routes to order history', async () => {
    renderPage(
      [financeMock(), meMock(), couponsMock(), shippingMock(), dummyMock()],
      [
        { meta: meta(), qty: 2 },
        { meta: meta({ pod_id: 'POD2', pod_title: 'Beach Bash', product_id: 'b', product_name: 'Beta Mug' }), qty: 1 },
      ],
    );
    await screen.findByText('Complete your order');
    const payButton = await screen.findByRole('button', { name: /^pay/i });
    await waitFor(() => expect(payButton).not.toBeDisabled());
    fireEvent.click(payButton);
    expect(await screen.findByText('Payment Successful')).toBeInTheDocument();
    // The success screen routes the buyer to their product orders (not pod history).
    fireEvent.click(screen.getByRole('button', { name: /my orders/i }));
    expect(screen.getByText('ORDERS')).toBeInTheDocument();
    // EVERY pod's lines are cleared from the cart after the one payment.
    expect(JSON.parse(localStorage.getItem('mweb_cart_lines') ?? '[]')).toHaveLength(0);
  });
});
