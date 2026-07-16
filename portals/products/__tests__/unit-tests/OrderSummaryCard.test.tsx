import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import OrderSummaryCard from '../../src/pages/orders/OrderSummaryCard';
import { renderWithProviders } from '../testkit';

const baseOrder = {
  buyer_name: 'Asha',
  buyer_email: 'asha@x.com',
  buyer_phone: '9999',
  currency_symbol: '₹',
  payment_ref: 'PAY-1',
  pod: { pod_title: 'Sunset' },
  items_total: 400,
  shipping_charge: 40,
  total: 440,
  shipping_address: {
    line1: '12 MG Rd',
    line2: '',
    city: 'Pune',
    state: 'MH',
    pincode: '411001',
    country: 'India',
  },
  line_items: [
    { product_id: 'p1', name: 'Mug', sku: 'MG-1', ownership: 'DUNCIT', qty: 2, unit_cost: 100, gross: 200, image_url: '' },
    { product_id: 'p2', name: '', sku: 'BR-1', ownership: 'BRAND', qty: 1, unit_cost: 240, gross: 240, image_url: 'x.jpg' },
  ],
};

describe('OrderSummaryCard', () => {
  it('renders buyer, contact with phone, address and line items', () => {
    renderWithProviders(<OrderSummaryCard order={baseOrder} podDateTime="1 Jan" />);
    expect(screen.getByText('Asha')).toBeInTheDocument();
    expect(screen.getByText(/asha@x.com · 9999/)).toBeInTheDocument();
    expect(screen.getByText('12 MG Rd, Pune, MH, 411001, India')).toBeInTheDocument();
    expect(screen.getByText('Mug')).toBeInTheDocument();
    expect(screen.getByText('Total: ₹440')).toBeInTheDocument();
    expect(screen.getByText('1 Jan')).toBeInTheDocument();
  });

  it('handles a pickup order with no address, no phone and no pod', () => {
    renderWithProviders(
      <OrderSummaryCard
        order={{
          ...baseOrder,
          buyer_phone: '',
          payment_ref: '',
          pod: null,
          shipping_address: null,
        }}
      />,
    );
    expect(screen.getByText('Pickup order — no shipping address')).toBeInTheDocument();
    // Contact with no phone suffix.
    expect(screen.getByText('asha@x.com')).toBeInTheDocument();
    // Pod + pod date fall back to a dash.
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
});
