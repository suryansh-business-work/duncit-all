import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CartLine } from '../../../components/cart/CartContext';
import type { ProductShippingQuote, ProductShippingQuoteLine } from '../../checkout-page/queries';
import ProductOrderSummaryCard from '../ProductOrderSummaryCard';

const breakup = { currency: '₹', total: 280, gst: 43, gstPct: 18, subtotal: 237, fee: 0, feePct: 0 };

const line = (over: Partial<CartLine> = {}): CartLine => ({
  pod_id: 'pod1',
  pod_title: 'Sunset Jam',
  club_slug: 'club-one',
  product_id: 'a',
  variant_id: '',
  variant_label: '',
  product_name: 'Alpha Tee',
  image_url: '',
  unit_cost: 100,
  quantity: 2,
  max_quantity: 5,
  ...over,
});

const quoteLine = (over: Partial<ProductShippingQuoteLine> = {}): ProductShippingQuoteLine => ({
  warehouse_id: 'w1',
  pickup_pincode: '560001',
  courier_name: 'BlueDart',
  charge: 80,
  quoted: true,
  free: false,
  ...over,
});

const quote = (over: Partial<ProductShippingQuote> = {}): ProductShippingQuote => ({
  total: 80,
  currency_symbol: '₹',
  all_quoted: true,
  lines: [quoteLine()],
  ...over,
});

const renderCard = (props: Partial<React.ComponentProps<typeof ProductOrderSummaryCard>> = {}) =>
  render(
    <ProductOrderSummaryCard
      lines={[line(), line({ variant_id: 'v1', variant_label: 'L / Blue', unit_cost: 120, quantity: 1 })]}
      breakup={breakup}
      subtotal={320}
      quote={quote()}
      shippingLoading={false}
      pincodeValid
      {...props}
    />,
  );

describe('ProductOrderSummaryCard', () => {
  it('renders product lines, subtotal, per-warehouse delivery and the inclusive GST + total', () => {
    renderCard();
    expect(screen.getByText('Your order')).toBeInTheDocument();
    expect(screen.getByText('Alpha Tee × 2')).toBeInTheDocument();
    expect(screen.getByText('Alpha Tee — L / Blue × 1')).toBeInTheDocument();
    expect(screen.getByText('Subtotal')).toBeInTheDocument();
    expect(screen.getByText('₹320.00')).toBeInTheDocument();
    // One row per warehouse group + the delivery total.
    expect(screen.getByText('BlueDart')).toBeInTheDocument();
    expect(screen.getByText('Delivery total')).toBeInTheDocument();
    expect(screen.getAllByText('₹80.00')).toHaveLength(2);
    expect(screen.getByText('GST (18%)')).toBeInTheDocument();
    expect(screen.getByText('Total payable')).toBeInTheDocument();
    expect(screen.getByText('₹280.00')).toBeInTheDocument();
    // No pod ticket line ever.
    expect(screen.queryByText(/Ticket/)).not.toBeInTheDocument();
  });

  it('groups line items under pod sub-headers', () => {
    renderCard({
      lines: [
        line(),
        line({ pod_id: 'pod2', pod_title: 'Beach Bash', product_id: 'b', product_name: 'Beta Mug', quantity: 1 }),
      ],
    });
    expect(screen.getByText('Sunset Jam')).toBeInTheDocument();
    expect(screen.getByText('Beach Bash')).toBeInTheDocument();
    expect(screen.getByText('Alpha Tee × 2')).toBeInTheDocument();
    expect(screen.getByText('Beta Mug × 1')).toBeInTheDocument();
  });

  it('shows "Free" for a free warehouse group and the charge for the rest', () => {
    renderCard({
      quote: quote({
        total: 80,
        lines: [quoteLine(), quoteLine({ warehouse_id: 'w2', courier_name: 'Delhivery', charge: 0, free: true })],
      }),
    });
    expect(screen.getByText('BlueDart')).toBeInTheDocument();
    expect(screen.getByText('Delhivery')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('marks a manual-fallback line as estimated and shows the estimate caption', () => {
    renderCard({
      quote: quote({
        all_quoted: false,
        lines: [quoteLine({ courier_name: 'Standard delivery', quoted: false, charge: 40 })],
      }),
    });
    expect(screen.getByText('Standard delivery (estimated)')).toBeInTheDocument();
    expect(screen.getByText(/estimated delivery/i)).toBeInTheDocument();
  });

  it('badges a line with Free delivery when it meets its product threshold', () => {
    renderCard({
      lines: [
        line({ free_delivery_above: 200 }), // 2 × 100 = 200 ≥ 200 → badge
        line({ variant_id: 'v1', unit_cost: 120, quantity: 1, free_delivery_above: 500 }), // below → no badge
      ],
    });
    expect(screen.getAllByText('Free delivery')).toHaveLength(1);
  });

  it('prompts for a pincode before one is entered', () => {
    renderCard({ pincodeValid: false, quote: null });
    expect(screen.getByText('Enter pincode')).toBeInTheDocument();
  });

  it('shows a calculating label while the quote is loading', () => {
    renderCard({ shippingLoading: true, quote: null });
    expect(screen.getByText('Calculating…')).toBeInTheDocument();
  });
});
