import type { ComponentProps } from 'react';
import { screen } from '@testing-library/react-native';

import { ProductOrderSummary } from '@/components/checkout/ProductOrderSummary';
import type { CartLine } from '@/stores/cart.store';
import type { ProductShippingQuote } from '@/hooks/useProductShippingQuote';
import type { CheckoutBreakup } from '@/utils/checkout-math';
import { renderWithProviders } from '@/utils/test-utils';

const breakup: CheckoutBreakup = {
  subtotal: 100,
  fee: 10,
  gst: 20,
  total: 130,
  currency: '₹',
  feePct: 10,
  gstPct: 18,
};

const lines: CartLine[] = [
  {
    pod_id: 'p1',
    pod_title: 'Sunset Jam',
    club_slug: 'c1',
    product_id: 'a',
    variant_id: '',
    variant_label: '',
    product_name: 'Alpha Tee',
    image_url: '',
    unit_cost: 100,
    quantity: 2,
    max_quantity: 5,
    // 2×100 ≥ 150 → the badge shows.
    free_delivery_above: 150,
  },
  {
    pod_id: 'p1',
    pod_title: 'Sunset Jam',
    club_slug: 'c1',
    product_id: 'a',
    variant_id: 'v1',
    variant_label: 'L / Blue',
    product_name: 'Alpha Tee',
    image_url: '',
    unit_cost: 120,
    quantity: 1,
    max_quantity: 5,
    // 1×120 < 500 → no badge.
    free_delivery_above: 500,
  },
  {
    pod_id: 'p2',
    pod_title: 'Beach Bash',
    club_slug: 'c2',
    product_id: 'b',
    variant_id: '',
    variant_label: '',
    product_name: 'Beta Mug',
    image_url: '',
    unit_cost: 80,
    quantity: 1,
    max_quantity: 3,
    // No threshold → never badges.
    free_delivery_above: null,
  },
];

// Both groups ship from the SAME warehouse but belong to different pods — the
// per-(pod, warehouse) split must render both rows (composite keys).
const quoted: ProductShippingQuote = {
  total: 60,
  currency_symbol: '₹',
  all_quoted: true,
  lines: [
    {
      pod_id: 'p1',
      warehouse_id: 'w1',
      pickup_pincode: '110001',
      courier_name: 'Delhivery',
      charge: 60,
      quoted: true,
      free: false,
    },
    {
      pod_id: 'p2',
      warehouse_id: 'w1',
      pickup_pincode: '110001',
      courier_name: 'Xpressbees',
      charge: 0,
      quoted: true,
      free: true,
    },
  ],
};

function render(over: Partial<ComponentProps<typeof ProductOrderSummary>> = {}) {
  return renderWithProviders(
    <ProductOrderSummary
      lines={lines}
      breakup={breakup}
      subtotal={400}
      quote={null}
      shippingLoading={false}
      pincodeValid={false}
      {...over}
    />,
  );
}

describe('ProductOrderSummary', () => {
  it('groups lines by pod with sub-headers and the inclusive breakup', () => {
    render();
    expect(screen.getByTestId('product-order-summary')).toBeOnTheScreen();
    expect(screen.getByTestId('summary-pod-p1')).toHaveTextContent('Sunset Jam');
    expect(screen.getByTestId('summary-pod-p2')).toHaveTextContent('Beach Bash');
    expect(screen.getByText('Alpha Tee × 2')).toBeOnTheScreen();
    expect(screen.getByText('Alpha Tee — L / Blue × 1')).toBeOnTheScreen();
    expect(screen.getByText('Beta Mug × 1')).toBeOnTheScreen();
    expect(screen.getByText('Subtotal')).toBeOnTheScreen();
    expect(screen.getByText('₹400.00')).toBeOnTheScreen();
    expect(screen.getByText('GST (18%)')).toBeOnTheScreen();
    expect(screen.getByText('₹130.00')).toBeOnTheScreen();
  });

  it('badges only the lines whose subtotal reaches their threshold', () => {
    render();
    expect(screen.getByTestId('summary-free-delivery-p1:a')).toBeOnTheScreen();
    expect(screen.queryByTestId('summary-free-delivery-p1:a::v1')).toBeNull();
    expect(screen.queryByTestId('summary-free-delivery-p2:b')).toBeNull();
  });

  it('prompts for a pincode until a valid one is entered (even with a stale quote)', () => {
    render({ pincodeValid: false, quote: quoted });
    expect(screen.getByText('Enter pincode')).toBeOnTheScreen();
    expect(screen.queryByText('Delivery total')).toBeNull();
  });

  it('shows a calculating label while quoting with no quote yet', () => {
    render({ pincodeValid: true, shippingLoading: true, quote: null });
    expect(screen.getByText('Calculating…')).toBeOnTheScreen();
  });

  it('lists one delivery row per (pod, warehouse) group, pod-prefixed across pods', () => {
    render({ pincodeValid: true, quote: quoted });
    // Both groups share warehouse w1 yet belong to different pods — the cart
    // spans 2 pods, so each row is prefixed with its pod's title. Charged group:
    // courier name + live charge (the free group adds ₹0, so the delivery total
    // repeats the same ₹60.00).
    expect(screen.getByText('Sunset Jam — Delhivery')).toBeOnTheScreen();
    expect(screen.getAllByText('₹60.00')).toHaveLength(2);
    // Free group: every line met its threshold.
    expect(screen.getByText('Beach Bash — Xpressbees')).toBeOnTheScreen();
    expect(screen.getByText('Free')).toBeOnTheScreen();
    expect(screen.getByText('Delivery total')).toBeOnTheScreen();
    expect(screen.queryByTestId('product-shipping-estimated')).toBeNull();
  });

  it('keeps delivery labels unprefixed when the cart spans a single pod', () => {
    render({
      lines: lines.filter((cartLine) => cartLine.pod_id === 'p1'),
      pincodeValid: true,
      quote: { ...quoted, lines: quoted.lines.slice(0, 1) },
    });
    expect(screen.getByText('Delhivery')).toBeOnTheScreen();
    expect(screen.queryByText('Sunset Jam — Delhivery')).toBeNull();
  });

  it('marks manual-fallback groups as estimated with the courier fallback label', () => {
    const fallback: ProductShippingQuote = {
      total: 30,
      currency_symbol: '₹',
      all_quoted: false,
      lines: [
        {
          pod_id: null,
          warehouse_id: 'w3',
          pickup_pincode: '560001',
          courier_name: '',
          charge: 30,
          quoted: false,
          free: false,
        },
      ],
    };
    render({ pincodeValid: true, shippingLoading: true, quote: fallback });
    // A present quote wins over the loading state; the empty courier name falls
    // back to a generic "Delivery" label marked as estimated — and a null pod id
    // never gains a pod prefix even though the cart spans 2 pods. The single
    // manual group is the whole delivery total, so ₹30.00 renders twice.
    expect(screen.getByText('Delivery (estimated)')).toBeOnTheScreen();
    expect(screen.getAllByText('₹30.00')).toHaveLength(2);
    expect(screen.getByTestId('product-shipping-estimated')).toBeOnTheScreen();
  });

  it('falls back to a zero delivery charge for a valid pincode with no quote', () => {
    render({ pincodeValid: true, quote: null });
    expect(screen.getByText('₹0.00')).toBeOnTheScreen();
  });
});
