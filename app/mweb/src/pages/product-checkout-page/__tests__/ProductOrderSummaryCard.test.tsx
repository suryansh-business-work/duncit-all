import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CartLine } from '../../../components/cart/CartContext';
import type { ProductShippingQuote } from '../../checkout-page/queries';
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

const quote = (over: Partial<ProductShippingQuote> = {}): ProductShippingQuote => ({
  total: 80,
  currency_symbol: '₹',
  all_quoted: true,
  lines: [],
  ...over,
});

const renderCard = (props: Partial<React.ComponentProps<typeof ProductOrderSummaryCard>> = {}) =>
  render(
    <ProductOrderSummaryCard
      podTitle="Sunset Jam"
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
  it('renders product lines, subtotal, delivery and the inclusive GST + total', () => {
    renderCard();
    expect(screen.getByText('Alpha Tee × 2')).toBeInTheDocument();
    expect(screen.getByText('Alpha Tee — L / Blue × 1')).toBeInTheDocument();
    expect(screen.getByText('Subtotal')).toBeInTheDocument();
    expect(screen.getByText('₹320.00')).toBeInTheDocument();
    expect(screen.getByText('Delivery')).toBeInTheDocument();
    expect(screen.getByText('₹80.00')).toBeInTheDocument();
    expect(screen.getByText('GST (18%)')).toBeInTheDocument();
    expect(screen.getByText('Total payable')).toBeInTheDocument();
    expect(screen.getByText('₹280.00')).toBeInTheDocument();
    // No pod ticket line ever.
    expect(screen.queryByText(/Ticket/)).not.toBeInTheDocument();
  });

  it('prompts for a pincode before one is entered', () => {
    renderCard({ pincodeValid: false, quote: null });
    expect(screen.getByText('Enter pincode')).toBeInTheDocument();
  });

  it('shows a calculating label while the quote is loading', () => {
    renderCard({ shippingLoading: true, quote: null });
    expect(screen.getByText('Calculating…')).toBeInTheDocument();
  });

  it('flags an estimated delivery when not every warehouse is priced live', () => {
    renderCard({ quote: quote({ all_quoted: false }) });
    expect(screen.getByText(/estimated delivery/i)).toBeInTheDocument();
  });
});
