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
  },
];

const quoted: ProductShippingQuote = {
  total: 80,
  currency_symbol: '₹',
  all_quoted: true,
  lines: [],
};

function render(over: Partial<ComponentProps<typeof ProductOrderSummary>> = {}) {
  return renderWithProviders(
    <ProductOrderSummary
      podTitle="Sunset Jam"
      lines={lines}
      breakup={breakup}
      subtotal={320}
      quote={null}
      shippingLoading={false}
      pincodeValid={false}
      {...over}
    />,
  );
}

describe('ProductOrderSummary', () => {
  it('lists the products (with variant labels) plus the inclusive breakup', () => {
    render();
    expect(screen.getByTestId('product-order-summary')).toBeOnTheScreen();
    expect(screen.getByText('Alpha Tee × 2')).toBeOnTheScreen();
    expect(screen.getByText('Alpha Tee — L / Blue × 1')).toBeOnTheScreen();
    expect(screen.getByText('Subtotal')).toBeOnTheScreen();
    expect(screen.getByText('₹320.00')).toBeOnTheScreen();
    expect(screen.getByText('GST (18%)')).toBeOnTheScreen();
    expect(screen.getByText('₹130.00')).toBeOnTheScreen();
  });

  it('prompts for a pincode until a valid one is entered', () => {
    render({ pincodeValid: false });
    expect(screen.getByText('Enter pincode')).toBeOnTheScreen();
  });

  it('shows a calculating label while quoting with no quote yet', () => {
    render({ pincodeValid: true, shippingLoading: true, quote: null });
    expect(screen.getByText('Calculating…')).toBeOnTheScreen();
  });

  it('shows the live delivery charge with no estimate note when fully quoted', () => {
    render({ pincodeValid: true, quote: quoted });
    expect(screen.getByText('₹80.00')).toBeOnTheScreen();
    expect(screen.queryByTestId('product-shipping-estimated')).toBeNull();
  });

  it('flags an estimated delivery when not every warehouse was quoted live', () => {
    render({ pincodeValid: true, shippingLoading: true, quote: { ...quoted, all_quoted: false } });
    // A present quote wins over the loading state (else branch).
    expect(screen.getByText('₹80.00')).toBeOnTheScreen();
    expect(screen.getByTestId('product-shipping-estimated')).toBeOnTheScreen();
  });

  it('falls back to a zero delivery charge for a valid pincode with no quote', () => {
    render({ pincodeValid: true, quote: null });
    // Subtotal ₹320.00 and delivery ₹0.00 both render.
    expect(screen.getByText('₹0.00')).toBeOnTheScreen();
  });
});
