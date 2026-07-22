import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PodProductOrderItem from '../PodProductOrderItem';
import type { ProductOrder } from '../productOrders';

function makeOrder(overrides: Partial<ProductOrder> = {}): ProductOrder {
  return {
    id: 'o1',
    order_no: 'ORD-1001',
    fulfilment_method: 'SHIP',
    fulfilment_status: 'SHIPPED',
    currency_symbol: '₹',
    items_total: 500,
    total: 550,
    pickup_ref: '',
    pickup_location_id: '',
    created_at: '2026-01-01T00:00:00.000Z',
    line_items: [
      {
        product_id: 'p1',
        variant_id: 'v1',
        variant_label: 'Large',
        name: 'Cool Tee',
        image_url: 'https://img.example/tee.png',
        qty: 2,
        unit_cost: 250,
        gross: 500,
      },
    ],
    shipping_address: { name: 'Buyer', line1: 'Street', city: 'City', state: 'ST', pincode: '000000' },
    shiprocket: { awb: 'AWB123', courier_name: 'Delhivery', tracking_status: 'IN_TRANSIT', label_url: '' },
    tracking_events: [],
    ...overrides,
  };
}

describe('PodProductOrderItem', () => {
  it('renders a SHIP order with AWB, courier and an enabled Track button', () => {
    render(<PodProductOrderItem order={makeOrder()} />);

    expect(screen.getByText('Ship to me')).toBeInTheDocument();
    // "Shipped" appears both as the status chip and the current timeline step
    expect(screen.getAllByText('Shipped').length).toBeGreaterThan(0);
    expect(screen.getByText('#ORD-1001')).toBeInTheDocument();
    // Line item with variant label, qty and formatted money
    expect(screen.getByText(/Cool Tee/)).toBeInTheDocument();
    expect(screen.getByText(/Large/)).toBeInTheDocument();
    expect(screen.getByText('₹500')).toBeInTheDocument();
    // AWB + courier line
    expect(screen.getByText(/AWB123/)).toBeInTheDocument();
    expect(screen.getByText(/Delhivery/)).toBeInTheDocument();

    const track = screen.getByRole('link', { name: /Track shipment/i });
    expect(track).toHaveAttribute('href', 'https://shiprocket.co/tracking/AWB123');
    expect(track).toHaveAttribute('target', '_blank');
  });

  it('renders the timeline steps for the ship ladder', () => {
    render(<PodProductOrderItem order={makeOrder()} />);
    // Timeline labels for the SHIP ladder
    expect(screen.getByText('Preparing shipment')).toBeInTheDocument();
    expect(screen.getByText('Out for delivery')).toBeInTheDocument();
    expect(screen.getByText('Delivered')).toBeInTheDocument();
  });

  it('disables the Track button and omits the AWB line when no AWB', () => {
    render(
      <PodProductOrderItem
        order={makeOrder({
          shiprocket: { awb: '', courier_name: '', tracking_status: '', label_url: '' },
        })}
      />,
    );
    const track = screen.getByRole('button', { name: /Track shipment/i });
    // Rendered as an <a> so MUI marks it disabled via the class + no href
    expect(track).toHaveClass('Mui-disabled');
    expect(track).not.toHaveAttribute('href');
    expect(screen.queryByText(/AWB/)).not.toBeInTheDocument();
  });

  it('shows AWB without courier when courier_name is empty', () => {
    render(
      <PodProductOrderItem
        order={makeOrder({
          shiprocket: { awb: 'AWBONLY', courier_name: '', tracking_status: '', label_url: '' },
        })}
      />,
    );
    expect(screen.getByText(/AWBONLY/)).toBeInTheDocument();
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });

  it('renders a PICKUP order with pickup code and location', () => {
    render(
      <PodProductOrderItem
        order={makeOrder({
          fulfilment_method: 'PICKUP',
          fulfilment_status: 'READY_FOR_PICKUP',
          pickup_ref: 'PICK-9',
          pickup_location_id: 'LOC-1',
        })}
      />,
    );
    expect(screen.getByText('Pick up at venue')).toBeInTheDocument();
    expect(screen.getAllByText('Ready for pickup').length).toBeGreaterThan(0);
    expect(screen.getByText(/PICK-9/)).toBeInTheDocument();
    expect(screen.getByText(/LOC-1/)).toBeInTheDocument();
    // No track shipment button on pickup orders
    expect(screen.queryByText(/Track shipment/i)).not.toBeInTheDocument();
  });

  it('falls back to an em dash when pickup_ref is empty and hides location', () => {
    render(
      <PodProductOrderItem
        order={makeOrder({
          fulfilment_method: 'PICKUP',
          fulfilment_status: 'PENDING',
          pickup_ref: '',
          pickup_location_id: '',
        })}
      />,
    );
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders a line item without a variant label', () => {
    render(
      <PodProductOrderItem
        order={makeOrder({
          line_items: [
            {
              product_id: 'p2',
              variant_id: '',
              variant_label: '',
              name: 'Basic Item',
              image_url: '',
              qty: 1,
              unit_cost: 100,
              gross: 100,
            },
          ],
        })}
      />,
    );
    expect(screen.getByText(/Basic Item/)).toBeInTheDocument();
    expect(screen.getByText('₹100')).toBeInTheDocument();
  });
});
