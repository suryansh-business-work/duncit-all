import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitForElementToBeRemoved, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import OrderSummaryCard from '../OrderSummaryCard';

const breakup = { currency: '₹', total: 1180, gst: 180, gstPct: 18, subtotal: 1000, fee: 0, feePct: 0 };

describe('OrderSummaryCard', () => {
  it('renders pod title, datetime, zone and inclusive GST breakup', () => {
    const pod = {
      pod_title: 'Sunset Yoga',
      pod_date_time: '2026-08-01T10:00:00.000Z',
      zone_name: 'North Zone',
      pod_images_and_videos: [{ url: 'http://img/a.jpg', type: 'IMAGE' }],
    };
    render(<OrderSummaryCard pod={pod} breakup={breakup} />);
    expect(screen.getByText('Sunset Yoga')).toBeInTheDocument();
    expect(screen.getByText('North Zone')).toBeInTheDocument();
    expect(screen.getByText('GST (18%)')).toBeInTheDocument();
    expect(screen.getByText('₹180.00')).toBeInTheDocument();
    expect(screen.getByText('Total payable')).toBeInTheDocument();
    // No products => ticket price equals total, so ₹1180.00 appears twice.
    expect(screen.getByText('Ticket price')).toBeInTheDocument();
    expect(screen.getAllByText('₹1180.00')).toHaveLength(2);
  });

  it('falls back to stateTitle when pod has no title, and renders a video media element', () => {
    const pod = { pod_images_and_videos: [{ url: 'http://vid/a.mp4', type: 'VIDEO' }] };
    const { container } = render(<OrderSummaryCard pod={pod} stateTitle="Fallback Pod" breakup={breakup} />);
    expect(screen.getByText('Fallback Pod')).toBeInTheDocument();
    expect(container.querySelector('video')).toBeInTheDocument();
  });

  it('uses the default "Pod booking" title and shows no datetime/zone/media when pod is empty', () => {
    const { container } = render(<OrderSummaryCard pod={null} breakup={breakup} />);
    expect(screen.getByText('Pod booking')).toBeInTheDocument();
    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(container.querySelector('video')).not.toBeInTheDocument();
    expect(screen.queryByText('North Zone')).not.toBeInTheDocument();
  });

  it('renders product add-on rows and subtracts them from the ticket price', () => {
    const pod = {
      pod_title: 'Pod X',
      product_requests: [
        { product_id: 'p1', product_name: 'T-Shirt', unit_cost: 200 },
        { product_id: 'p2', product_name: 'Cap', unit_cost: 100 },
      ],
    };
    const selectedProducts = [
      { product_id: 'p1', quantity: 2, unit_cost: 250 }, // overrides row unit_cost => 500
      { product_id: 'p2', quantity: 1 }, // uses row unit_cost => 100
      { product_id: 'p3', quantity: 5 }, // not in rowById => filtered out
      { product_id: 'p1', quantity: 0 }, // zero qty => filtered out
    ];
    render(<OrderSummaryCard pod={pod} breakup={breakup} selectedProducts={selectedProducts} />);
    expect(screen.getByText('T-Shirt x2')).toBeInTheDocument();
    expect(screen.getByText('Cap x1')).toBeInTheDocument();
    expect(screen.getByText('Product add-ons')).toBeInTheDocument();
    // productTotal = 500 + 100 = 600 ; ticket = 1180 - 600 = 580
    expect(screen.getByText('₹600.00')).toBeInTheDocument();
    expect(screen.getByText('₹580.00')).toBeInTheDocument();
    // p3/p1-zero not rendered
    expect(screen.queryByText(/x5/)).not.toBeInTheDocument();
  });

  it('shows venue charges block and opens/closes the info dialog', async () => {
    const pod = {
      pod_title: 'Pod Y',
      place_charges: [
        { label: 'Parking', amount: 50, note: 'Per car' },
        { label: 'Cleaning', amount: 30 },
      ],
    };
    render(<OrderSummaryCard pod={pod} breakup={breakup} />);
    expect(screen.getByText('Venue Charges')).toBeInTheDocument();
    expect(screen.getByText('₹80.00')).toBeInTheDocument(); // venue total 50+30

    fireEvent.click(screen.getByRole('button', { name: 'About venue charges' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Parking')).toBeInTheDocument();
    expect(within(dialog).getByText('Per car')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
  });

  it('renders no venue charges block when place_charges is empty', () => {
    render(<OrderSummaryCard pod={{ pod_title: 'Pod Z', place_charges: [] }} breakup={breakup} />);
    expect(screen.queryByText('Venue Charges')).not.toBeInTheDocument();
  });
});
