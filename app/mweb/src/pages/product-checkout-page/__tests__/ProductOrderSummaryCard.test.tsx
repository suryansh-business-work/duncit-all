import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
  pod_id: 'pod1',
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
      onInfo={() => {}}
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

  it('lists all lines flat with no pod titles (products and pods are separate)', () => {
    renderCard({
      lines: [
        line(),
        line({ pod_id: 'pod2', pod_title: 'Beach Bash', product_id: 'b', product_name: 'Beta Mug', quantity: 1 }),
      ],
    });
    expect(screen.getByText('Alpha Tee × 2')).toBeInTheDocument();
    expect(screen.getByText('Beta Mug × 1')).toBeInTheDocument();
    // No pod titles / sub-headers in the checkout summary.
    expect(screen.queryByText('Sunset Jam')).not.toBeInTheDocument();
    expect(screen.queryByText('Beach Bash')).not.toBeInTheDocument();
  });

  it('opens the product details from a line photo', () => {
    const onInfo = vi.fn();
    renderCard({ onInfo });
    fireEvent.click(screen.getAllByLabelText(/view .* details/i)[0]);
    expect(onInfo).toHaveBeenCalledWith('a');
  });

  it('renders the product photo as the details trigger when the line has an image', () => {
    renderCard({ lines: [line({ image_url: 'https://cdn.duncit.com/tee.jpg' })] });
    const img = screen.getByRole('img', { name: 'Alpha Tee' });
    expect(img).toHaveAttribute('src', 'https://cdn.duncit.com/tee.jpg');
  });

  it('labels a free group "Delivery" / "Free" (the server emits courier_name "")', () => {
    renderCard({
      quote: quote({
        total: 80,
        // Real free-group shape: no courier lookup happens, courier_name is ''.
        lines: [quoteLine(), quoteLine({ warehouse_id: 'w2', courier_name: '', charge: 0, quoted: true, free: true })],
      }),
    });
    expect(screen.getByText('BlueDart')).toBeInTheDocument();
    expect(screen.getByText('Delivery')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('marks a manual-fallback line as "Delivery (estimated)" and shows the estimate caption', () => {
    renderCard({
      quote: quote({
        all_quoted: false,
        // Real manual-fallback shape: ShipRocket could not price it, courier_name is ''.
        lines: [quoteLine({ courier_name: '', quoted: false, free: false, charge: 40 })],
      }),
    });
    expect(screen.getByText('Delivery (estimated)')).toBeInTheDocument();
    expect(screen.getByText(/estimated delivery/i)).toBeInTheDocument();
  });

  it('labels delivery rows by courier only — never pod-prefixed', () => {
    renderCard({
      lines: [
        line(),
        line({ pod_id: 'pod2', pod_title: 'Beach Bash', product_id: 'b', product_name: 'Beta Mug', quantity: 1 }),
      ],
      quote: quote({
        total: 80,
        // Same warehouse serving two pods — one row per (pod, warehouse) group.
        lines: [
          quoteLine(),
          quoteLine({ pod_id: 'pod2', courier_name: '', charge: 0, quoted: true, free: true }),
        ],
      }),
    });
    expect(screen.getByText('BlueDart')).toBeInTheDocument();
    expect(screen.getByText('Delivery')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
    // Pod titles never appear in the delivery labels.
    expect(screen.queryByText('Sunset Jam — BlueDart')).not.toBeInTheDocument();
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
